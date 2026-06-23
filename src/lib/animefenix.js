const PROXY = '/api/proxy?url='
const BASE_1 = 'https://animefenix.one'
const BASE_2 = 'https://vww.animefenix.vip'
const SEARCH_API = 'https://animefenix-api-scraping-production.up.railway.app'

async function fetchJSON(url) {
  const res = await fetch(PROXY + encodeURIComponent(url))
  if (!res.ok) throw new Error(`AnimeFenix error ${res.status}`)
  return res.json()
}

async function searchAPI(query) {
  try {
    const data = await fetchJSON(`${SEARCH_API}/api/search?q=${encodeURIComponent(query)}`)
    return data?.results || []
  } catch {
    return []
  }
}

export async function searchAnime(query) {
  const results = await searchAPI(query)
  return results.map(r => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    image: r.image,
    type: r.type,
    status: r.status,
    genres: r.genres,
  }))
}

export async function getAnimeInfo(slug) {
  try {
    const data = await fetchJSON(`${BASE_1}/api/anime/${slug}`)
    return data
  } catch {
    try {
      return await fetchJSON(`${BASE_2}/api/anime/${slug}`)
    } catch {
      return null
    }
  }
}

export async function getAnimeEpisodes(slug) {
  try {
    const data = await fetchJSON(`${BASE_1}/api/anime/${slug}/episodes`)
    return data
  } catch {
    try {
      return await fetchJSON(`${BASE_2}/api/anime/${slug}/episodes`)
    } catch {
      return { sub: [], dub: [] }
    }
  }
}

export async function getEpisodeServers(slug, episode) {
  try {
    const data = await fetchJSON(`${BASE_1}/api/anime/${slug}/episode/${episode}`)
    return data?.servers || []
  } catch {
    try {
      return (await fetchJSON(`${BASE_2}/api/anime/${slug}/episode/${episode}`))?.servers || []
    } catch {
      return []
    }
  }
}

export async function getEpisodeSource(serverUrl) {
  try {
    const data = await fetchJSON(`${SEARCH_API}/api/extract?url=${encodeURIComponent(serverUrl)}`)
    return {
      sources: [{
        url: data.url,
        quality: data.quality || 'auto',
        referer: serverUrl,
        type: data.url.includes('.m3u8') ? 'hls' : 'mp4',
      }],
      subtitles: data.subtitles || [],
    }
  } catch {
    return { sources: [], subtitles: [] }
  }
}

export async function getTendencias(page = 1) {
  try {
    return await fetchJSON(`${BASE_1}/api/tendencias?page=${page}`)
  } catch {
    return []
  }
}

export async function getEstrenos(page = 1) {
  try {
    return await fetchJSON(`${BASE_1}/api/estrenos?page=${page}`)
  } catch {
    return []
  }
}
