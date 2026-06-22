const BASE = import.meta.env.VITE_ANIVEXA_URL || 'https://anivexa-api.vercel.app'
const FETCH_TIMEOUT = 10000

async function fetchJSON(url, signal) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, { signal: signal || controller.signal })
    if (!res.ok) throw new Error(`Anivexa error ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function getEpisodes(anilistId, signal) {
  return fetchJSON(`${BASE}/episodes/${anilistId}`, signal)
}

export async function getWatch(anilistId, provider, epNum, audio = 'sub', signal) {
  return fetchJSON(`${BASE}/watch/${provider}/${anilistId}/${audio}/${provider}-${epNum}`, signal)
}

export const PROVIDER_PRIORITY = ['anikoto', 'reanime', 'allmanga', 'animegg', 'anineko', 'anidbapp', 'animepahe']

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

export function detectSpanishAudio(watchData) {
  if (!watchData) return false
  const ssub = watchData.ssub || watchData.sdub
  const subs = ssub?.subtitles || watchData.subtitles || watchData.subs || watchData.tracks || []
  return subs.some(s => {
    const lang = (s.language || s.lang || s.srclang || '').toLowerCase()
    const label = (s.label || s.name || '').toLowerCase()
    return lang.startsWith('es') || /spanish|español|latino|subtitulos/i.test(label)
  })
}

export function normalizeStreams(watchData) {
  if (!watchData) return { sources: [], subtitles: [], audioLang: null }

  let streams = []
  let subtitles = []

  const ssub = watchData.ssub || watchData.sdub
  if (ssub?.streams) {
    streams = ssub.streams
      .filter(s => s.type === 'hls' || s.type === 'mp4')
      .map(s => ({ ...s, url: s.url, quality: s.quality || 'auto', server: s.server }))
    subtitles = ssub.subtitles || ssub.subs || ssub.tracks || []
  } else if (watchData.streams) {
    streams = watchData.streams
      .filter(s => s.type === 'hls' || s.type === 'hls-redirect' || s.type === 'mp4' || s.url?.includes('.m3u8'))
      .filter(s => s.isActive !== false)
      .map(s => ({ ...s, quality: s.quality || 'auto' }))
    subtitles = watchData.subtitles || watchData.subs || watchData.tracks || watchData.captions || []
  } else if (watchData.sources) {
    streams = watchData.sources.filter(s => s.extractedUrl || s.url?.includes('.m3u8')).map(s => ({
      url: s.extractedUrl || s.url,
      quality: s.name || 'auto',
      referer: s.headers?.Referer || '',
    }))
    subtitles = watchData.subtitles || watchData.subs || watchData.tracks || watchData.captions || []
  }

  subtitles = subtitles.map(s => {
    const lang = s.language || s.lang || s.srclang || ''
    const label = s.label || s.name || lang || `Track ${s.index || 0}`
    return {
      ...s,
      file: s.file || s.url || s.src || '',
      label,
      language: lang,
    }
  })

  const audioLang = detectSpanishAudio(watchData) ? 'es' : (subtitles[0]?.language || null)

  return { sources: streams, subtitles, audioLang }
}

let providerHealthCache = null
let providerHealthCacheTime = 0
const HEALTH_CACHE_TTL = 30000

export async function pingProviders(anilistId, signal) {
  const now = Date.now()
  if (providerHealthCache && now - providerHealthCacheTime < HEALTH_CACHE_TTL) {
    return providerHealthCache
  }
  const results = []
  for (const p of PROVIDER_PRIORITY) {
    try {
      const data = await getWatch(anilistId, p, 1, 'sub', signal)
      const { sources } = normalizeStreams(data)
      results.push({ provider: p, alive: sources.length > 0 })
    } catch {
      results.push({ provider: p, alive: false })
    }
  }
  providerHealthCache = results
  providerHealthCacheTime = now
  return results
}

export function clearProviderHealthCache() {
  providerHealthCache = null
  providerHealthCacheTime = 0
}
