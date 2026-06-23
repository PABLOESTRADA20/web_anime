import { getEpisodes as anivexaGetEpisodes, getWatch as anivexaGetWatch, getBestProvider, getEpisodeList, normalizeStreams, PROVIDER_PRIORITY } from './anivexa.js'
import { searchAnime as anilistSearch, browseAnime as anilistBrowse, getTopAnimeList, getAnimeInfo as anilistGetInfo, getAnimeTitle as anilistGetTitle } from './anilist.js'
import { getAnimeEpisodes as kenjitsuGetEpisodes, getAnimepaheSources, searchAnime as prvSearch, 
getTopAnime as prvTop, getAnimeInfo as prvInfo } from './providers.js'
import { getEpisodes as miruroGetEpisodes, getWatch as miruroGetWatch, MIRURO_PROVIDERS } from './miruro.js'
import { getSpanishMetadata, getSlug } from './animeflv.js'
import { getAnimeEpisodes as veranimeEpisodes } from './veranime.js'

function normalizeAnime(item) {
  if (!item) return item
  return {
    ...item,
    anilistId: item.id || item.anilistId,
    image: item.image || item.coverImage?.large || item.posterImage,
    score: item.score ?? item.averageScore ?? null,
    synopsis: item.synopsis || item.description || '',
    studio: item.studio || (item.studios?.nodes?.[0] ? { id: item.studios.nodes[0].id, name: item.studios.nodes[0].name } : null),
    relations: (item.relations?.edges || item.relations || []).map(e => {
      const node = e.node || e.mediaRecommendation || e
      return { ...node, anilistId: node.id, image: node.image || node.coverImage?.large }
    }),
    recommendations: (item.recommendations?.nodes || item.recommendations || []).map(e => {
      const r = e.mediaRecommendation || e
      return { ...r, anilistId: r.id, image: r.image || r.coverImage?.large }
    }),
    title_es: item.title_es || null,
    synopsis_es: item.synopsis_es || null,
    genres_es: item.genres_es || null,
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
    const enriched = normalizeAnime(data)
    await tryEnrichSpanish(enriched)
    return { data: enriched }
  } catch { return prvInfo(id) }
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
      } catch { /* skip */ }
    }
  }
  await Promise.all(Array.from({ length: ES_CONCURRENCY }, () => worker()))
  return list
}

async function tryAnimeflvEpisodes(anilistId) {
  try {
    const title = await anilistGetTitle(anilistId)
    if (!title) return null
    const es = await getSpanishMetadata(title)
    if (!es?.episodes?.length) return null
    return {
      providerEpisodes: es.episodes.map(ep => ({
        number: ep.number,
        title: `Episodio ${ep.number}`,
        episodeId: ep.slug,
      })),
      dubEpisodes: es.episodes.map(ep => ({
        number: ep.number,
        title: `Episodio ${ep.number}`,
        episodeId: ep.slug,
      })),
      provider: 'animeflv',
      spanishInfo: { title: es.title, synopsis: es.synopsis, genres: es.genres, cover: es.cover },
    }
  } catch { /* fall through */ }
  return null
}

export async function getAnimeEpisodes(anilistId, audio) {
  if (audio === 'latam') {
    const ae = await tryAnimeflvEpisodes(anilistId)
    if (ae) return ae

    try {
      const title = await anilistGetTitle(anilistId)
      if (title?.romaji) {
        const veranime = await veranimeEpisodes(getSlug(title.romaji))
        if (veranime?.providerEpisodes?.length) return veranime
      }
    } catch { /* fall through */ }
  }

  for (const p of MIRURO_PROVIDERS) {
    try {
      const eps = await miruroGetEpisodes(anilistId, p)
      if (eps?.sub?.length) {
        return {
          providerEpisodes: eps.sub,
          dubEpisodes: eps.dub,
          provider: `miruro-${p}`,
        }
      }
    } catch { /* try next */ }
  }

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

function isSpanishSub(s) {
  const lang = (s.language || s.lang || s.srclang || '').toLowerCase()
  const file = (s.file || '').toLowerCase()
  const label = (s.label || '').toLowerCase()
  return lang === 'es' || lang === 'spa' ||
    /spanish|español|espanol|latino|castellano/.test(label) ||
    /es\.|spanish\.|spa-|_es\./.test(file)
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
  const providers = PROVIDER_PRIORITY.filter(p => p !== 'animepahe')
  for (const p of providers) {
    try {
      const data = await anivexaGetWatch(anilistId, p, epNum, 'sub', signal)
      const { subtitles } = normalizeStreams(data)
      const es = subtitles.find(isSpanishSub)
      if (es) return [es]
    } catch { /* skip */ }
  }
  return []
}

async function tryKenjitsuAnimepahe(anilistId, epNum, audio = 'sub') {
  const epData = await kenjitsuGetEpisodes(anilistId)
  if (!epData?.providerEpisodes?.length) throw new Error('Kenjitsu: sin episodios')

  const epList = audio === 'dub' ? (epData.dubEpisodes || epData.providerEpisodes) : epData.providerEpisodes
  const episode = epList.find(e => e.number === epNum)
  if (!episode?.episodeId) throw new Error(`Kenjitsu: episodio ${epNum} no encontrado`)

  const version = audio === 'dub' ? 'dub' : 'sub'

  const [srcResult, subResult] = await Promise.allSettled([
    getAnimepaheSources(episode.episodeId, version),
    anivexaGetWatch(anilistId, 'animepahe', epNum, audio).then(d => d && normalizeStreams(d)),
  ])

  if (srcResult.status !== 'fulfilled' || !srcResult.value?.data?.sources?.length) {
    throw new Error('Kenjitsu: sin fuentes disponibles')
  }

  const srcData = srcResult.value
  const referer = srcData.headers?.Referer || 'https://kwik.cx/'
  const sources = srcData.data.sources.map(s => ({
    url: s.url,
    quality: s.quality || 'auto',
    referer,
    type: s.type || 'hls',
  }))

  let subtitles = subResult.status === 'fulfilled' && subResult.value?.subtitles?.length
    ? subResult.value.subtitles
    : []

  if (!subtitles.length || !subtitles.some(isSpanishSub)) {
    for (const p of PROVIDER_PRIORITY) {
      try {
        const data = await anivexaGetWatch(anilistId, p, epNum, audio)
        const ns = normalizeStreams(data)
        const es = ns.subtitles?.find(isSpanishSub)
        if (es) { subtitles = [es, ...ns.subtitles.filter(s => !isSpanishSub(s))]; break }
        if (!subtitles.length && ns.subtitles?.length) subtitles = ns.subtitles
      } catch { /* continue */ }
    }
  }

  return { sources, subtitles, downloads: [], audioLang: null, provider: 'animepahe', backend: 'kenjitsu', audioType: audio === 'dub' ? 'dub' : 'sub' }
}

async function tryMiruroProvider(miruroProvider, anilistId, epNum, audio = 'sub') {
  const eps = await miruroGetEpisodes(anilistId, miruroProvider)
  if (!eps) throw new Error(`${miruroProvider}: sin episodios`)

  const epList = audio === 'dub' || audio === 'latam' ? (eps.dub || eps.sub) : eps.sub
  const episode = epList.find(e => e.number === epNum)
  if (!episode?.episodeId) throw new Error(`${miruroProvider}: episodio ${epNum} no encontrado`)

  const dubAudio = audio === 'latam' ? 'dub' : audio

  const [watchResult, subResult] = await Promise.allSettled([
    miruroGetWatch(episode.episodeId),
    anivexaGetWatch(anilistId, 'animepahe', epNum, dubAudio).then(d => d && normalizeStreams(d)),
  ])

  if (watchResult.status !== 'fulfilled') throw new Error(`${miruroProvider}: sin fuentes`)

  let subtitles = subResult.status === 'fulfilled' && subResult.value?.subtitles?.length
    ? subResult.value.subtitles
    : []

  if (!subtitles.length || !subtitles.some(isSpanishSub)) {
    let allSubs = []
    for (const p of PROVIDER_PRIORITY) {
      try {
        const data = await anivexaGetWatch(anilistId, p, epNum, dubAudio)
        const ns = normalizeStreams(data)
        if (ns.subtitles?.length) {
          const esSub = ns.subtitles.find(isSpanishSub)
          if (esSub) { subtitles = [esSub, ...ns.subtitles.filter(s => !isSpanishSub(s))]; break }
          allSubs = [...allSubs, ...ns.subtitles]
          if (!subtitles.length) subtitles = allSubs
        }
      } catch { /* continue */ }
    }
  }

  const result = { sources: watchResult.value.sources, subtitles, downloads: [], audioLang: null, provider: miruroProvider, backend: 'miruro' }
  result.audioType = audio === 'latam' ? 'latam' : audio
  return result
}

async function tryVerAnimeProvider(title, epNum) {
  if (!title) throw new Error('VerAnime: sin título')
  const slug = getSlug(title)
  const episodes = await veranimeEpisodes(slug)
  const ep = episodes.providerEpisodes.find(e => e.number === epNum)
  if (!ep?.slug) throw new Error('VerAnime: episodio no encontrado')
  const res = await fetch(`/api/proxy?url=${encodeURIComponent(`https://veranime.lat/api/anime/episode/servers?slug=${ep.slug}`)}`)
  const servers = await res.json()
  const latino = servers?.find(s => s.lang?.includes('latino') || s.lang?.includes('es'))
  const server = latino || servers?.[0]
  if (!server?.id) throw new Error('VerAnime: sin servidores')
  return {
    sources: [{ url: server.id, quality: 'auto', referer: 'https://www.veranime.lat/', type: 'hls' }],
    subtitles: [], downloads: [], audioType: 'latam', provider: 'veranime', backend: 'veranime',
  }
}

export async function getWatchWithFallback(anilistId, preferredProvider, epNum, audio = 'sub') {
  const isKenjitsu = preferredProvider === 'kenjitsu'
  const isAnimeflv = preferredProvider === 'animeflv'
  const isMiruro = MIRURO_PROVIDERS.includes(preferredProvider) || preferredProvider.startsWith('miruro-')
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

  if (isAnimeflv || audio === 'latam') {
    try {
      const title = await anilistGetTitle(anilistId)
      if (title?.romaji) {
        const result = await tryVerAnimeProvider(title.romaji, epNum)
        result.provider = 'animeflv'
        result.audioType = 'latam'
        return result
      }
    } catch (e) {
      errors.push({ provider: 'veranime', backend: 'veranime', message: e.message })
    }

    for (const p of MIRURO_PROVIDERS) {
      try {
        const result = await tryMiruroProvider(p, anilistId, epNum, 'latam')
        result.provider = isAnimeflv ? 'animeflv' : p
        result.audioType = 'latam'
        return result
      } catch (e) {
        errors.push({ provider: `${isAnimeflv ? 'animeflv/' : ''}${p}`, backend: 'miruro', message: e.message })
      }
    }
    return await fallbackAnivexa(anilistId, epNum, errors, true)
  }

  if (isMiruro) {
    const p = preferredProvider.replace('miruro-', '')
    try {
      return await tryMiruroProvider(p, anilistId, epNum, audio)
    } catch (e) {
      errors.push({ provider: p, backend: 'miruro', message: e.message })
    }
  }

  {
    let miruroList = MIRURO_PROVIDERS
    if (preferredProvider && !isKenjitsu && !isMiruro) {
      miruroList = [preferredProvider, ...MIRURO_PROVIDERS.filter(p => p !== preferredProvider)]
    }
    for (const p of miruroList) {
      try {
        return await tryMiruroProvider(p, anilistId, epNum, audio)
      } catch (e) {
        errors.push({ provider: p, backend: 'miruro', message: e.message })
      }
    }
  }

  return await fallbackAnivexa(anilistId, epNum, errors, false)
}

async function fallbackAnivexa(anilistId, epNum, errors, isLatam) {
  let ordered = PROVIDER_PRIORITY
  if (isLatam) {
    ordered = ['anidbapp', 'animepahe', ...PROVIDER_PRIORITY.filter(p => p !== 'anidbapp' && p !== 'animepahe')]
  }

  const controller = new AbortController()
  const signal = controller.signal
  const dubAudio = isLatam ? 'dub' : 'sub'

  const attempts = ordered.map(async (provider) => {
    try {
      const result = await tryAnivexaProvider(provider, anilistId, epNum, dubAudio, signal)
      result.audioType = isLatam ? 'latam' : 'sub'
      controller.abort()
      return result
    } catch (e) {
      errors.push({ provider, backend: 'anivexa', message: e.message })
      throw e
    }
  })

  let result
  try {
    result = await Promise.any(attempts)
  } catch {
    result = null
  }

  if (result) {
    if (!result.subtitles.some(isSpanishSub)) {
      const esSubs = await findSpanishSubtitles(anilistId, epNum, signal)
      if (esSubs.length > 0) {
        const existing = result.subtitles.filter(s => !isSpanishSub(s))
        result.subtitles = [...esSubs, ...existing]
      }
    }
    return result
  }

  // Final fallback to Kenjitsu
  try {
    const kenjitsuResult = await tryKenjitsuAnimepahe(anilistId, epNum, isLatam ? 'dub' : 'sub')
    if (isLatam) kenjitsuResult.audioType = 'latam'
    return kenjitsuResult
  } catch (e) {
    errors.push({ provider: 'animepahe', backend: 'kenjitsu', message: e.message })
  }

  const err = new Error('No se pudo cargar video de ningún proveedor.')
  err.providerErrors = errors
  throw err
}

