const CONSUMET_URL = import.meta.env.VITE_CONSUMET_URL
const MANGADEX_API = 'https://api.mangadex.org'
const MANGADEX_CDN = 'https://uploads.mangadex.org'

function consumetBase() {
  return CONSUMET_URL ? CONSUMET_URL.replace(/\/+$/, '') : null
}

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Manga API error ${res.status}: ${res.statusText}`)
  return res.json()
}

async function fetchWithTimeout(url, ms = 8000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(id)
    if (!res.ok) throw new Error(`Status ${res.status}`)
    return res.json()
  } catch (e) {
    clearTimeout(id)
    throw e
  }
}

async function getMangaDexIdFromAnilist(anilistId) {
  const data = await fetchJSON(
    `${MANGADEX_API}/manga?externalId[]=al:${anilistId}&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&limit=1`
  )
  if (data?.data?.length > 0) {
    return data.data[0].id
  }
  return null
}

export async function getMangaChapters(anilistId) {
  // Try Consumet first
  const base = consumetBase()
  if (base) {
    try {
      const data = await fetchWithTimeout(`${base}/meta/anilist/info/${anilistId}`, 10000)
      if (data?.chapters?.length > 0) {
        return data.chapters.map(ch => ({
          chapterId: ch.id,
          chapterNumber: ch.number || parseFloat(ch.chapterNumber) || 0,
          title: ch.title || '',
          pages: ch.pages || 0,
        }))
      }
    } catch {
      // fall through to MangaDex
    }
  }

  // Fallback to MangaDex
  const mdId = await getMangaDexIdFromAnilist(anilistId)
  if (!mdId) throw new Error('No se pudo encontrar el manga en MangaDex')

  const feed = await fetchJSON(
    `${MANGADEX_API}/manga/${mdId}/feed?translatedLanguage[]=en&limit=500&offset=0&order[chapter]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`
  )
  const chapters = feed?.data || []
  return chapters
    .filter(ch => ch.attributes.chapter)
    .map(ch => ({
      chapterId: ch.id,
      chapterNumber: parseFloat(ch.attributes.chapter),
      title: ch.attributes.title || '',
      pages: 0,
    }))
    .sort((a, b) => b.chapterNumber - a.chapterNumber)
}

export async function getMangaChapterPages(chapterId) {
  const data = await fetchJSON(`${MANGADEX_API}/at-home/server/${chapterId}`)
  const baseUrl = data.baseUrl || MANGADEX_CDN
  const hash = data.chapter?.hash
  const pages = data.chapter?.data || []
  return pages.map((p, i) => ({
    url: `${baseUrl}/data/${encodeURIComponent(hash)}/${encodeURIComponent(p)}`,
    pageNumber: i + 1,
  }))
}

export async function getRecentChapters(limit = 20) {
  const chapterRes = await fetchJSON(
    `${MANGADEX_API}/chapter?limit=${limit}&order[readableAt]=desc&translatedLanguage[]=en&includes[]=manga&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`
  )

  const chapters = chapterRes?.data || []
  if (chapters.length === 0) return []

  const mangaIds = [...new Set(
    chapters.map(ch => ch.relationships.find(r => r.type === 'manga')?.id).filter(Boolean)
  )]

  const mangaRes = await fetchJSON(
    `${MANGADEX_API}/manga?limit=${mangaIds.length}&includes[]=cover_art&${mangaIds.map(id => `ids[]=${id}`).join('&')}&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`
  )

  const mangaMap = {}
  for (const m of mangaRes?.data || []) {
    const coverRel = m.relationships.find(r => r.type === 'cover_art')
    mangaMap[m.id] = {
      title: m.attributes?.title?.en || Object.values(m.attributes?.title || {})[0] || '',
      coverUrl: coverRel?.attributes?.fileName
        ? `https://uploads.mangadex.org/covers/${m.id}/${coverRel.attributes.fileName}.256.jpg`
        : null,
      anilistId: parseInt(m.attributes?.links?.al, 10) || null,
      format: m.attributes?.originalLanguage === 'ja' ? 'Manga'
        : m.attributes?.originalLanguage === 'ko' ? 'Manhwa'
        : m.attributes?.originalLanguage === 'zh' ? 'Manhua' : 'Manga',
    }
  }

  return chapters
    .map(ch => {
      const mangaRel = ch.relationships.find(r => r.type === 'manga')
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
    .filter(ch => ch.chapterNumber && ch.anilistId)
}


