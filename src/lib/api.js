import { getEpisodes as anivexaGetEpisodes, getWatch as anivexaGetWatch, getBestProvider, getEpisodeList, normalizeStreams, detectSpanishAudio, PROVIDER_PRIORITY } from './anivexa.js'
import { searchAnime as anilistSearch, browseAnime as anilistBrowse, getTopAnimeList, getAnimeInfo as anilistGetInfo } from './anilist.js'
import { getAnimeEpisodes as kenjitsuGetEpisodes, getAnimepaheSources, searchAnime as prvSearch, getTopAnime as prvTop, getAnimeInfo as prvInfo } from './providers.js'
import { isConsumetConfigured, CONSUMET_PROVIDERS, getConsumetWatch } from './consumet.js'

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

export async function searchAnime(query, page = 1, filters = {}, signal) {
  try {
    const res = query
      ? await anilistSearch(query, page, 20, filters, signal)
      : await anilistBrowse(page, 24, filters)
    return { data: normalizeList(res.data), hasNextPage: res.hasNextPage }
  } catch (e) {
    if (e.name === 'AbortError') throw e
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

async function tryAnivexaProvider(provider, anilistId, epNum, audio, signal) {
  const data = await anivexaGetWatch(anilistId, provider, epNum, audio, signal)
  const { sources, subtitles, audioLang } = normalizeStreams(data)
  if (sources.length > 0) {
    return { sources, subtitles, audioLang, provider, backend: 'anivexa' }
  }
  throw new Error(`${provider}: sin fuentes disponibles`)
}

async function tryConsumetProvider(provider, anilistId, epNum, signal) {
  const { sources, subtitles } = await getConsumetWatch(anilistId, epNum, provider, signal)
  if (sources?.length > 0) {
    const audioLang = detectSpanishAudio({ subtitles }) ? 'es' : null
    return { sources, subtitles: subtitles || [], audioLang, provider, backend: 'consumet' }
  }
  throw new Error(`${provider}: sin fuentes disponibles`)
}

async function tryKenjitsuAnimepahe(anilistId, epNum, audio = 'sub') {
  const epData = await kenjitsuGetEpisodes(anilistId)
  if (!epData?.providerEpisodes?.length) throw new Error('Kenjitsu: sin episodios')

  const epList = audio === 'dub' ? (epData.dubEpisodes || epData.providerEpisodes) : epData.providerEpisodes
  const episode = epList.find(e => e.number === epNum)
  if (!episode?.episodeId) throw new Error(`Kenjitsu: episodio ${epNum} no encontrado`)

  const version = audio === 'dub' ? 'dub' : 'sub'
  const srcData = await getAnimepaheSources(episode.episodeId, version)
  if (!srcData?.data?.sources?.length) throw new Error('Kenjitsu: sin fuentes disponibles')

  const referer = srcData.headers?.Referer || 'https://kwik.cx/'
  const sources = srcData.data.sources.map(s => ({
    url: s.url,
    quality: s.quality || 'auto',
    referer,
    type: s.type || 'hls',
  }))

  return { sources, subtitles: [], downloads: [], audioLang: null, provider: 'animepahe', backend: 'kenjitsu' }
}

export async function getWatchWithFallback(anilistId, preferredProvider, epNum, audio = 'sub') {
  const isConsumet = CONSUMET_PROVIDERS.includes(preferredProvider)
  const isKenjitsu = preferredProvider === 'kenjitsu'
  const errors = []

  if (isKenjitsu) {
    try {
      return await tryKenjitsuAnimepahe(anilistId, epNum, audio)
    } catch (e) {
      errors.push({ provider: 'animepahe', backend: 'kenjitsu', message: e.message })
      const err = new Error('No se pudo cargar video de ningún proveedor.')
      err.providerErrors = errors
      throw err
    }
  }

  if (!isConsumet) {
    let ordered = PROVIDER_PRIORITY
    if (audio === 'latam') {
      ordered = ['anidbapp', 'animepahe', ...PROVIDER_PRIORITY.filter(p => p !== 'anidbapp' && p !== 'animepahe')]
    } else {
      const startIdx = PROVIDER_PRIORITY.indexOf(preferredProvider)
      if (startIdx >= 0) {
        ordered = [...PROVIDER_PRIORITY.slice(startIdx), ...PROVIDER_PRIORITY.slice(0, startIdx)]
      }
    }

    const controller = new AbortController()
    const signal = controller.signal
    const dubAudio = audio === 'latam' ? 'dub' : audio

    const attempts = ordered.map(async (provider) => {
      try {
        const result = await tryAnivexaProvider(provider, anilistId, epNum, dubAudio, signal)
        if (audio === 'latam') {
          result.audioType = result.audioLang === 'es' ? 'latam' : 'dub'
        } else {
          result.audioType = audio
        }
        controller.abort()
        return result
      } catch (e) {
        errors.push({ provider, backend: 'anivexa', message: e.message })
        throw e
      }
    })

    try {
      return await Promise.any(attempts)
    } catch {
      // all anivexa providers failed, continue to consumet
    }
  }

  if (isConsumetConfigured()) {
    const controller = new AbortController()
    const signal = controller.signal

    const attempts = CONSUMET_PROVIDERS.map(async (provider) => {
      try {
        const result = await tryConsumetProvider(provider, anilistId, epNum, signal)
        if (audio === 'latam') {
          result.audioType = result.audioLang === 'es' ? 'latam' : 'dub'
        } else {
          result.audioType = audio
        }
        controller.abort()
        return result
      } catch (e) {
        errors.push({ provider, backend: 'consumet', message: e.message })
        throw e
      }
    })

    try {
      return await Promise.any(attempts)
    } catch {
      // all consumet providers failed
    }
  }

  try {
    return await tryKenjitsuAnimepahe(anilistId, epNum, audio)
  } catch (e) {
    errors.push({ provider: 'animepahe', backend: 'kenjitsu', message: e.message })
  }

  const err = new Error('No se pudo cargar video de ningún proveedor.')
  err.providerErrors = errors
  throw err
}

export { getAnimepaheSources }
