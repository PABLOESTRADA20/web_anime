import * as Sentry from '@sentry/react'
import { isSpanishSub } from '../utils/subtitles'
import { ANIVEXA_PROVIDERS } from './providers/registry'
import {
  getEpisodes as anivexaGetEpisodes,
  getWatch as anivexaGetWatch,
  getBestProvider,
  getEpisodeList,
  normalizeStreams,
} from './anivexa.js'
import {
  searchAnime as anilistSearch,
  browseAnime as anilistBrowse,
  getTopAnimeList,
  getAnimeInfo as anilistGetInfo,
  getAnimeTitle as anilistGetTitle,
} from './anilist.js'
import { getSpanishMetadata } from './animeflv.js'
import { getWatch as jkanimeGetWatch } from './jkanime.js'
import {
  getTioAnimeEpisodes as jimovGetEpisodes,
  getTioAnimeServers as jimovGetServers,
  findTioAnimeSlug,
  getMonosChinosServers as jimovMonosChinosServers,
  searchMonosChinos as jimovSearchMonosChinos,
  extractMonosChinosSlug as jimovExtractSlug,
} from './jimov.js'

function normalizeAnime(item) {
  if (!item) return item
  return {
    ...item,
    anilistId: item.id || item.anilistId,
    image: item.image || item.coverImage?.large || item.posterImage,
    score: item.score ?? item.averageScore ?? null,
    synopsis: item.synopsis || item.description || '',
    studio: item.studio || (item.studios?.nodes?.[0] ? { id: item.studios.nodes[0].id, name: item.studios.nodes[0].name } : null),
    relations: (item.relations?.edges || item.relations || []).map((e) => {
      const node = e.node || e.mediaRecommendation || e
      return { ...node, anilistId: node.id, image: node.image || node.coverImage?.large }
    }),
    recommendations: (item.recommendations?.nodes || item.recommendations || []).map((e) => {
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
    const res = query ? await anilistSearch(query, page, 20, filters, signal) : await anilistBrowse(page, 24, filters)
    return { data: normalizeList(res.data), hasNextPage: res.hasNextPage }
  } catch (e) {
    if (e.name === 'AbortError') throw e
    Sentry.captureException(e, { tags: { context: 'searchAnime' } })
    return { data: [], hasNextPage: false }
  }
}

export async function getTopAnime(category = 'trending', page = 1) {
  try {
    const res = await getTopAnimeList(category, page)
    return { data: normalizeList(res.data), hasNextPage: res.hasNextPage }
  } catch (e) {
    Sentry.captureException(e, { tags: { context: 'getTopAnime' } })
    return { data: [], hasNextPage: false }
  }
}

export async function getAnimeInfo(id) {
  try {
    const data = await anilistGetInfo(id)
    const enriched = normalizeAnime(data)
    await tryEnrichSpanish(enriched)
    return { data: enriched }
  } catch (e) {
    Sentry.captureException(e, { tags: { context: 'getAnimeInfo', anilistId: String(id) } })
    return { data: null }
  }
}

async function tryEnrichSpanish(anime) {
  const title = anime.title?.romaji || anime.title?.english || ''
  if (!title) return
  const es = await getSpanishMetadata(title)
  if (es) {
    anime.title_es = es.title
    anime.synopsis_es = es.synopsis
    anime.genres_es = es.genres
  }
}

const ES_CONCURRENCY = 3

export async function enrichAnimeBatch(list) {
  const queue = [...list]
  async function worker() {
    while (queue.length) {
      const item = queue.shift()
      if (!item || item.title_es) continue
      const title = item.title?.romaji || item.title?.english || ''
      if (!title) continue
      try {
        const es = await getSpanishMetadata(title)
        if (es) {
          item.title_es = es.title
          item.synopsis_es = es.synopsis
          item.genres_es = es.genres
        }
      } catch {
        /* skip */
      }
    }
  }
  await Promise.all(Array.from({ length: ES_CONCURRENCY }, () => worker()))
}

async function tryAnivexaProvider(provider, anilistId, epNum, audio, signal) {
  const data = await anivexaGetWatch(anilistId, provider, epNum, audio, signal)
  if (!data) throw new Error(`${provider}: sin datos`)
  const { sources, subtitles, downloads, audioLang } = normalizeStreams(data)
  if (!sources?.length) throw new Error(`${provider}: sin fuentes`)
  return { sources, subtitles, downloads, audioLang, provider, backend: 'anivexa' }
}

async function findSpanishSubtitles(anilistId, epNum, signal) {
  const providers = ANIVEXA_PROVIDERS.filter((p) => p !== 'animepahe')
  for (const p of providers) {
    try {
      const data = await anivexaGetWatch(anilistId, p, epNum, 'sub', signal)
      const { subtitles } = normalizeStreams(data)
      const es = subtitles.find(isSpanishSub)
      if (es) return [es]
    } catch {
      /* skip */
    }
  }
  return []
}

async function tryJimovTioAnime(anilistId, epNum) {
  const title = await anilistGetTitle(anilistId)
  if (!title) throw new Error('TioAnime: no se pudo obtener título')
  const slug = await findTioAnimeSlug(anilistId, title)
  if (!slug) throw new Error('TioAnime: slug no encontrado')
  const result = await jimovGetServers(slug, epNum)
  if (!result?.sources?.length) throw new Error('TioAnime: sin fuentes')
  return {
    sources: result.sources,
    subtitles: [],
    downloads: [],
    audioLang: 'es',
    provider: 'tioanime',
    backend: 'jimov',
    audioType: 'latam',
  }
}

async function tryJimovMonosChinos(anilistId, epNum) {
  const title = await anilistGetTitle(anilistId)
  if (!title?.romaji && !title?.english) throw new Error('MonosChinos: sin título')
  const results = await jimovSearchMonosChinos(title.romaji || title.english)
  if (!results.length) throw new Error('MonosChinos: anime no encontrado')
  const animeUrl = results[0].url
  if (!animeUrl) throw new Error('MonosChinos: sin URL')
  const animeSlug = await jimovExtractSlug(animeUrl)
  if (!animeSlug) throw new Error('MonosChinos: sin slug')
  const episodeSlug = `${animeSlug}-episodio-${epNum}`
  const result = await jimovMonosChinosServers(episodeSlug)
  if (!result?.sources?.length) throw new Error('MonosChinos: sin fuentes')
  return {
    sources: result.sources,
    subtitles: [],
    downloads: [],
    audioLang: 'es',
    provider: 'monoschinos',
    backend: 'jimov',
    audioType: 'latam',
  }
}

export async function getWatchWithFallback(anilistId, preferredProvider, epNum, audio = 'sub') {
  const errors = []

  if (audio === 'latam') {
    try {
      return await tryJimovTioAnime(anilistId, epNum)
    } catch (e) {
      errors.push({ provider: 'tioanime', backend: 'jimov', message: e.message })
    }
    try {
      return await tryJimovMonosChinos(anilistId, epNum)
    } catch (e) {
      errors.push({ provider: 'monoschinos', backend: 'jimov', message: e.message })
    }
  }

  const dubAudio = audio === 'latam' ? 'dub' : audio

  const controller = new AbortController()
  const signal = controller.signal

  for (const p of ANIVEXA_PROVIDERS) {
    try {
      const result = await tryAnivexaProvider(p, anilistId, epNum, dubAudio, signal)
      result.audioType = audio === 'latam' ? 'latam' : audio
      controller.abort()

      if (!result.subtitles.some(isSpanishSub)) {
        const esSubs = await findSpanishSubtitles(anilistId, epNum, signal)
        if (esSubs.length > 0) {
          const existing = result.subtitles.filter((s) => !isSpanishSub(s))
          result.subtitles = [...esSubs, ...existing]
        }
      }
      return result
    } catch (e) {
      errors.push({ provider: p, backend: 'anivexa', message: e.message })
    }
  }

  try {
    const jk = await jkanimeGetWatch(anilistId, epNum)
    if (jk?.sources?.length) {
      jk.audioType = audio === 'latam' ? 'latam' : audio
      return jk
    }
  } catch (e) {
    errors.push({ provider: 'jkanime', backend: 'jkanime', message: e.message })
  }

  const err = new Error('No se pudo cargar video de ningún proveedor.')
  err.providerErrors = errors
  Sentry.captureException(err, {
    tags: { anilistId: String(anilistId), episode: epNum, context: 'allProvidersFailed' },
    extra: { errors: errors.map((e) => `${e.provider}: ${e.message}`) },
  })
  throw err
}

export async function getAnimeEpisodes(anilistId, audio) {
  if (audio === 'latam') {
    try {
      const title = await anilistGetTitle(anilistId)
      if (title) {
        const je = await jimovGetEpisodes(anilistId, title)
        if (je?.providerEpisodes?.length) return je
      }
    } catch {
      /* fall through */
    }
  }

  let anivexaData = null
  try {
    anivexaData = await anivexaGetEpisodes(anilistId)
  } catch {
    /* fall through */
  }

  if (anivexaData) {
    const provider = getBestProvider(anivexaData)
    if (provider) {
      const sub = getEpisodeList(anivexaData, provider, 'sub')
      const dub = getEpisodeList(anivexaData, provider, 'dub')
      if (sub.length > 0) return { providerEpisodes: sub, dubEpisodes: dub, provider }
    }
  }

  return { providerEpisodes: [], dubEpisodes: [], provider: null }
}
