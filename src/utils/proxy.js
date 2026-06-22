import { isCloudflareBlock, isLikelySubtitle } from './subtitles.js'

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

async function fetchViaProxy(proxyUrl, target) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const url = proxyUrl + encodeURIComponent(target)
    const res = await fetch(url, { signal: controller.signal })
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

export async function fetchSubtitle(url) {
  if (!url) return null

  const cacheKey = url
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

  if (CORS_PROXY) {
    try {
      const text = await fetchViaProxy(CORS_PROXY, url)
      setCache(cacheKey, text)
      return text
    } catch (e) {
      errors.push(`supabase: ${e.message}`)
    }
  }

  for (const proxy of PUBLIC_PROXIES) {
    try {
      const text = await fetchViaProxy(proxy, url)
      setCache(cacheKey, text)
      return text
    } catch (e) {
      errors.push(`public: ${e.message}`)
    }
  }

  if (errors.length) {
    console.warn('[Subtitles] No se pudo obtener:', url, errors.join(' | '))
  }

  return null
}

export function clearProxyCache() {
  proxyCache.clear()
}
