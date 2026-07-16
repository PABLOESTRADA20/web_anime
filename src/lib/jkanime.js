import { getAnimeTitle as anilistGetTitle } from './anilist.js'

const PROXY = '/api/proxy?url='
const BASE = 'https://jkanime.net'

async function fetchHTML(url) {
  const res = await fetch(PROXY + encodeURIComponent(url))
  if (!res.ok) throw new Error(`JKanime error ${res.status}`)
  return res.text()
}

export async function searchJkanime(query) {
  const html = await fetchHTML(`${BASE}/buscar/?q=${encodeURIComponent(query)}`)
  const results = []
  const itemRegex =
    /<a\s+href="https:\/\/jkanime\.net\/([^"/]+)\/?"[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<h5[^>]*>([\s\S]*?)<\/h5>[\s\S]*?<p[^>]*class="[^"]*badge[^"]*"[^>]*>([\s\S]*?)<\/p>[\s\S]*?<p[^>]*class="[^"]*badge[^"]*"[^>]*>([\s\S]*?)<\/p>/g

  let match
  while ((match = itemRegex.exec(html)) !== null) {
    const slug = match[1]
    const image = match[2].startsWith('http') ? match[2] : `https:${match[2]}`
    const title = match[3].replace(/<[^>]+>/g, '').trim()
    const status = match[4].replace(/<[^>]+>/g, '').trim()
    const type = match[5].replace(/<[^>]+>/g, '').trim()
    results.push({ slug, title, image, status, type })
  }

  return results
}

export async function findSlugByTitle(title) {
  const terms = title
    .replace(/[^\w\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(' ')
  if (!terms) return null
  const results = await searchJkanime(terms)
  if (results.length === 0) return null
  const titleLower = title.toLowerCase()
  const exact = results.find((r) => r.title.toLowerCase() === titleLower)
  if (exact) return exact.slug
  return results[0].slug
}

export async function getEpisodeSources(slug, epNum) {
  const html = await fetchHTML(`${BASE}/${slug}/${epNum}/`)

  const sources = []
  const downloadServers = []

  const videoMatch = html.match(/var\s+video\s*=\s*\[([\s\S]*?)\];/)
  if (videoMatch) {
    const iframeRegex = /<iframe[^>]+src="([^"]+)"[^>]*>/g
    let m
    let idx = 0
    while ((m = iframeRegex.exec(videoMatch[1])) !== null) {
      const label = idx === 0 ? 'Desu' : idx === 1 ? 'Magi' : `Player ${idx + 1}`
      sources.push({ url: m[1].replace(/^\/\//, 'https://'), type: 'iframe', quality: label })
      idx++
    }
  }

  return { sources, downloadServers }
}

export async function getWatch(anilistId, epNum) {
  const title = await anilistGetTitle(anilistId)
  if (!title?.romaji && !title?.english) throw new Error('JKanime: sin título')
  const searchTitle = title.romaji || title.english || title.userPreferred || ''
  const slug = await findSlugByTitle(searchTitle)
  if (!slug) throw new Error('JKanime: anime no encontrado')
  const { sources, downloadServers } = await getEpisodeSources(slug, epNum)
  if (!sources.length) throw new Error('JKanime: sin fuentes')
  return { sources, subtitles: [], downloads: downloadServers, audioLang: null, provider: 'jkanime', backend: 'jkanime', audioType: 'sub' }
}
