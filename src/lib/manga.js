const MANGADEX_API = 'https://api.mangadex.org'
const MANGADEX_CDN = 'https://uploads.mangadex.org'

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Manga API error ${res.status}: ${res.statusText}`)
  return res.json()
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
  const mdId = await getMangaDexIdFromAnilist(anilistId)
  if (!mdId) throw new Error('No se pudo encontrar el manga en MangaDex')

  const [enFeed, esFeed] = await Promise.allSettled([
    fetchJSON(`${MANGADEX_API}/manga/${mdId}/feed?translatedLanguage[]=en&limit=500&offset=0&order[chapter]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`),
    fetchJSON(`${MANGADEX_API}/manga/${mdId}/feed?translatedLanguage[]=es&limit=500&offset=0&order[chapter]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`),
  ])

  const chapters = []
  for (const result of [enFeed, esFeed]) {
    if (result.status !== 'fulfilled') continue
    for (const ch of (result.value?.data || [])) {
      if (!ch.attributes.chapter) continue
      chapters.push({
        chapterId: ch.id,
        chapterNumber: parseFloat(ch.attributes.chapter),
        title: ch.attributes.title || '',
        language: ch.attributes.translatedLanguage || 'en',
        pages: 0,
      })
    }
  }

  // Deduplicate by chapter number, prefer Spanish
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
    `${MANGADEX_API}/chapter?limit=${limit}&order[readableAt]=desc&translatedLanguage[]=en&translatedLanguage[]=es&includes[]=manga&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`
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


