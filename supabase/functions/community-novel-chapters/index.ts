import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface NovelChapterLink {
  id?: number
  novel_slug: string
  chapter_number: number
  title?: string
  url: string
  provider_name: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const authHeader = req.headers.get('Authorization') || ''
  const user = await getUser(authHeader)

  try {
    if (req.method === 'GET') return handleGet(url, user)
    if (req.method === 'POST') {
      const body = await req.json()
      return handlePost(body, user)
    }
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function getUser(authHeader: string) {
  if (!authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_SERVICE_ROLE_KEY },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.id
  } catch {
    return null
  }
}

async function restGet(table: string, params: URLSearchParams) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
  })
  if (!res.ok) throw new Error(`DB error: ${res.status}`)
  return res.json()
}

async function restPost(table: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DB error ${res.status}: ${text}`)
  }
  return res.json()
}

async function handleGet(url: URL, _user: string | null) {
  const novelSlug = url.searchParams.get('novel_slug')
  const chapterNumber = url.searchParams.get('chapter_number')

  if (!novelSlug) {
    return new Response(JSON.stringify({ error: 'Missing novel_slug' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const params = new URLSearchParams()
  params.set('novel_slug', `eq.${novelSlug}`)
  params.set('status', `eq.approved`)
  if (chapterNumber) params.set('chapter_number', `eq.${chapterNumber}`)
  params.set('order', 'votes.desc')
  params.set('limit', '50')

  const data = await restGet('community_novel_chapters', params)
  return new Response(JSON.stringify({ data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function handlePost(body: Record<string, unknown>, user: string | null) {
  const action = body.action as string

  if (action === 'submit') {
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { novel_slug, chapter_number, url, provider_name, title } = body as unknown as NovelChapterLink
    if (!novel_slug || !chapter_number || !url || !provider_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields: novel_slug, chapter_number, url, provider_name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await restPost('community_novel_chapters', {
      novel_slug,
      chapter_number,
      title: title || '',
      url,
      provider_name,
      submitted_by: user,
      status: 'pending',
    })

    return new Response(JSON.stringify({ data }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (action === 'vote') {
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const chapterId = body.chapter_id as number
    const vote = body.vote as number
    if (!chapterId || ![1, -1].includes(vote)) {
      return new Response(JSON.stringify({ error: 'Invalid vote. Need chapter_id and vote (1 or -1)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const existing = await restGet(
      'community_novel_chapter_votes',
      new URLSearchParams({
        user_id: `eq.${user}`,
        chapter_id: `eq.${chapterId}`,
        limit: '1',
      }),
    )

    if (existing?.length > 0) {
      if (existing[0].vote === vote) {
        await fetch(`${SUPABASE_URL}/rest/v1/community_novel_chapter_votes?id=eq.${existing[0].id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
          },
        })
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/community_novel_chapter_votes?id=eq.${existing[0].id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({ vote }),
        })
      }
    } else {
      await restPost('community_novel_chapter_votes', {
        user_id: user,
        chapter_id: chapterId,
        vote,
      })
    }

    const votesRes = await fetch(`${SUPABASE_URL}/rest/v1/community_novel_chapter_votes?chapter_id=eq.${chapterId}&select=vote`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    })
    const votes = await votesRes.json()
    const total = votes.reduce((sum: number, v: { vote: number }) => sum + v.vote, 0)

    await fetch(`${SUPABASE_URL}/rest/v1/community_novel_chapters?id=eq.${chapterId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ votes: total }),
    })

    return new Response(JSON.stringify({ votes: total }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
