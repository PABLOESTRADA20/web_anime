import { corsHeaders } from '../_shared/cors.ts'
import webpush from 'npm:web-push'

const ANILIST_API = 'https://graphql.anilist.co'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const APP_URL = Deno.env.get('APP_URL') || 'https://anime-app-e8p.pages.dev'

webpush.setVapidDetails(`mailto:support@${new URL(APP_URL).hostname}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

async function restGet(table: string, params: URLSearchParams) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) throw new Error(`DB error ${res.status}`)
  return res.json()
}

async function restDelete(table: string, params: URLSearchParams) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) throw new Error(`DB delete error ${res.status}`)
}

interface AiringSchedule {
  airingAt: number
  episode: number
  mediaId: number
  media: { title: { romaji?: string; english?: string }; coverImage?: { large?: string } }
}

async function checkNewEpisodes(): Promise<AiringSchedule[]> {
  const now = Math.floor(Date.now() / 1000)
  const weekAgo = now - 86400 * 7

  const query = `
    query {
      Page(page: 1, perPage: 50) {
        airingSchedules(
          airingAt_greater: ${weekAgo}
          airingAt_lesser: ${now}
          sort: TIME_DESC
        ) {
          airingAt
          episode
          mediaId
          media {
            id
            title { romaji english }
            coverImage { large }
          }
        }
      }
    }`

  const res = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) return []
  const json = await res.json()
  return json?.data?.Page?.airingSchedules || []
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const action = url.searchParams.get('action') || 'check'
  const secret = url.searchParams.get('secret')

  const CRON_SECRET = Deno.env.get('NOTIFICATION_CRON_SECRET') || ''
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (action === 'check') {
    const schedules = await checkNewEpisodes()
    const pending: { animeId: number; title: string; episode: number; watchers: number }[] = []

    for (const sched of schedules) {
      const animeId = sched.mediaId
      const title = sched.media?.title?.romaji || sched.media?.title?.english || 'Anime'
      const epNum = sched.episode

      const params = new URLSearchParams()
      params.set('anilist_id', `eq.${animeId}`)
      params.set('status', `eq.watching`)
      params.set('select', 'user_id')

      const watchers = await restGet('anime_lists', params) as { user_id: string }[]
      if (watchers.length > 0) {
        pending.push({ animeId, title, episode: epNum, watchers: watchers.length })
      }
    }

    return new Response(JSON.stringify({ checked: schedules.length, pending }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (action === 'send') {
    const schedules = await checkNewEpisodes()
    const results: { animeId: number; title: string; episode: number; sent: number; failed: number }[] = []

    for (const sched of schedules) {
      const animeId = sched.mediaId
      const title = sched.media?.title?.romaji || sched.media?.title?.english || 'Anime'
      const epNum = sched.episode
      const image = sched.media?.coverImage?.large || ''

      const watcherParams = new URLSearchParams()
      watcherParams.set('anilist_id', `eq.${animeId}`)
      watcherParams.set('status', `eq.watching`)
      watcherParams.set('select', 'user_id')

      const watchers = await restGet('anime_lists', watcherParams) as { user_id: string }[]
      if (watchers.length === 0) continue

      const userIds = watchers.map(w => w.user_id)
      const subPromises = userIds.map(async (uid) => {
        const p = new URLSearchParams()
        p.set('user_id', `eq.${uid}`)
        p.set('select', 'endpoint,p256dh,auth')
        return restGet('push_subscriptions', p) as Promise<{ endpoint: string; p256dh: string; auth: string }[]>
      })
      const subResults = await Promise.all(subPromises)
      const subscriptions = subResults.flat()

      if (subscriptions.length === 0) continue

      let sent = 0
      let failed = 0

      const payload = JSON.stringify({
        title: `Nuevo episodio: ${title}`,
        body: `Episodio ${epNum} ya está disponible`,
        icon: image || '/icon-192.svg',
        badge: '/icon-192.svg',
        data: { url: `${APP_URL}/watch?anilistId=${animeId}&ep=${epNum}` },
      })

      const sendPromises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          }, payload)
          sent++
        } catch (err) {
          if (err instanceof Error && (err.message.includes('410') || err.message.includes('gone'))) {
            const dp = new URLSearchParams()
            dp.set('endpoint', `eq.${sub.endpoint}`)
            await restDelete('push_subscriptions', dp).catch(() => {})
          }
          failed++
        }
      })

      await Promise.allSettled(sendPromises)
      results.push({ animeId, title, episode: epNum, sent, failed })
    }

    return new Response(JSON.stringify({ results, totalSent: results.reduce((a, r) => a + r.sent, 0) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
