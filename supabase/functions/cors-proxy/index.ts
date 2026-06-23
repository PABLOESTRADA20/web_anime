import { corsHeaders } from '../_shared/cors.ts'

const BLOCKED_HOSTS = [
  'metadata.google.internal',
  '169.254.169.254',
  '100.100.100.200',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
]

function isPrivateIP(hostname: string): boolean {
  const parts = hostname.split('.').map(Number)
  if (parts.length === 4 && !parts.some(isNaN)) {
    if (parts[0] === 10) return true
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    if (parts[0] === 192 && parts[1] === 168) return true
    if (parts[0] === 127) return true
    if (parts[0] === 0) return true
    if (parts[0] === 169 && parts[1] === 254) return true
  }
  return false
}

function isValidTarget(target: string): boolean {
  try {
    const parsed = new URL(target)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    const hostname = parsed.hostname.toLowerCase()
    if (BLOCKED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h))) return false
    if (isPrivateIP(hostname)) return false
    if (parsed.port && !['80', '443', '8080', '8443'].includes(parsed.port)) return false
    return true
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const target = url.searchParams.get('url')

  if (!target) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!isValidTarget(target)) {
    return new Response(JSON.stringify({ error: 'Invalid or blocked URL' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const res = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/vtt, text/plain, */*',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    })

    if (!res.ok) {
      return new Response(await res.text(), {
        status: res.status,
        headers: {
          ...corsHeaders,
          'Content-Type': res.headers.get('content-type') || 'text/plain',
        },
      })
    }

    const text = await res.text()
    const contentType = res.headers.get('content-type') || 'text/plain'

    return new Response(text, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
