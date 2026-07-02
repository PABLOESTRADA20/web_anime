import { getCached, setCache } from './cache.js'

const MANGADEX_API = '/api/mangadex'
const MANGADEX_CDN = 'https://uploads.mangadex.org'
const RATE_LIMIT_MS = 250
let lastRequestTime = 0
const mdIdCache = new Map()

async function rateLimit() {
  const now = Date.now()
  const wait = Math.max(0, RATE_LIMIT_MS - (now - lastRequestTime))
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastRequestTime = Date.now()
}

async function fetchJSON(url, cacheKey) {
  if (cacheKey) {
    const cached = getCached(cacheKey, 'mangadex')
    if (cached) return cached
  }

  await rateLimit()
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Manga API error ${res.status}: ${res.statusText}`)
  const json = await res.json()

  if (cacheKey) setCache(cacheKey, json, 'mangadex')
  return json
}

function getTitles(anilistData) {
  const titles = []
  if (anilistData?.title?.romaji) titles.push(anilistData.title.romaji)
  if (anilistData?.title?.english) titles.push(anilistData.title.english)
  if (anilistData?.title?.native) titles.push(anilistData.title.native)
  return [...new Set(titles)]
}

async function findMangaDexId(anilistId, titleVariants) {
  const cacheKey = `al:${anilistId}`
  if (mdIdCache.has(cacheKey)) return mdIdCache.get(cacheKey)

  for (const title of titleVariants) {
    if (!title) continue
    try {
      const data = await fetchJSON(
        `${MANGADEX_API}?path=${encodeURIComponent('/manga')}&title=${encodeURIComponent(title)}&limit=10&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`,
        `search:${title}`,
      )
      if (data?.data?.length) {
        const match = data.data.find((m) => m.attributes?.links?.al === String(anilistId))
        if (match) {
          mdIdCache.set(cacheKey, match.id)
          return match.id
        }
      }
    } catch {
      continue
    }
  }

  mdIdCache.set(cacheKey, null)
  return null
}

async function fetchFeed(mdId, language) {
  try {
    const data = await fetchJSON(
      `${MANGADEX_API}?path=${encodeURIComponent(`/manga/${mdId}/feed`)}&translatedLanguage[]=${language}&limit=500&offset=0&order[chapter]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`,
      `feed:${mdId}:${language}`,
    )
    return data?.data || []
  } catch {
    return []
  }
}

const GET_ANILIST_MANGA_TITLE = `
  query ($id: Int) {
    Media(id: $id, type: MANGA) {
      id
      title { romaji english native }
    }
  }`

async function fetchAnilistTitles(anilistId) {
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: GET_ANILIST_MANGA_TITLE, variables: { id: anilistId } }),
    })
    if (!res.ok) return []
    const json = await res.json()
    return getTitles(json?.data?.Media)
  } catch {
    return []
  }
}

export async function getMangaChapters(anilistId, anilistData) {
  const titles = anilistData ? getTitles(anilistData) : await fetchAnilistTitles(anilistId)
  const mdId = await findMangaDexId(anilistId, titles)
  if (!mdId) throw new Error('No se pudo encontrar el manga en MangaDex')

  const [enChaps, esChaps] = await Promise.allSettled([fetchFeed(mdId, 'en'), fetchFeed(mdId, 'es')])

  const chapters = []
  for (const result of [enChaps, esChaps]) {
    if (result.status !== 'fulfilled') continue
    for (const ch of result.value) {
      if (!ch.attributes.chapter) continue
      chapters.push({
        chapterId: ch.id,
        chapterNumber: parseFloat(ch.attributes.chapter),
        title: ch.attributes.title || '',
        language: ch.attributes.translatedLanguage || 'en',
        pages: ch.attributes.pages || 0,
        volume: ch.attributes.volume ? parseFloat(ch.attributes.volume) : null,
      })
    }
  }

  const seen = new Map()
  for (const ch of chapters) {
    const existing = seen.get(ch.chapterNumber)
    if (!existing || (ch.language === 'es' && existing.language !== 'es')) {
      seen.set(ch.chapterNumber, ch)
    }
  }

  return [...seen.values()].sort((a, b) => b.chapterNumber - a.chapterNumber)
}

export async function getMangaChapterPages(chapterId) {
  const data = await fetchJSON(`${MANGADEX_API}?path=${encodeURIComponent(`/at-home/server/${chapterId}`)}`)
  const baseUrl = data.baseUrl || MANGADEX_CDN
  const hash = data.chapter?.hash
  const pages = data.chapter?.data || []
  return pages.map((p, i) => ({
    url: `${baseUrl}/data/${hash}/${p}`,
    pageNumber: i + 1,
  }))
}

export async function getRecentChapters(limit = 20) {
  await rateLimit()
  const chapterRes = await fetch(
    `${MANGADEX_API}?path=${encodeURIComponent('/chapter')}&limit=${limit}&order[readableAt]=desc&translatedLanguage[]=en&translatedLanguage[]=es&includes[]=manga&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`,
  )
  if (!chapterRes.ok) throw new Error(`Manga API error ${chapterRes.status}`)
  const chapterData = await chapterRes.json()
  const chapters = chapterData?.data || []
  if (chapters.length === 0) return []

  const mangaIds = [...new Set(chapters.map((ch) => ch.relationships.find((r) => r.type === 'manga')?.id).filter(Boolean))]

  const mangaRes = await fetchJSON(
    `${MANGADEX_API}?path=${encodeURIComponent('/manga')}&limit=${mangaIds.length}&includes[]=cover_art&${mangaIds.map((id) => `ids[]=${id}`).join('&')}&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`,
  )

  const mangaMap = {}
  for (const m of mangaRes?.data || []) {
    const coverRel = m.relationships.find((r) => r.type === 'cover_art')
    mangaMap[m.id] = {
      title: m.attributes?.title?.en || Object.values(m.attributes?.title || {})[0] || '',
      coverUrl: coverRel?.attributes?.fileName
        ? `https://uploads.mangadex.org/covers/${m.id}/${coverRel.attributes.fileName}.256.jpg`
        : null,
      anilistId: parseInt(m.attributes?.links?.al, 10) || null,
      format:
        m.attributes?.originalLanguage === 'ja'
          ? 'Manga'
          : m.attributes?.originalLanguage === 'ko'
            ? 'Manhwa'
            : m.attributes?.originalLanguage === 'zh'
              ? 'Manhua'
              : 'Manga',
    }
  }

  return chapters
    .map((ch) => {
      const mangaRel = ch.relationships.find((r) => r.type === 'manga')
      const mangaId = mangaRel?.id
      const manga = mangaMap[mangaId] || {}
      return {
        chapterId: ch.id,
        chapterNumber: parseFloat(ch.attributes.chapter),
        chapterTitle: ch.attributes.title || '',
        mangaId,
        mangaTitle: manga.title,
        coverUrl: manga.coverUrl,
        anilistId: manga.anilistId,
        format: manga.format,
      }
    })
    .filter((ch) => ch.chapterNumber && ch.anilistId)
}
