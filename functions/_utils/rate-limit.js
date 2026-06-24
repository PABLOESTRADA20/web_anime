const rateMap = new Map()

export function checkRateLimit(request, opts = {}) {
  const { maxRequests = 30, windowMs = 60000 } = opts

  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const now = Date.now()
  const entry = rateMap.get(ip)

  if (!entry || now - entry.windowStart > windowMs) {
    rateMap.set(ip, { count: 1, windowStart: now })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  entry.count++
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.windowStart + windowMs - now) / 1000) }
  }

  // Cleanup entries older than 2 minutes (every ~100 requests)
  if (rateMap.size > 100) {
    for (const [ip, entry] of rateMap) {
      if (now - entry.windowStart > 120000) rateMap.delete(ip)
    }
  }

  return { allowed: true, remaining: maxRequests - entry.count }
}
