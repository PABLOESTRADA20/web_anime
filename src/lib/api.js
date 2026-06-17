import { getEpisodes as anivexaGetEpisodes, getWatch as anivexaGetWatch, getBestProvider, getEpisodeList } from './anivexa.js'
import { searchAnime as anilistSearch, browseAnime as anilistBrowse, getTopAnimeList, getAnimeInfo as anilistGetInfo } from './anilist.js'
import { getAnimeEpisodes as kenjitsuGetEpisodes, getEpisodeServers, getAnimepaheSources, searchAnime as prvSearch, getTopAnime as prvTop, getAnimeInfo as prvInfo } from './providers.js'

function normalizeAnime(item) {
  if (!item) return item
  return {
    ...item,
    anilistId: item.id || item.anilistId,
    image: item.image || item.coverImage?.large || item.posterImage,
    score: item.score ?? item.averageScore ?? null,
    synopsis: item.synopsis || item.description || '',
    studio: item.studio || item.studios?.nodes?.[0]?.name || null,
    relations: (item.relations?.edges || item.relations || []).map(e => {
      const node = e.node || e.mediaRecommendation || e
      return { ...node, anilistId: node.id, image: node.image || node.coverImage?.large }
    }),
    recommendations: (item.recommendations?.nodes || item.recommendations || []).map(e => {
      const r = e.mediaRecommendation || e
      return { ...r, anilistId: r.id, image: r.image || r.coverImage?.large }
    }),
  }
}

function normalizeList(items) {
  return (items || []).map(normalizeAnime)
}

export async function searchAnime(query, page = 1, filters = {}) {
  try {
    const res = query
      ? await anilistSearch(query, page, 20, filters)
      : await anilistBrowse(page, 24, filters)
    return { data: normalizeList(res.data), hasNextPage: res.hasNextPage }
  } catch {
    const res = await prvSearch(query || 'popular', page)
    return { data: normalizeList(res.data), hasNextPage: res?.hasNextPage }
  }
}

export async function getTopAnime(category = 'trending', page = 1) {
  try {
    const res = await getTopAnimeList(category, page)
    return { data: normalizeList(res.data), hasNextPage: res.hasNextPage }
  } catch {
    const res = await prvTop(category, page)
    return { data: normalizeList(res.data), hasNextPage: res?.hasNextPage }
  }
}

export async function getAnimeInfo(id) {
  try {
    const data = await anilistGetInfo(id)
    return { data: normalizeAnime(data) }
  } catch { return prvInfo(id) }
}

export async function getAnimeEpisodes(anilistId) {
  let anivexaData = null
  try {
    anivexaData = await anivexaGetEpisodes(anilistId)
  } catch { /* fall through */ }

  if (anivexaData) {
    const provider = getBestProvider(anivexaData)
    if (provider) {
      const sub = getEpisodeList(anivexaData, provider, 'sub')
      const dub = getEpisodeList(anivexaData, provider, 'dub')
      if (sub.length > 0) {
        return { providerEpisodes: sub, dubEpisodes: dub, provider }
      }
    }
  }

  try {
    const kenjitsu = await kenjitsuGetEpisodes(anilistId)
    if (kenjitsu?.providerEpisodes?.length) return kenjitsu
  } catch { /* no fallback */ }

  return { providerEpisodes: [], dubEpisodes: [], provider: null }
}

export async function getWatchUrl(anilistId, provider, epNum, audio = 'sub') {
  const data = await anivexaGetWatch(anilistId, provider, epNum, audio)
  return data
}

export { getEpisodeServers, getAnimepaheSources }
