import { getSlug as animeflvSlug } from './animeflv.js'

const JIMOV_URL = import.meta.env.VITE_JIMOV_URL || 'https://jimov-api.vercel.app'
const FETCH_TIMEOUT = 10000

const slugCache = new Map()

function jimovFetch(path) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  return fetch(`${JIMOV_URL}${path}`, { signal: controller.signal })
    .then((res) => {
      clearTimeout(timer)
      if (!res.ok) return null
      return res.json()
    })
    .catch(() => null)
}

function extractSlug(url) {
  if (!url) return null
  const parts = url.split('/')
  return parts[parts.length - 1] || null
}

function detectSourceType(url) {
  if (!url) return 'direct'
  if (url.includes('.m3u8')) return 'hls'
  if (url.match(/\.(mp4|webm|mkv|avi|mov)(\?|$)/i)) return 'direct'
  if (/streamsb|embedsb|streamtape|voe\.sx|filemoon|vgfplay|ok\.ru|yourupload|mega\.nz|mp4upload/i.test(url)) return 'iframe'
  return 'direct'
}

export async function searchTioAnime(query) {
  const data = await jimovFetch(`/anime/tioanime/filter?title=${encodeURIComponent(query)}`)
  if (!data?.results?.length) return []
  return data.results.map((r) => ({
    name: r.name,
    slug: extractSlug(r.url),
    image: r.image,
  }))
}

export async function searchMonosChinos(query) {
  const data = await jimovFetch(`/anime/monoschinos/filter?title=${encodeURIComponent(query)}`)
  if (!data?.results?.length) return []
  return data.results.map((r) => ({
    name: r.name,
    url: r.url,
    image: r.image,
  }))
}

export async function findTioAnimeSlug(anilistId, title) {
  const cached = slugCache.get(anilistId)
  if (cached) return cached

  const romaji = title?.romaji || ''
  const english = title?.english || ''
  const queries = [romaji, english].filter(Boolean)

  for (const q of queries) {
    const results = await searchTioAnime(q)
    if (!results.length) continue

    const exact = results.find((r) => r.name.toLowerCase() === q.toLowerCase())
    const slug = exact?.slug || results[0].slug
    if (slug) {
      slugCache.set(anilistId, slug)
      return slug
    }
  }

  const fallbackSlug = animeflvSlug(romaji || english)
  if (fallbackSlug) {
    const results = await searchTioAnime(fallbackSlug.replace(/-/g, ' '))
    if (results.length) {
      slugCache.set(anilistId, results[0].slug)
      return results[0].slug
    }
  }

  return null
}

export async function getTioAnimeEpisodes(anilistId, title) {
  const slug = await findTioAnimeSlug(anilistId, title)
  if (!slug) return null

  const data = await jimovFetch(`/anime/tioanime/name/${slug}`)
  if (!data?.episodes?.length) return null

  const episodes = data.episodes
    .sort((a, b) => b.num - a.num)
    .map((ep) => ({
      number: ep.num,
      title: ep.name || `Episodio ${ep.num}`,
      episodeId: `tioanime:${slug}:${ep.num}`,
    }))

  return {
    providerEpisodes: episodes,
    dubEpisodes: episodes,
    provider: 'tioanime',
    spanishInfo: {
      title: data.name,
      synopsis: data.synopsis,
      genres: data.genres,
      cover: data.image?.url,
    },
  }
}

export async function getTioAnimeServers(slug, epNum) {
  const servers = await jimovFetch(`/anime/tioanime/episode/${slug}-${epNum}`)
  if (!servers?.length) return null

  const sources = servers
    .filter((s) => s.url)
    .map((s) => ({
      url: s.file_url || s.url,
      quality: 'auto',
      server: s.name,
      referer: import.meta.env.VITE_TIOANIME_REFERER || 'https://tioanime.com/',
      type: detectSourceType(s.url),
    }))

  if (!sources.length) return null

  return { sources, audioLang: 'es' }
}

export async function getMonosChinosServers(episodeSlug) {
  if (!episodeSlug) return null
  const servers = await jimovFetch(`/anime/monoschinos/episode/${episodeSlug}`)
  if (!servers?.length) return null

  const sources = servers
    .filter((s) => s.url)
    .map((s) => ({
      url: s.url,
      quality: 'auto',
      server: s.name,
      referer: import.meta.env.VITE_MONOSCHINOS_REFERER || 'https://monoschinos.st/',
      type: detectSourceType(s.url),
    }))

  if (!sources.length) return null

  return { sources, audioLang: 'es' }
}

export async function extractMonosChinosSlug(animeUrl) {
  if (!animeUrl) return null
  const slug = animeUrl.split('/').pop()
  if (!slug) return null
  return slug.replace(/-sub-espanol$/, '').replace(/-sub$/, '')
}

export async function detectLatamAvailability(anilistId, title) {
  const slug = await findTioAnimeSlug(anilistId, title)
  return !!slug
}
