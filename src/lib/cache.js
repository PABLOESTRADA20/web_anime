const MEMO_CACHE = new Map()

const STORES = {
  anilist: { ttl: 300000, version: 1 },
  mangadex: { ttl: 120000, version: 1 },
  provider: { ttl: 30000, version: 1 },
}

export function getCached(key, store = 'anilist') {
  const config = STORES[store]
  if (!config) return null

  const memo = MEMO_CACHE.get(key)
  if (memo && Date.now() - memo.time < config.ttl) return memo.data

  try {
    const raw = localStorage.getItem(`cache:${store}:${config.version}:${key}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Date.now() - parsed.time < config.ttl) {
        MEMO_CACHE.set(key, { data: parsed.data, time: parsed.time })
        return parsed.data
      }
      localStorage.removeItem(`cache:${store}:${config.version}:${key}`)
    }
  } catch { ; }

  return null
}

export function setCache(key, data, store = 'anilist') {
  const config = STORES[store]
  if (!config) return

  const entry = { data, time: Date.now() }
  MEMO_CACHE.set(key, entry)

  try {
    localStorage.setItem(`cache:${store}:${config.version}:${key}`, JSON.stringify(entry))
  } catch {
    if (MEMO_CACHE.size > 100) {
      const oldest = [...MEMO_CACHE.entries()].sort((a, b) => a[1].time - b[1].time)[0]
      if (oldest) MEMO_CACHE.delete(oldest[0])
    }
  }
}

export function clearCache(store) {
  MEMO_CACHE.clear()
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      keys.push(localStorage.key(i))
    }
    const filtered = store
      ? keys.filter(k => k.startsWith(`cache:${store}:`))
      : keys.filter(k => k.startsWith('cache:'))
    filtered.forEach(k => localStorage.removeItem(k))
  } catch { ; }
}
