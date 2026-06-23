const PROXY = '/api/proxy?url='
const BASE = 'https://www.veranime.lat'
const BASE_ALT = 'https://ver-anime.my'

async function fetchJSON(url) {
  const res = await fetch(PROXY + encodeURIComponent(url))
  if (!res.ok) throw new Error(`VerAnime error ${res.status}`)
  return res.json()
}

async function fetchText(url) {
  const res = await fetch(PROXY + encodeURIComponent(url))
  if (!res.ok) throw new Error(`VerAnime error ${res.status}`)
  return res.text()
}

function parseSearchHTML(html) {
  const results = []
  const regex = /<article[^>]*class="[^"]*result-item[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/g
  let match
  while ((match = regex.exec(html)) !== null) {
    results.push({
      url: match[1],
      image: match[2],
      title: match[3],
      slug: match[1].replace(/^.*\/anime\//, '').replace(/\/$/, ''),
    })
  }
  return results
}

function parseEpisodesHTML(html) {
  const episodes = []
  const regex = /<li[^>]*>[\s\S]*?<a[^>]*href="([^"]*episode[^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*episode-number[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*episode-title[^"]*"[^>]*>([\s\S]*?)<\/span>/g
  let match
  while ((match = regex.exec(html)) !== null) {
    const num = parseFloat(match[2].replace(/[^\d.]/g, ''))
    episodes.push({
      number: num,
      title: match[3] || `Episodio ${num}`,
      slug: match[1].split('/').pop(),
    })
  }
  return episodes
}

function parseServersHTML(html) {
  const servers = []
  const regex = /<li[^>]*data-server="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*server-name[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*server-lang[^"]*"[^>]*>([\s\S]*?)<\/span>/g
  let match
  while ((match = regex.exec(html)) !== null) {
    servers.push({
      id: match[1],
      name: match[2],
      lang: match[3].toLowerCase(),
    })
  }
  return servers
}

export async function searchAnime(query) {
  try {
    const html = await fetchText(`${BASE}/buscar?q=${encodeURIComponent(query)}`)
    return parseSearchHTML(html)
  } catch {
    try {
      const html = await fetchText(`${BASE_ALT}/buscar?q=${encodeURIComponent(query)}`)
      return parseSearchHTML(html)
    } catch {
      return []
    }
  }
}

export async function getAnimeInfo(slug) {
  try {
    const html = await fetchText(`${BASE}/anime/${slug}`)
    return parseAnimeInfoHTML(html)
  } catch {
    try {
      const html = await fetchText(`${BASE_ALT}/anime/${slug}`)
      return parseAnimeInfoHTML(html)
    } catch {
      return null
    }
  }
}

function parseAnimeInfoHTML(html) {
  const titleMatch = html.match(/<h1[^>]*class="[^"]*anime-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/)
  const synopsisMatch = html.match(/<div[^>]*class="[^"]*synopsis[^"]*"[^>]*>([\s\S]*?)<\/div>/)
  const imageMatch = html.match(/<img[^>]*class="[^"]*anime-cover[^"]*"[^>]*src="([^"]*)"/)
  const genresMatch = html.match(/<span[^>]*class="[^"]*genre[^"]*"[^>]*>([\s\S]*?)<\/span>/g)
  
  return {
    title: titleMatch ? titleMatch[1] : '',
    synopsis: synopsisMatch ? synopsisMatch[1].replace(/<[^>]*>/g, '') : '',
    image: imageMatch ? imageMatch[1] : '',
    genres: genresMatch ? genresMatch.map(g => g.replace(/<[^>]*>/g, '').trim()) : [],
  }
}

export async function getAnimeEpisodes(slug) {
  try {
    const html = await fetchText(`${BASE}/anime/${slug}`)
    const episodes = parseEpisodesHTML(html)
    return {
      providerEpisodes: episodes,
      dubEpisodes: [],
      provider: 'veranime',
    }
  } catch {
    return { providerEpisodes: [], dubEpisodes: [], provider: 'veranime' }
  }
}

export async function getEpisodeServers(slug, episode) {
  try {
    const html = await fetchText(`${BASE}/anime/${slug}/${episode}`)
    return parseServersHTML(html)
  } catch {
    try {
      const html = await fetchText(`${BASE_ALT}/anime/${slug}/${episode}`)
      return parseServersHTML(html)
    } catch {
      return []
    }
  }
}

export async function getEpisodeSource(serverId) {
  try {
    const data = await fetchJSON(`${BASE}/api/stream/${serverId}`)
    return {
      sources: data?.servers?.map(s => ({
        url: s.url,
        quality: s.quality || 'auto',
        referer: BASE,
        type: s.url.includes('.m3u8') ? 'hls' : 'mp4',
      })) || [],
      subtitles: data?.subtitles || [],
    }
  } catch {
    return { sources: [], subtitles: [] }
  }
}

export async function getLatestAnime(page = 1) {
  try {
    const html = await fetchText(`${BASE}/estrenos?page=${page}`)
    return parseSearchHTML(html)
  } catch {
    return []
  }
}

export async function getTendencias(page = 1) {
  try {
    const html = await fetchText(`${BASE}/populares?page=${page}`)
    return parseSearchHTML(html)
  } catch {
    return []
  }
}
