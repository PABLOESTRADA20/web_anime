import * as Sentry from '@sentry/react'
import {
  getEpisodes as anivexaGetEpisodes,
  getWatch as anivexaGetWatch,
  getBestProvider,
  getEpisodeList,
  normalizeStreams,
  PROVIDER_PRIORITY,
} from './anivexa.js'
import {
  searchAnime as anilistSearch,
  browseAnime as anilistBrowse,
  getTopAnimeList,
  getAnimeInfo as anilistGetInfo,
  getAnimeTitle as anilistGetTitle,
} from './anilist.js'
import {
  getAnimeEpisodes as kenjitsuGetEpisodes,
  getAnimepaheSources,
  searchAnime as prvSearch,
  getTopAnime as prvTop,
  getAnimeInfo as prvInfo,
} from './providers.js'
import { getEpisodes as consumetGetEpisodes, getWatchByNumber as consumetGetWatch } from './consumet.js'
import { getSpanishMetadata } from './animeflv.js'
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
    title_es: item.title_es || null,
    synopsis_es: item.synopsis_es || null,
    genres_es: item.genres_es || null,
    externalLinks: item.externalLinks || [],
    streamingEpisodes: item.streamingEpisodes || [],
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
    const res = await prvSearch(query || 'popular', page)
    return { data: normalizeList(res.data), hasNextPage: res?.hasNextPage }
  }
}

export async function getTopAnime(category = 'trending', page = 1) {
  try {
    const res = await getTopAnimeList(category, page)
    return { data: normalizeList(res.data), hasNextPage: res.hasNextPage }
  } catch (e) {
    Sentry.captureException(e, { tags: { context: 'getTopAnime' } })
    const res = await prvTop(category, page)
    return { data: normalizeList(res.data), hasNextPage: res?.hasNextPage }
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
    return prvInfo(id)
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

const ES_CONCURRENCY = 5

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
  return list
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
      if (sub.length > 0) {
        return { providerEpisodes: sub, dubEpisodes: dub, provider }
      }
    }
  }

  try {
    const consumet = await consumetGetEpisodes(anilistId)
    if (consumet?.providerEpisodes?.length) return consumet
  } catch {
    /* fall through */
  }

  try {
    const kenjitsu = await kenjitsuGetEpisodes(anilistId)
    if (kenjitsu?.providerEpisodes?.length) return kenjitsu
  } catch {
    /* no fallback */
  }

  return { providerEpisodes: [], dubEpisodes: [], provider: null }
}

function isSpanishSub(s) {
  const lang = (s.language || s.lang || s.srclang || '').toLowerCase()
  const file = (s.file || '').toLowerCase()
  const label = (s.label || '').toLowerCase()
  return (
    lang === 'es' || lang === 'spa' || /spanish|español|espanol|latino|castellano/.test(label) || /es\.|spanish\.|spa-|_es\./.test(file)
  )
}

async function tryAnivexaProvider(provider, anilistId, epNum, audio, signal) {
  const data = await anivexaGetWatch(anilistId, provider, epNum, audio, signal)
  const { sources, subtitles, audioLang } = normalizeStreams(data)
  if (sources.length > 0) {
    return { sources, subtitles, audioLang, provider, backend: 'anivexa', audioType: audio === 'dub' ? 'dub' : 'sub' }
  }
  throw new Error(`${provider}: sin fuentes disponibles`)
}

async function findSpanishSubtitles(anilistId, epNum, signal) {
  const providers = PROVIDER_PRIORITY.filter((p) => p !== 'animepahe')
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

async function tryKenjitsuAnimepahe(anilistId, epNum, audio = 'sub') {
  const epData = await kenjitsuGetEpisodes(anilistId)
  if (!epData?.providerEpisodes?.length) throw new Error('Kenjitsu: sin episodios')

  const epList = audio === 'dub' ? epData.dubEpisodes || epData.providerEpisodes : epData.providerEpisodes
  const episode = epList.find((e) => e.number === epNum)
  if (!episode?.episodeId) throw new Error(`Kenjitsu: episodio ${epNum} no encontrado`)

  const version = audio === 'dub' ? 'dub' : 'sub'

  const [srcResult, subResult] = await Promise.allSettled([
    getAnimepaheSources(episode.episodeId, version),
    anivexaGetWatch(anilistId, 'animepahe', epNum, audio).then((d) => d && normalizeStreams(d)),
  ])

  if (srcResult.status !== 'fulfilled' || !srcResult.value?.data?.sources?.length) {
    throw new Error('Kenjitsu: sin fuentes disponibles')
  }

  const srcData = srcResult.value
  const referer = srcData.headers?.Referer || 'https://kwik.cx/'
  const sources = srcData.data.sources.map((s) => ({
    url: s.url,
    quality: s.quality || 'auto',
    referer,
    type: s.type || 'hls',
  }))

  let subtitles = subResult.status === 'fulfilled' && subResult.value?.subtitles?.length ? subResult.value.subtitles : []

  if (!subtitles.length || !subtitles.some(isSpanishSub)) {
    for (const p of PROVIDER_PRIORITY) {
      try {
        const data = await anivexaGetWatch(anilistId, p, epNum, audio)
        const ns = normalizeStreams(data)
        const es = ns.subtitles?.find(isSpanishSub)
        if (es) {
          subtitles = [es, ...ns.subtitles.filter((s) => !isSpanishSub(s))]
          break
        }
        if (!subtitles.length && ns.subtitles?.length) subtitles = ns.subtitles
      } catch {
        /* continue */
      }
    }
  }

  return {
    sources,
    subtitles,
    downloads: [],
    audioLang: null,
    provider: 'animepahe',
    backend: 'kenjitsu',
    audioType: audio === 'dub' ? 'dub' : 'sub',
  }
}

async function tryJimovTioAnime(anilistId, epNum) {
  const title = await anilistGetTitle(anilistId).catch(() => null)
  if (!title) throw new Error('Jimov: sin título')
  const slug = await findTioAnimeSlug(anilistId, title)
  if (!slug) throw new Error('Jimov: slug no encontrado')
  const result = await jimovGetServers(slug, epNum)
  if (!result?.sources?.length) throw new Error('Jimov: sin fuentes')
  return {
    ...result,
    subtitles: [],
    downloads: [],
    audioLang: 'es',
    provider: 'tioanime',
    backend: 'jimov',
    audioType: 'latam',
  }
}

async function tryJimovMonosChinos(anilistId, epNum) {
  const title = await anilistGetTitle(anilistId).catch(() => null)
  if (!title?.romaji && !title?.english) throw new Error('MonosChinos: sin título')
  const results = await jimovSearchMonosChinos(title.romaji || title.english)
  if (!results.length) throw new Error('MonosChinos: anime no encontrado')
  const animeUrl = results[0].url
  if (!animeUrl) throw new Error('MonosChinos: sin URL')
  const animeSlug = await jimovExtractSlug(animeUrl)
  if (!animeSlug) throw new Error('MonosChinos: no se pudo extraer slug')
  const episodeSlug = `${animeSlug}-episodio-${epNum}`
  const result = await jimovMonosChinosServers(episodeSlug)
  if (!result?.sources?.length) throw new Error('MonosChinos: sin fuentes')
  return {
    ...result,
    subtitles: [],
    downloads: [],
    audioLang: 'es',
    provider: 'monoschinos',
    backend: 'jimov',
    audioType: 'latam',
  }
}

export async function getWatchWithFallback(anilistId, preferredProvider, epNum, audio = 'sub') {
  const isKenjitsu = preferredProvider === 'kenjitsu'
  const errors = []

  if (isKenjitsu || audio === 'latam') {
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
  }

  const dubAudio = audio === 'latam' ? 'dub' : audio

  // Try Anivexa providers in priority order
  const controller = new AbortController()
  const signal = controller.signal

  for (const p of PROVIDER_PRIORITY) {
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

  // Try Consumet
  try {
    const consumetResult = await consumetGetWatch(anilistId, epNum, signal)
    return { ...consumetResult, audioType: audio === 'latam' ? 'latam' : audio }
  } catch (e) {
    errors.push({ provider: 'consumet', backend: 'consumet', message: e.message })
  }

  // Final fallback to Kenjitsu
  try {
    const kenjitsuResult = await tryKenjitsuAnimepahe(anilistId, epNum, dubAudio)
    if (audio === 'latam') kenjitsuResult.audioType = 'latam'
    return kenjitsuResult
  } catch (e) {
    errors.push({ provider: 'animepahe', backend: 'kenjitsu', message: e.message })
  }

  const err = new Error('No se pudo cargar video de ningún proveedor.')
  err.providerErrors = errors
  Sentry.captureException(err, {
    tags: { anilistId: String(anilistId), episode: epNum, context: 'allProvidersFailed' },
    extra: { errors: errors.map((e) => `${e.provider}: ${e.message}`) },
  })
  throw err
}
