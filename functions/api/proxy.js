const BLOCKED_HOSTS = ['metadata.google.internal', '169.254.169.254', '100.100.100.200', 'localhost', '127.0.0.1', '0.0.0.0', '[::1]']

function isPrivateIP(hostname) {
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

function isValidTarget(target) {
  try {
    const parsed = new URL(target)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    const hostname = parsed.hostname.toLowerCase()
    if (BLOCKED_HOSTS.some((h) => hostname === h || hostname.endsWith('.' + h))) return false
    if (isPrivateIP(hostname)) return false
    if (parsed.port && !['80', '443', '8080', '8443'].includes(parsed.port)) return false
    return true
  } catch {
    return false
  }
}

import { checkRateLimit } from '../_utils/rate-limit.js'

export async function onRequest(context) {
  const { request } = context

  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  const rateCheck = checkRateLimit(request, { maxRequests: 60, windowMs: 60000 })
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
  const target = url.searchParams.get('url')
  const referer = url.searchParams.get('referer') || ''

  if (!target) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  if (!isValidTarget(target)) {
    return new Response(JSON.stringify({ error: 'Invalid or blocked URL' }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Accept: 'text/vtt, text/plain, */*',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  }
  if (referer) headers['Referer'] = referer

  try {
    const res = await fetch(target, { headers })

    const body = await res.text()
    const contentType = res.headers.get('content-type') || 'text/plain'

    return new Response(body, {
      status: res.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
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
