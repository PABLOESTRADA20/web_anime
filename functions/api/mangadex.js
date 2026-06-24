import { checkRateLimit } from '../_utils/rate-limit.js'

export async function onRequest(context) {
  const { request } = context

  const rateCheck = checkRateLimit(request, { maxRequests: 30, windowMs: 60000 })
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Retry-After': String(rateCheck.retryAfter),
      },
    })
  }

  const url = new URL(request.url)

  // Extract the path after /api/mangadex/
  const mangaDexPath = url.pathname.replace(/^\/api\/mangadex/, '')
  const targetUrl = `https://api.mangadex.org${mangaDexPath}${url.search ? '?' + url.searchParams.toString() : ''}`

  // Cache key based on the full target URL
  const cacheKey = new Request(targetUrl, request)
  const cache = caches.default

  // Check cache first
  const cached = await cache.match(cacheKey)
  if (cached) {
    const response = new Response(cached.body, cached)
    response.headers.set('X-Cache', 'HIT')
    return response
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'AnimeVerse/1.0 (https://anime-app-e8p.pages.dev)',
        Accept: 'application/json',
      },
    })

    // Clone the response to add CORS headers and cache
    const response = new Response(res.body, res)
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.set('X-Cache', 'MISS')

    // Cache successful GET responses for 5 minutes
    if (request.method === 'GET' && res.status === 200) {
      const cacheResponse = new Response(response.clone().body, {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers),
          'Cache-Control': 'public, max-age=300',
        },
      })
      context.waitUntil(cache.put(cacheKey, cacheResponse))
    }

    return response
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}
