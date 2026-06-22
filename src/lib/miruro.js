const BASE = import.meta.env.VITE_MIRURO_URL || 'https://mirurotvapi.vercel.app/api'

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Miruro error ${res.status}`)
  return res.json()
}

export const MIRURO_PROVIDERS = ['kiwi', 'pewe', 'moo', 'bee', 'hop', 'bonk', 'ally', 'nun', 'twin', 'cog', 'bun', 'telli']

export async function getEpisodes(anilistId, provider = 'kiwi') {
  const data = await fetchJSON(`${BASE}/episodes/${anilistId}?provider=${provider}`)
  if (!data?.success || !data?.results?.providers?.[provider]?.episodes) return null

  const eps = data.results.providers[provider].episodes
  return {
    sub: (eps.sub || []).map(ep => ({
      episodeId: ep.id,
      number: ep.number,
      title: ep.title || '',
      image: ep.image || '',
      duration: ep.duration,
    })),
    dub: (eps.dub || []).map(ep => ({
      episodeId: ep.id,
      number: ep.number,
      title: ep.title || '',
      image: ep.image || '',
      duration: ep.duration,
    })),
  }
}

export async function getWatch(episodeId) {
  const data = await fetchJSON(`${BASE}/${episodeId}`)
  if (!data?.success || !data?.results?.streams) throw new Error('Miruro: sin fuentes')

  const sources = data.results.streams
    .filter(s => s.type === 'hls' || s.url?.includes('.m3u8'))
    .map(s => ({
      url: s.url,
      quality: s.quality || 'auto',
      referer: s.referer || '',
      type: 'hls',
    }))

  if (!sources.length) throw new Error('Miruro: sin fuentes HLS')

  return {
    sources,
    download: data.results.download || null,
  }
}

export function parseEpisodeId(episodeId) {
  const parts = episodeId.split('/')
  if (parts.length < 5) return null
  return {
    provider: parts[1],
    anilistId: parseInt(parts[2], 10),
    audio: parts[3],
    epNum: parseInt(parts[4].split('-').pop(), 10),
  }
}
