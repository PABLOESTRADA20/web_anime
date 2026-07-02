const PROXY = '/api/proxy?url='
const BASE = import.meta.env.VITE_CONSUMET_URL || 'https://consumet-api-pi.vercel.app'
const FETCH_TIMEOUT = 10000

const CONSUMET_PROVIDERS = ['animekai', 'hianime', 'animepahe']

async function fetchJSON(url, signal) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(PROXY + encodeURIComponent(url), { signal: signal || controller.signal })
    if (!res.ok) throw new Error(`Consumet error ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

function normalizeConsumetStreams(data) {
  if (!data) return { sources: [], subtitles: [] }

  const rawSources = data.sources || data.streams || []
  const sources = rawSources
    .filter((s) => s.url && (s.url.includes('.m3u8') || s.url.includes('.mp4')))
    .map((s) => ({
      url: s.url,
      quality: s.quality || 'auto',
      referer: s.headers?.Referer || data.headers?.Referer || data.referer || '',
      type: s.url.includes('.m3u8') ? 'hls' : 'mp4',
    }))

  const rawSubs = data.subtitles || data.subs || data.tracks || data.captions || []
  const subtitles = rawSubs
    .filter((s) => s.file || s.url || s.src)
    .map((s, idx) => {
      const lang = s.language || s.lang || s.srclang || ''
      return {
        file: s.file || s.url || s.src || '',
        label: s.label || s.name || lang || `Track ${idx}`,
        language: lang,
        referer: s.referer || sources.find((src) => src.referer)?.referer || '',
      }
    })

  return { sources, subtitles }
}

export async function searchAnime(query, signal) {
  for (const provider of CONSUMET_PROVIDERS) {
    try {
      const data = await fetchJSON(`${BASE}/anime/${provider}/${encodeURIComponent(query)}`, signal)
      if (data?.results?.length) {
        return data.results.map((r) => ({
          id: r.id,
          title: r.title,
          image: r.image || r.poster || r.cover || '',
          anilistId: r.malId || r.id,
          provider,
        }))
      }
    } catch {
      /* try next provider */
    }
  }
  return []
}

export async function getEpisodes(anilistId, signal) {
  for (const provider of CONSUMET_PROVIDERS) {
    try {
      const data = await fetchJSON(`${BASE}/anime/${provider}/info/${encodeURIComponent(anilistId)}`, signal)
      if (data?.episodes?.length) {
        return {
          providerEpisodes: data.episodes.map((ep, i) => ({
            number: ep.number || ep.episode || i + 1,
            title: ep.title || `Episodio ${ep.number || i + 1}`,
            episodeId: ep.id,
            image: ep.image || '',
          })),
          dubEpisodes: [],
          provider: `consumet-${provider}`,
        }
      }
    } catch {
      /* try next */
    }
  }
  return null
}

export async function getWatch(episodeId, signal) {
  for (const provider of CONSUMET_PROVIDERS) {
    try {
      const data = await fetchJSON(`${BASE}/anime/${provider}/watch?episodeId=${encodeURIComponent(episodeId)}`, signal)
      const { sources, subtitles } = normalizeConsumetStreams(data)
      if (sources.length > 0) {
        return { sources, subtitles, provider: `consumet-${provider}` }
      }
    } catch {
      /* try next */
    }
  }
  throw new Error('Consumet: sin fuentes disponibles')
}

export async function getWatchByNumber(anilistId, epNum, signal) {
  const eps = await getEpisodes(anilistId, signal)
  if (!eps?.providerEpisodes?.length) throw new Error('Consumet: sin episodios')
  const ep = eps.providerEpisodes.find((e) => e.number === epNum)
  if (!ep?.episodeId) throw new Error(`Consumet: episodio ${epNum} no encontrado`)
  return getWatch(ep.episodeId, signal)
}
