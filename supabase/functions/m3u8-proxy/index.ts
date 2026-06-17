import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const reqUrl = new URL(req.url)
  const target = reqUrl.searchParams.get('url')
  if (!target) {
    return new Response(JSON.stringify({ error: 'Missing url param' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const referer = reqUrl.searchParams.get('referer') || new URL(target).origin

  try {
    const res = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Referer': referer,
      },
    })

    const contentType = res.headers.get('Content-Type') || ''
    const isM3U8 = contentType.includes('m3u8') || contentType.includes('application/vnd.apple.mpegurl') || target.includes('.m3u8')

    if (!isM3U8) {
      return new Response(res.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    let body = await res.text()
    const baseUrl = new URL(target)
    const proxyBase = `${reqUrl.origin}${reqUrl.pathname}`
    const refSuffix = referer ? `&referer=${encodeURIComponent(referer)}` : ''

    function proxyUrl(raw) {
      const trimmed = raw.trim()
      const absolute = trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : new URL(trimmed, baseUrl).href
      return `${proxyBase}?url=${encodeURIComponent(absolute)}${refSuffix}`
    }

    const lines = body.split('\n')
    const rewritten = lines.map((line) => {
      if (line.includes('URI=') || line.includes('URI =')) {
        return line.replace(/URI\s*=\s*"([^"]*)"/g, (_, uri) => {
          const resolved = uri.startsWith('http://') || uri.startsWith('https://')
            ? uri
            : new URL(uri, baseUrl).href
          return `URI="${proxyBase}?url=${encodeURIComponent(resolved)}${refSuffix}"`
        })
      }
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        return line
      }
      if (!line.startsWith('#')) {
        const trimmed = line.trim()
        if (!trimmed) return line
        const absolute = trimmed.startsWith('http://') || trimmed.startsWith('https://')
          ? trimmed
          : new URL(trimmed, baseUrl).href
        return `${proxyBase}?url=${encodeURIComponent(absolute)}${refSuffix}`
      }
      return line
    })

    return new Response(rewritten.join('\n'), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Proxy failed', detail: e.message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
