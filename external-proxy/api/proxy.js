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
    return true
  } catch {
    return false
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)

  if (url.pathname !== '/api/proxy') {
    res.status(404).json({ error: 'Not Found' })
    return
  }

  const target = url.searchParams.get('url')
  const referer = url.searchParams.get('referer') || ''
  const originParam = url.searchParams.get('origin') || ''

  if (!target) {
    res.status(400).json({ error: 'Missing url parameter' })
    return
  }

  if (!isValidTarget(target)) {
    res.status(403).json({ error: 'Invalid or blocked URL' })
    return
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Accept: '*/*',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  }

  if (referer) {
    headers['Referer'] = referer
    headers['Origin'] = new URL(referer).origin
  } else if (originParam) {
    headers['Origin'] = originParam
  }

  try {
    const response = await fetch(target, { headers })
    const body = await response.text()
    const contentType = response.headers.get('content-type') || 'text/plain'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.status(response.status).send(body)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}
