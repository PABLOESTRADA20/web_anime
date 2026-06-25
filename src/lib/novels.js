import { getCached, setCache } from './cache'

const API = '/api/novels'

async function fetchJSON(action, params) {
  const qs = new URLSearchParams({ action, ...params })
  const cacheKey = `${action}:${qs.toString()}`
  const cached = getCached(cacheKey, 'novels')
  if (cached) return cached
  const res = await fetch(`${API}?${qs}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Error ${res.status}`)
  }
  const data = await res.json()
  if (res.headers.get('X-Cache') !== 'HIT') setCache(cacheKey, data, 'novels', 300)
  return data
}

export async function searchNovels(query) {
  return fetchJSON('search', { q: query })
}

export async function getNovelInfo(slug) {
  return fetchJSON('info', { slug })
}

export async function getNovelChapters(slug) {
  return fetchJSON('chapters', { slug })
}

export async function getChapterContent(path) {
  return fetchJSON('chapter-content', { path })
}
