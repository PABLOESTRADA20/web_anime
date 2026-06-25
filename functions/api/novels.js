import { checkRateLimit } from '../_utils/rate-limit.js'

const NOVELBIN_HOST = 'https://novelbin.com'

export async function onRequest(context) {
  const { request } = context

  const rateCheck = checkRateLimit(request, { maxRequests: 30, windowMs: 60000 })
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Retry-After': String(rateCheck.retryAfter) },
    })
  }

  const url = new URL(request.url)
  const action = url.searchParams.get('action')
  const cache = caches.default

  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  async function cachedFetch(reqUrl, cacheTtl = 300) {
    const cacheKey = new Request(reqUrl, request)
    const cached = await cache.match(cacheKey)
    if (cached) {
      const resp = new Response(cached.body, cached)
      resp.headers.set('X-Cache', 'HIT')
      return resp
    }
    const res = await fetch(reqUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })
    if (res.ok && request.method === 'GET') {
      const cacheResp = new Response(res.clone().body, {
        status: res.status,
        headers: { ...Object.fromEntries(res.headers), 'Cache-Control': `public, max-age=${cacheTtl}` },
      })
      context.waitUntil(cache.put(cacheKey, cacheResp))
    }
    return res
  }

  if (action === 'search') {
    const keyword = url.searchParams.get('q')
    if (!keyword) return jsonResponse({ error: 'Se requiere parámetro q' }, 400)
    const searchUrl = `${NOVELBIN_HOST}/ajax/search-novel?keyword=${encodeURIComponent(keyword)}`
    const res = await cachedFetch(searchUrl, 60)
    const html = await res.text()
    const results = []
    const regex = /<a[^>]*href="(https:\/\/novelbin\.com\/b\/([^"]+))"[^>]*title="([^"]*)"[^>]*>/gi
    let match
    while ((match = regex.exec(html)) !== null) {
      results.push({ slug: match[2], title: match[3].trim(), url: match[1] })
    }
    return jsonResponse(results)
  }

  if (action === 'info') {
    const slug = url.searchParams.get('slug')
    if (!slug) return jsonResponse({ error: 'Se requiere parámetro slug' }, 400)

    const pageUrl = `${NOVELBIN_HOST}/b/${slug}`
    const res = await cachedFetch(pageUrl, 300)
    const html = await res.text()

    const cover = html.match(/<div class="book">[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>/i)
    const title = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    const desc = html.match(
      /<div class="desc-text[^"]*"[^>]*id="novel-description-content"[^>]*>([\s\S]*?)<\/div>\s*<button[^>]*class="btn-desc-toggle/i,
    )

    const infoSection = html.match(/<div class="col-info">([\s\S]*?)<div class="col-xs-12 col-md-4">/i)
    const infoHtml = infoSection ? infoSection[1] : html

    const genres = [...infoHtml.matchAll(/<a[^>]*href="https:\/\/novelbin\.com\/genre\/([^"]+)"[^>]*>([^<]+)<\/a>/gi)].map((g) =>
      g[2].trim(),
    )

    const authorMatch = infoHtml.match(/<span[^>]*class="info"[^>]*>Author<\/span>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)

    const statusMatch = infoHtml.match(/<span[^>]*class="info"[^>]*>Status<\/span>[\s\S]*?(Ongoing|Completed)/i)

    return jsonResponse({
      slug,
      title: title ? title[1].replace(/<[^>]+>/g, '').trim() : slug,
      cover: cover ? cover[1] : null,
      description: desc
        ? desc[1]
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .trim()
        : '',
      author: authorMatch ? authorMatch[1].trim() : '',
      status: statusMatch ? statusMatch[1] : 'Unknown',
      genres,
    })
  }

  if (action === 'chapters') {
    const slug = url.searchParams.get('slug')
    if (!slug) return jsonResponse({ error: 'Se requiere parámetro slug' }, 400)

    const archiveUrl = `${NOVELBIN_HOST}/ajax/chapter-archive?novelId=${slug}`
    const res = await cachedFetch(archiveUrl, 300)
    const html = await res.text()

    const escapedSlug = slug.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')
    const chapters = []
    const regex = new RegExp(
      `<a[^>]*href="https://novelbin\\.com/b/${escapedSlug}/chapter-(\\d+)"[^>]*title="([^"]*)"[^>]*>[\\s\\S]*?<span[^>]*class="nchr-text[^"]*"[^>]*>([\\s\\S]*?)<\\/span>`,
      'gi',
    )
    let match
    while ((match = regex.exec(html)) !== null) {
      chapters.push({
        number: parseInt(match[1], 10),
        title: match[3].trim(),
        path: `${slug}/chapter-${match[1]}`,
      })
    }

    return jsonResponse(chapters.sort((a, b) => a.number - b.number))
  }

  if (action === 'chapter-content') {
    const path = url.searchParams.get('path')
    if (!path) return jsonResponse({ error: 'Se requiere parámetro path (ej: solo-leveling/chapter-1)' }, 400)

    const chapterUrl = `${NOVELBIN_HOST}/b/${path}`
    const res = await cachedFetch(chapterUrl, 300)
    const html = await res.text()

    const title = html.match(/<h1[^>]*class="chr-title"[^>]*>([\s\S]*?)<\/h1>/i)
    const titleText = title ? title[1].replace(/<[^>]+>/g, '').trim() : ''

    const contentDiv = html.match(/<div[^>]*id="chr-content"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<\/body>)/i)
    let content = ''
    if (contentDiv) {
      content = contentDiv[1]
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<div[^>]*class="[^"]*js-ad-slot[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<ins[\s\S]*?<\/ins>/gi, '')
        .trim()
    }

    return jsonResponse({ title: titleText, content })
  }

  return jsonResponse({ error: 'Acción no válida. Usa: search, info, chapters, chapter-content' }, 400)
}
