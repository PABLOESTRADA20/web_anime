const BASE = 'https://kenjitsu.vercel.app/api'

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Provider error: ${res.status}`)
  return res.json()
}

export async function searchAnime(query, page = 1) {
  return fetchJSON(`${BASE}/anilist/anime/search?q=${encodeURIComponent(query)}&page=${page}`)
}

export async function getTopAnime(category = 'trending', page = 1) {
  return fetchJSON(`${BASE}/anilist/anime/top/${category}?page=${page}`)
}

export async function getAnimeInfo(anilistId) {
  return fetchJSON(`${BASE}/anilist/anime/${anilistId}`)
}

export async function getAnimeEpisodes(anilistId, provider = 'animepahe') {
  return fetchJSON(`${BASE}/anilist/episodes/${anilistId}?provider=${provider}`)
}

export async function getEpisodeServers(episodeId) {
  return fetchJSON(`${BASE}/animepahe/episode/${episodeId}/servers`)
}

export async function getAnimepaheSources(episodeId, version = 'sub') {
  return fetchJSON(`${BASE}/animepahe/sources/${episodeId}?version=${version}`)
}
