import { corsHeaders } from '../_shared/cors.ts'

const ANIMEFLV_API = 'https://animeflv.ahmedrangel.com/api'
const ANIMEFLV_WWW = 'https://www3.animeflv.net'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
]

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

interface VideoServer {
  name: string
  url: string
  type: 'embed' | 'download' | 'direct'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const episodeSlug = url.searchParams.get('slug')
  const anilistId = url.searchParams.get('anilist_id')
  const episodeNumber = url.searchParams.get('episode_number')

  if (!episodeSlug && (!anilistId || !episodeNumber)) {
    return new Response(JSON.stringify({ error: 'Provide slug OR (anilist_id + episode_number)' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const results: VideoServer[] = []

  // Strategy 1: Try the upstream API
  try {
    const apiSlug = episodeSlug || `${anilistId}-${episodeNumber}`
    const res = await fetchWithTimeout(`${ANIMEFLV_API}/anime/episode/${apiSlug}`, {
      headers: { 'User-Agent': randomUA(), Accept: 'application/json' },
    })
    if (res.ok) {
      const json = await res.json()
      if (json.success && json.data?.servers?.length > 0) {
        for (const s of json.data.servers) {
          if (s.embed) {
            results.push({ name: s.name || 'Server', url: s.embed, type: 'embed' })
          }
          if (s.download) {
            results.push({ name: s.name || 'Server', url: s.download, type: 'download' })
          }
        }
      }
    }
  } catch { /* try next strategy */ }

  // Strategy 2: Try to scrape AnimeFLV directly
  if (!episodeSlug && anilistId) {
    try {
      const infoRes = await fetchWithTimeout(`${ANIMEFLV_API}/anime/${anilistId}`, {
        headers: { 'User-Agent': randomUA(), Accept: 'application/json' },
      })
      if (infoRes.ok) {
        const info = await infoRes.json()
        if (info.success) {
          for (const ep of info.data?.episodes || []) {
            if (ep.number === parseInt(episodeNumber || '0', 10)) {
              const epRes = await fetchWithTimeout(`${ANIMEFLV_API}/anime/episode/${ep.slug}`, {
                headers: { 'User-Agent': randomUA(), Accept: 'application/json' },
              })
              if (epRes.ok) {
                const epJson = await epRes.json()
                if (epJson.success && epJson.data?.servers?.length > 0) {
                  for (const s of epJson.data.servers) {
                    if (s.embed) results.push({ name: s.name || 'Server', url: s.embed, type: 'embed' })
                    if (s.download) results.push({ name: s.name || 'Server', url: s.download, type: 'download' })
                  }
                }
              }
            }
          }
        }
      }
    } catch { /* try next */ }
  }

  // Strategy 3: Try direct scrape of AnimeFLV page
  if (episodeSlug) {
    try {
      const pageUrl = `${ANIMEFLV_WWW}/ver/${episodeSlug}`
      const res = await fetchWithTimeout(pageUrl, {
        headers: {
          'User-Agent': randomUA(),
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          Referer: ANIMEFLV_WWW,
        },
      })
      if (res.ok) {
        const html = await res.text()
        // Try to extract var videos = {...}
        const videosMatch = html.match(/var\s+videos\s*=\s*(\{.*?\});/s)
        if (videosMatch) {
          try {
            const videos = JSON.parse(videosMatch[1])
            const subServers = videos.SUB || []
            for (const s of subServers) {
              if (s.code) results.push({ name: s.title || 'Server', url: s.code, type: 'embed' })
              if (s.url) results.push({ name: s.title || 'Server', url: s.url, type: 'download' })
            }
          } catch { /* json parse failed */ }
        }
        // Try to extract iframes
        const iframeRegex = /<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi
        let match
        while ((match = iframeRegex.exec(html)) !== null) {
          results.push({ name: 'Iframe', url: match[1], type: 'embed' })
        }
      }
    } catch { /* scrape failed */ }
  }

  // Strategy 4: Try Fembed API if we have a fembed URL
  const fembedUrls = results.filter(r => r.url.includes('fembed.com') || r.url.includes('fcdn.stream'))
  for (const fe of fembedUrls) {
    try {
      const apiUrl = fe.url.replace('/v/', '/api/source/').replace('/f/', '/api/source/')
      const res = await fetchWithTimeout(apiUrl, {
        method: 'POST',
        headers: { 'User-Agent': randomUA(), 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data?.length) {
          for (const video of json.data) {
            results.push({ name: `Fembed ${video.label || video.quality || ''}`, url: video.file, type: 'direct' })
          }
        }
      }
    } catch { /* fembed failed */ }
  }

  // Deduplicate
  const seen = new Set<string>()
  const unique = results.filter(r => {
    const key = r.url
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return new Response(JSON.stringify({ data: unique, count: unique.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
