import { getWatch as anivexaGetWatch, normalizeStreams } from '../anivexa.js'

import { getAnimeTitle as anilistGetTitle } from '../anilist.js'

import { getAnimeEpisodes as kenjitsuGetEpisodes, getAnimepaheSources } from '../providers.js'

import {
  getTioAnimeServers as jimovGetServers,
  findTioAnimeSlug,
  getMonosChinosServers as jimovMonosChinosServers,
  searchMonosChinos as jimovSearchMonosChinos,
  extractMonosChinosSlug as jimovExtractSlug,
} from '../jimov.js'

import { getEpisodes as miruroGetEpisodes, getWatch as miruroGetWatch, MIRURO_PROVIDERS } from '../miruro.js'

export const ANIVEXA_PROVIDERS = ['allmanga', 'anikoto', 'animegg', 'anineko', 'reanime', 'anidbapp', 'animepahe']

export { MIRURO_PROVIDERS }

async function tryKenjitsuWatch(anilistId, epNum, audio) {
  try {
    const epData = await kenjitsuGetEpisodes(anilistId)
    if (!epData?.providerEpisodes?.length) return null

    const epList = audio === 'dub' ? epData.dubEpisodes || epData.providerEpisodes : epData.providerEpisodes
    const episode = epList.find((e) => e.number === epNum)
    if (!episode?.episodeId) return null

    const version = audio === 'dub' ? 'dub' : 'sub'
    const srcResult = await getAnimepaheSources(episode.episodeId, version)
    if (!srcResult?.data?.sources?.length) return null

    const referer = srcResult.headers?.Referer || 'https://kwik.cx/'
    const sources = srcResult.data.sources.map((s) => ({
      url: s.url,
      quality: s.quality || 'auto',
      referer,
      type: s.type || 'hls',
    }))

    let subtitles = []
    for (const p of ANIVEXA_PROVIDERS) {
      try {
        const data = await anivexaGetWatch(anilistId, p, epNum, audio)
        const ns = normalizeStreams(data)
        subtitles = ns.subtitles || []
        if (subtitles.length) break
      } catch {
        /* continue */
      }
    }

    return { sources, subtitles, downloads: [], audioLang: null, provider: 'animepahe', backend: 'kenjitsu', audioType: audio }
  } catch {
    return null
  }
}

async function tryJimovWatch(anilistId, epNum) {
  try {
    const title = await anilistGetTitle(anilistId).catch(() => null)
    if (!title) return null

    const slug = await findTioAnimeSlug(anilistId, title)
    if (!slug) return null

    const result = await jimovGetServers(slug, epNum)
    if (!result?.sources?.length) return null

    return {
      sources: result.sources,
      subtitles: [],
      downloads: [],
      audioLang: 'es',
      provider: 'tioanime',
      backend: 'jimov',
      audioType: 'latam',
    }
  } catch {
    return null
  }
}

async function tryMonosChinosWatch(anilistId, epNum) {
  try {
    const title = await anilistGetTitle(anilistId).catch(() => null)
    if (!title?.romaji && !title?.english) return null

    const results = await jimovSearchMonosChinos(title.romaji || title.english)
    if (!results.length) return null

    const animeUrl = results[0].url
    if (!animeUrl) return null

    const animeSlug = await jimovExtractSlug(animeUrl)
    if (!animeSlug) return null

    const episodeSlug = `${animeSlug}-episodio-${epNum}`
    const result = await jimovMonosChinosServers(episodeSlug)
    if (!result?.sources?.length) return null

    return {
      sources: result.sources,
      subtitles: [],
      downloads: [],
      audioLang: 'es',
      provider: 'monoschinos',
      backend: 'jimov',
      audioType: 'latam',
    }
  } catch {
    return null
  }
}

async function tryMiruroWatch(anilistId, epNum, audio) {
  for (const subProvider of MIRURO_PROVIDERS) {
    try {
      const eps = await miruroGetEpisodes(anilistId, subProvider)
      if (!eps) continue

      const epList = audio === 'dub' ? eps.dub : eps.sub
      const ep = epList.find((e) => e.number === epNum)
      if (!ep?.episodeId) continue

      const result = await miruroGetWatch(ep.episodeId)
      if (result?.sources?.length) {
        return {
          sources: result.sources,
          subtitles: [],
          downloads: result.download ? [result.download] : [],
          audioLang: null,
          provider: `miruro-${subProvider}`,
          backend: 'miruro',
          audioType: audio,
        }
      }
    } catch {
      /* try next */
    }
  }
  return null
}

export const PROVIDER_REGISTRY = [
  { name: 'tioanime', label: 'TioAnime', backend: 'jimov', group: 'latam', getWatch: tryJimovWatch },
  { name: 'monoschinos', label: 'MonosChinos', backend: 'jimov', group: 'latam', getWatch: tryMonosChinosWatch },
  ...ANIVEXA_PROVIDERS.map((p) => ({ name: p, label: p, backend: 'anivexa', group: 'anivexa' })),
  ...MIRURO_PROVIDERS.map((p) => ({ name: `miruro-${p}`, label: p, backend: 'miruro', group: 'miruro' })),
  { name: 'kenjitsu', label: 'Animepahe', backend: 'kenjitsu', group: 'backend' },
]

export const PROVIDER_LABELS = {
  anikoto: 'AniKoto',
  reanime: 'Reanime',
  allmanga: 'AllManga',
  animegg: 'AnimeGG',
  anineko: 'AniNeko',
  anidbapp: 'AniDB App',
  animepahe: 'AnimePahe',
  kenjitsu: 'Kenjitsu',
  tioanime: 'TioAnime',
  monoschinos: 'MonosChinos',
}

export const MIRURO_LABELS = {
  kiwi: 'Kiwi',
  pewe: 'Pewe',
  moo: 'Moo',
  bee: 'Bee',
  hop: 'Hop',
  bonk: 'Bonk',
  ally: 'Ally',
}

export const AUTO_FALLBACK_ORDER = [
  'anikoto',
  'reanime',
  'allmanga',
  'animegg',
  'anineko',
  'anidbapp',
  'animepahe',
  'miruro-kiwi',
  'miruro-pewe',
  'miruro-moo',
  'miruro-bee',
  'miruro-hop',
  'miruro-bonk',
  'miruro-ally',
  'kenjitsu',
]

export async function getWatch(anilistId, provider, epNum, audio) {
  const dubAudio = audio === 'latam' ? 'dub' : audio

  if (audio === 'latam') {
    const latam = await tryJimovWatch(anilistId, epNum)
    if (latam) return { ...latam, audioType: 'latam' }
    const mc = await tryMonosChinosWatch(anilistId, epNum)
    if (mc) return { ...mc, audioType: 'latam' }
  }

  if (provider === 'kenjitsu') {
    const result = await tryKenjitsuWatch(anilistId, epNum, dubAudio)
    if (result) {
      result.audioType = audio === 'latam' ? 'latam' : audio
      return result
    }
  }

  if (provider?.startsWith('miruro-')) {
    const result = await tryMiruroWatch(anilistId, epNum, dubAudio)
    if (result) {
      result.audioType = audio === 'latam' ? 'latam' : audio
      return result
    }
  }

  return null
}
