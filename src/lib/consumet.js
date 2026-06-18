const CONSUMET_URL = import.meta.env.VITE_CONSUMET_URL
const FETCH_TIMEOUT = 10000

export function isConsumetConfigured() {
  if (!CONSUMET_URL) return false
  try {
    const url = new URL(CONSUMET_URL)
    return url.hostname !== 'railway.com' && url.hostname !== 'railway.app'
  } catch { return false }
}

export const CONSUMET_PROVIDERS = ['gogoanime', 'zoro', 'animekai', 'animepahe']

const FALLBACK_CONSUMET_INSTANCES = [
  CONSUMET_URL,
  'https://consumet-api-production-3333.up.railway.app',
  'https://api.consumet.org',
  'https://consumet-api-phi-lake.vercel.app',
].filter(Boolean)

async function fetchJSON(url, signal) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, { signal: signal || controller.signal })
    if (!res.ok) throw new Error(`Consumet error ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function getConsumetEpisodes(anilistId, provider = 'gogoanime', signal) {
  const instances = [...new Set(FALLBACK_CONSUMET_INSTANCES)]
  for (const instance of instances) {
    try {
      const data = await fetchJSON(`${instance}/meta/anilist/info/${anilistId}?provider=${provider}`, signal)
      if (!data?.episodes?.length) return []
      return data.episodes.map(ep => ({
        episodeId: ep.id,
        episodeNumber: ep.number,
        title: ep.title || '',
        thumbnail: ep.image || '',
      }))
    } catch {
      // continue to next instance
    }
  }
  return []
}

export async function getConsumetSources(episodeId, signal) {
  const instances = [...new Set(FALLBACK_CONSUMET_INSTANCES)]
  for (const instance of instances) {
    try {
      const data = await fetchJSON(`${instance}/meta/anilist/watch/${encodeURIComponent(episodeId)}`, signal)
      return {
        sources: (data.sources || []).filter(s => s.isM3U8 !== false).map(s => ({
          url: s.url,
          quality: s.quality || 'auto',
        })),
        subtitles: (data.subtitles || []).map(s => ({
          file: s.url || '',
          label: s.lang || 'Unknown',
        })),
      }
    } catch {
      // continue to next instance
    }
  }
  return { sources: [], subtitles: [] }
}

export async function getConsumetWatch(anilistId, epNum, provider = 'gogoanime', signal) {
  const episodes = await getConsumetEpisodes(anilistId, provider, signal)
  const episode = episodes.find(ep => ep.episodeNumber === epNum)
  if (!episode) throw new Error(`Episodio ${epNum} no encontrado en ${provider}`)
  return getConsumetSources(episode.episodeId, signal)
}
