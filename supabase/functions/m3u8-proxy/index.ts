import { corsHeaders } from '../_shared/cors.ts'

const PUBLIC_PROXY_URL = Deno.env.get('PUBLIC_PROXY_URL') || 'https://szcpihgltvewnlrzydpe.supabase.co/functions/v1/m3u8-proxy'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
]

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

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
    const cookie = req.headers.get('Cookie') || ''

    const res = await fetch(target, {
      headers: {
        'User-Agent': randomUA(),
        'Referer': referer,
        'Origin': referer,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
        'Connection': 'keep-alive',
        'DNT': '1',
        ...(cookie ? { 'Cookie': cookie } : {}),
      },
      redirect: 'follow',
    })

    const contentType = res.headers.get('Content-Type') || ''
    const isM3U8 = contentType.includes('m3u8') || contentType.includes('application/vnd.apple.mpegurl') || target.includes('.m3u8')

    if (!isM3U8) {
      return new Response(res.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    let body = await res.text()
    const baseUrl = new URL(target)
    const refSuffix = referer ? `&referer=${encodeURIComponent(referer)}` : ''

    function rewriteUrl(raw) {
      const trimmed = raw.trim()
      const absolute = trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : new URL(trimmed, baseUrl).href
      return `${PUBLIC_PROXY_URL}?url=${encodeURIComponent(absolute)}${refSuffix}`
    }

    const lines = body.split('\n')
    const rewritten = lines.map((line) => {
      if (line.includes('URI=') || line.includes('URI =')) {
        return line.replace(/URI\s*=\s*"([^"]*)"/g, (_, uri) => rewriteUrl(uri))
      }
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        return line
      }
      if (!line.startsWith('#') && line.trim()) {
        return rewriteUrl(line)
      }
      return line
    })

    const setCookie = res.headers.get('Set-Cookie')
    const responseHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    }
    if (setCookie) {
      responseHeaders['Set-Cookie'] = setCookie
    }

    return new Response(rewritten.join('\n'), { headers: responseHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Proxy failed', detail: e.message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
