interface CacheEntry {
  data: unknown
  time: number
}

interface StoreConfig {
  ttl: number
  version: number
}

const MEMO_CACHE = new Map<string, CacheEntry>()

const STORES: Record<string, StoreConfig> = {
  anilist: { ttl: 300000, version: 1 },
  mangadex: { ttl: 120000, version: 1 },
  provider: { ttl: 30000, version: 1 },
}

function memoKey(key: string, store: string): string {
  return `${store}:${key}`
}

export function getCached(key: string, store = 'anilist'): unknown {
  const config = STORES[store]
  if (!config) return null

  const mk = memoKey(key, store)
  const memo = MEMO_CACHE.get(mk)
  if (memo && Date.now() - memo.time < config.ttl) return memo.data

  try {
    const raw = localStorage.getItem(`cache:${store}:${config.version}:${key}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Date.now() - parsed.time < config.ttl) {
        MEMO_CACHE.set(mk, { data: parsed.data, time: parsed.time })
        return parsed.data
      }
      localStorage.removeItem(`cache:${store}:${config.version}:${key}`)
    }
  } catch {
    /* localStorage no disponible */
  }

  return null
}

export function setCache(key: string, data: unknown, store = 'anilist'): void {
  const config = STORES[store]
  if (!config) return

  const entry: CacheEntry = { data, time: Date.now() }
  const mk = memoKey(key, store)
  MEMO_CACHE.set(mk, entry)

  try {
    localStorage.setItem(`cache:${store}:${config.version}:${key}`, JSON.stringify(entry))
  } catch {
    if (MEMO_CACHE.size > 100) {
      const oldest = [...MEMO_CACHE.entries()].sort((a, b) => a[1].time - b[1].time)[0]
      if (oldest) MEMO_CACHE.delete(oldest[0])
    }
  }
}

export function clearCache(store?: string): void {
  MEMO_CACHE.clear()
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) keys.push(k)
    }
    const filtered = store ? keys.filter((k) => k.startsWith(`cache:${store}:`)) : keys.filter((k) => k.startsWith('cache:'))
    filtered.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* localStorage no disponible */
  }
}
