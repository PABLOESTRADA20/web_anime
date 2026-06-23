import { isCloudflareBlock, isLikelySubtitle } from './subtitles.js'

const CLOUDFLARE_PROXY = '/api/proxy?url='

const CORS_PROXY = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cors-proxy?url=`
  : null

const PUBLIC_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?url=',
]

let proxyCache = new Map()
const PROXY_CACHE_TTL = 600000

function getCached(key) {
  const entry = proxyCache.get(key)
  if (entry && Date.now() - entry.time < PROXY_CACHE_TTL) return entry.data
  proxyCache.delete(key)
  return null
}

function setCache(key, data) {
  if (proxyCache.size > 50) {
    const oldest = [...proxyCache.entries()].sort((a, b) => a[1].time - b[1].time)[0]
    proxyCache.delete(oldest[0])
  }
  proxyCache.set(key, { data, time: Date.now() })
}

async function fetchDirect(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      mode: 'cors',
      headers: {
        'Accept': 'text/vtt, text/plain, */*',
      },
    })
    if (!res.ok) throw new Error(`Direct fetch ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchViaFullUrl(fullUrl) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(fullUrl, { signal: controller.signal })
    if (!res.ok) throw new Error(`Proxy ${res.status}`)
    const text = await res.text()
    if (isCloudflareBlock(text)) {
      throw new Error('Cloudflare block')
    }
    if (!isLikelySubtitle(text)) {
      throw new Error('Not a valid subtitle')
    }
    return text
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchViaProxy(proxyUrl, target) {
  return fetchViaFullUrl(proxyUrl + encodeURIComponent(target))
}

export async function fetchSubtitle(url, referer) {
  if (!url) return null

  const cacheKey = `${url}|${referer || ''}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const errors = []

  try {
    const text = await fetchDirect(url)
    if (text && !isCloudflareBlock(text) && isLikelySubtitle(text)) {
      setCache(cacheKey, text)
      return text
    }
  } catch (e) {
    errors.push(`direct: ${e.message}`)
  }

  const proxies = []
  const refParam = referer ? `&referer=${encodeURIComponent(referer)}` : ''

  // 1. Cloudflare proxy with referer (best chance for CDN subtitles)
  proxies.push(() => fetchViaFullUrl(CLOUDFLARE_PROXY + encodeURIComponent(url) + refParam))

  // 2. Try without referer but through Cloudflare proxy
  if (referer) {
    proxies.push(() => fetchViaFullUrl(CLOUDFLARE_PROXY + encodeURIComponent(url)))
  }

  // 3. Supabase CORS proxy
  if (CORS_PROXY) {
    proxies.push(() => fetchViaFullUrl(CORS_PROXY + encodeURIComponent(url) + refParam))
  }

  // 4. Public proxy services
  for (const proxy of PUBLIC_PROXIES) {
    proxies.push(() => fetchViaProxy(proxy, url))
  }

  for (const attempt of proxies) {
    try {
      const text = await attempt()
      if (isCloudflareBlock(text)) {
        errors.push('cloudflare block')
        continue
      }
      if (!isLikelySubtitle(text)) {
        errors.push('invalid subtitle format')
        continue
      }
      setCache(cacheKey, text)
      return text
    } catch (e) {
      errors.push(e.message)
    }
  }

  if (errors.length) {
    console.warn('[Subtitles] No se pudo obtener:', url, errors.slice(0, 3).join(' | '))
  }

  return null
}

export function clearProxyCache() {
  proxyCache.clear()
}
