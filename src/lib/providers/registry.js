import { getAnimeTitle as anilistGetTitle } from '../anilist.js'

import {
  getTioAnimeServers as jimovGetServers,
  findTioAnimeSlug,
  getMonosChinosServers as jimovMonosChinosServers,
  searchMonosChinos as jimovSearchMonosChinos,
  extractMonosChinosSlug as jimovExtractSlug,
} from '../jimov.js'

export const ANIVEXA_PROVIDERS = ['allmanga', 'anikoto', 'animegg', 'anineko', 'reanime', 'anidbapp', 'animepahe']

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

export const PROVIDER_REGISTRY = [
  { name: 'tioanime', label: 'TioAnime', backend: 'jimov', group: 'latam', getWatch: tryJimovWatch },
  { name: 'monoschinos', label: 'MonosChinos', backend: 'jimov', group: 'latam', getWatch: tryMonosChinosWatch },
  ...ANIVEXA_PROVIDERS.map((p) => ({ name: p, label: p, backend: 'anivexa', group: 'anivexa' })),
  { name: 'jkanime', label: 'JKanime', backend: 'jkanime', group: 'iframe' },
]

export const PROVIDER_LABELS = {
  anikoto: 'AniKoto',
  reanime: 'Reanime',
  allmanga: 'AllManga',
  animegg: 'AnimeGG',
  anineko: 'AniNeko',
  anidbapp: 'AniDB App',
  animepahe: 'AnimePahe',
  tioanime: 'TioAnime',
  monoschinos: 'MonosChinos',
  jkanime: 'JKanime',
}

export const AUTO_FALLBACK_ORDER = ['anikoto', 'reanime', 'allmanga', 'animegg', 'anineko', 'anidbapp', 'animepahe']

export async function getWatch(anilistId, provider, epNum, audio) {
  if (audio === 'latam') {
    const latam = await tryJimovWatch(anilistId, epNum)
    if (latam) return { ...latam, audioType: 'latam' }
    const mc = await tryMonosChinosWatch(anilistId, epNum)
    if (mc) return { ...mc, audioType: 'latam' }
  }

  return null
}
