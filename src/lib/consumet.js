const CONSUMET_URL = import.meta.env.VITE_CONSUMET_URL

export function isConsumetConfigured() {
  if (!CONSUMET_URL) return false
  try {
    const url = new URL(CONSUMET_URL)
    return url.hostname !== 'railway.com' && url.hostname !== 'railway.app'
  } catch { return false }
}

export const CONSUMET_PROVIDERS = ['gogoanime', 'zoro', 'animekai', 'animepahe']

function baseUrl() {
  return CONSUMET_URL.replace(/\/+$/, '')
}

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Consumet error ${res.status}`)
  return res.json()
}

export async function getConsumetEpisodes(anilistId, provider = 'gogoanime') {
  const data = await fetchJSON(`${baseUrl()}/meta/anilist/info/${anilistId}?provider=${provider}`)
  if (!data?.episodes?.length) return []
  return data.episodes.map(ep => ({
    episodeId: ep.id,
    episodeNumber: ep.number,
    title: ep.title || '',
    thumbnail: ep.image || '',
  }))
}

export async function getConsumetSources(episodeId) {
  const data = await fetchJSON(`${baseUrl()}/meta/anilist/watch/${encodeURIComponent(episodeId)}`)
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
}

export async function getConsumetWatch(anilistId, epNum, provider = 'gogoanime') {
  const episodes = await getConsumetEpisodes(anilistId, provider)
  const episode = episodes.find(ep => ep.episodeNumber === epNum)
  if (!episode) throw new Error(`Episodio ${epNum} no encontrado en ${provider}`)
  return getConsumetSources(episode.episodeId)
}
