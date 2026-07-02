const DB_KEY = 'animeverse_downloads'
const CACHE_NAME = 'animeverse-offline-v1'

function getStored() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY) || '[]')
  } catch {
    return []
  }
}

function setStored(items) {
  localStorage.setItem(DB_KEY, JSON.stringify(items))
}

export function getDownloads() {
  return getStored()
}

export function getDownload(id) {
  return getStored().find((d) => d.id === id) || null
}

export function addDownload(item) {
  const items = getStored()
  if (items.some((d) => d.id === item.id)) return false
  items.unshift({ ...item, addedAt: Date.now() })
  setStored(items)
  return true
}

export function removeDownload(id) {
  const items = getStored().filter((d) => d.id !== id)
  setStored(items)
  if ('caches' in window) {
    caches.open(CACHE_NAME).then((cache) => {
      cache.keys().then((keys) => {
        keys.filter((k) => k.url.includes(id)).forEach((k) => cache.delete(k))
      })
    })
  }
}

export async function cacheUrls(urls) {
  if (!('caches' in window)) throw new Error('Cache API no disponible')
  const cache = await caches.open(CACHE_NAME)
  const results = []
  for (const url of urls) {
    try {
      const res = await fetch(url, { mode: 'cors', cache: 'force-cache' })
      if (res.ok) {
        await cache.put(url, res.clone())
        results.push({ url, ok: true })
      } else {
        results.push({ url, ok: false, error: `HTTP ${res.status}` })
      }
    } catch (e) {
      results.push({ url, ok: false, error: e.message })
    }
  }
  return results
}

export async function getCachedUrl(url) {
  if (!('caches' in window)) return null
  const cache = await caches.open(CACHE_NAME)
  const res = await cache.match(url)
  return res || null
}

export async function isUrlCached(url) {
  const res = await getCachedUrl(url)
  return !!res
}

export function getTotalSize() {
  const items = getStored()
  return items.reduce((sum, d) => sum + (d.size || 0), 0)
}

export function formatSize(bytes) {
  if (!bytes) return '0 B'
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
}

function novelCacheKey(path) {
  return `animeverse-novel:${path}`
}

export async function cacheNovelContent(path, html) {
  if (!('caches' in window)) throw new Error('Cache API no disponible')
  const cache = await caches.open(CACHE_NAME)
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
  const res = new Response(blob, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  await cache.put(novelCacheKey(path), res)
}

export async function getCachedNovelContent(path) {
  if (!('caches' in window)) return null
  const cache = await caches.open(CACHE_NAME)
  const res = await cache.match(novelCacheKey(path))
  if (!res) return null
  return res.text()
}

export async function isNovelCached(path) {
  const html = await getCachedNovelContent(path)
  return !!html
}
