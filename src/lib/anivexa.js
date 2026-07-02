const PROXY = '/api/proxy?url='
const BASE = import.meta.env.VITE_ANIVEXA_URL || 'https://anivexa-api.vercel.app'
const FETCH_TIMEOUT = 10000

async function fetchJSON(url, signal) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(PROXY + encodeURIComponent(url), { signal: signal || controller.signal })
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

export const PROVIDER_PRIORITY = ['allmanga', 'anikoto', 'animegg', 'anineko', 'reanime', 'anidbapp', 'animepahe']

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

function detectSpanishAudio(watchData) {
  if (!watchData) return false
  const audioTracks = watchData.audio || watchData.audioTracks || []
  if (audioTracks.length > 0) {
    return audioTracks.some((t) => {
      const lang = (t.language || t.lang || t.srclang || '').toLowerCase()
      const label = (t.label || t.name || '').toLowerCase()
      return lang.startsWith('es') || /spanish|español|latino/i.test(label)
    })
  }
  return false
}

function hasSpanishSubs(subtitles) {
  return subtitles.some((s) => {
    const lang = (s.language || s.lang || s.srclang || '').toLowerCase()
    const file = (s.file || s.url || s.src || '').toLowerCase()
    const label = (s.label || s.name || '').toLowerCase()
    if (lang === 'es' || lang === 'spa') return true
    if (/spanish|español|espanol|latino|castellano/.test(label)) return true
    if (/es\.|spanish\.|spa-|_es\./.test(file)) return true
    return false
  })
}

export function normalizeStreams(watchData) {
  if (!watchData) return { sources: [], subtitles: [], audioLang: null }

  let streams = []
  let subtitles = []

  const ssub = watchData.ssub || watchData.sdub
  if (ssub?.streams) {
    streams = ssub.streams
      .filter((s) => s.type === 'hls' || s.type === 'mp4')
      .map((s) => ({ ...s, url: s.url, quality: s.quality || 'auto', server: s.server, referer: s.referer || '' }))
    subtitles = ssub.subtitles || ssub.subs || ssub.tracks || []
  } else if (watchData.streams) {
    streams = watchData.streams
      .filter((s) => s.type === 'hls' || s.type === 'hls-redirect' || s.type === 'mp4' || s.url?.includes('.m3u8'))
      .filter((s) => s.isActive !== false)
      .map((s) => ({ ...s, quality: s.quality || 'auto', referer: s.referer || '' }))
    subtitles = watchData.subtitles || watchData.subs || watchData.tracks || watchData.captions || []
  } else if (watchData.sources) {
    streams = watchData.sources
      .filter((s) => s.extractedUrl || s.url?.includes('.m3u8') || s.type === 'iframe')
      .map((s) => ({
        url: s.extractedUrl || s.url,
        quality: s.name || 'auto',
        referer: s.headers?.Referer || '',
        type: s.type === 'iframe' ? 'iframe' : s.url?.includes('.m3u8') ? 'hls' : 'direct',
      }))
    subtitles = watchData.subtitles || watchData.subs || watchData.tracks || watchData.captions || []
  }

  const streamReferer = streams.find((s) => s.referer)?.referer || ''

  subtitles = subtitles.map((s, idx) => {
    const lang = s.language || s.lang || s.srclang || ''
    const label = s.label || s.name || lang || `Track ${idx}`
    return {
      ...s,
      file: s.file || s.url || s.src || '',
      label,
      language: lang,
      referer: s.referer || streamReferer,
    }
  })

  const filtered = subtitles.filter((s) => s.file)

  if (!filtered.length && ssub?.streams?.length && ssub.streams[0].url && !hasSpanishSubs(filtered)) {
    // Some Anivexa providers include subtitles directly in the HLS manifest
    // We'll rely on hls.js to pick them up
  }

  const audioLang = detectSpanishAudio(watchData) ? 'es' : null

  return { sources: streams, subtitles: filtered, audioLang }
}
