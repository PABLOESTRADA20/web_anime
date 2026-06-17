const BASE = import.meta.env.VITE_ANIVEXA_URL || 'https://anivexa-api.vercel.app'

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Anivexa error ${res.status}`)
  return res.json()
}

export async function getEpisodes(anilistId) {
  return fetchJSON(`${BASE}/episodes/${anilistId}`)
}

export async function getWatch(anilistId, provider, epNum, audio = 'sub') {
  return fetchJSON(`${BASE}/watch/${provider}/${anilistId}/${audio}/${provider}-${epNum}`)
}

const PROVIDER_PRIORITY = ['anikoto', 'reanime', 'allmanga', 'animegg', 'anineko', 'anidbapp', 'animepahe']

export function getBestProvider(data) {
  for (const p of PROVIDER_PRIORITY) {
    if (data?.[p] && !data[p].error && data[p]?.episodes?.sub?.length) return p
  }
  return null
}

export function getEpisodeList(data, provider, audio = 'sub') {
  return data?.[provider]?.episodes?.[audio] || []
}

export function parseEpisodeId(episodeId) {
  const parts = episodeId.split('/')
  if (parts.length < 5) return null
  return {
    provider: parts[1],
    anilistId: parts[2],
    audio: parts[3],
    epNum: parseInt(parts[4].split('-').pop(), 10),
  }
}

export function normalizeStreams(watchData) {
  if (!watchData) return { sources: [], subtitles: [] }

  let streams = []
  let subtitles = []

  const ssub = watchData.ssub || watchData.sdub
  if (ssub?.streams) {
    streams = ssub.streams
      .filter(s => s.type === 'hls' || s.type === 'mp4')
      .map(s => ({ ...s, url: s.url, quality: s.quality || 'auto', server: s.server }))
    subtitles = ssub.subtitles || []
  } else if (watchData.streams) {
    streams = watchData.streams
      .filter(s => s.type === 'hls' || s.type === 'hls-redirect' || s.type === 'mp4' || s.url?.includes('.m3u8'))
      .filter(s => s.isActive !== false)
      .map(s => ({ ...s, quality: s.quality || 'auto' }))
    subtitles = watchData.subtitles || []
  } else if (watchData.sources) {
    streams = watchData.sources.filter(s => s.extractedUrl || s.url?.includes('.m3u8')).map(s => ({
      url: s.extractedUrl || s.url,
      quality: s.name || 'auto',
      referer: s.headers?.Referer || '',
    }))
  }

  return { sources: streams, subtitles }
}
