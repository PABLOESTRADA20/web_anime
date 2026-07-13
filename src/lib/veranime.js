const PROXY = '/api/proxy?url='
const BASE = import.meta.env.VITE_VERANIME_URL || 'https://www.veranime.lat'

async function fetchText(url) {
  const res = await fetch(PROXY + encodeURIComponent(url))
  if (!res.ok) throw new Error(`VerAnime error ${res.status}`)
  return res.text()
}

function parseEpisodesHTML(html) {
  const episodes = []
  const regex =
    /<li[^>]*>[\s\S]*?<a[^>]*href="([^"]*episode[^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*episode-number[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*episode-title[^"]*"[^>]*>([\s\S]*?)<\/span>/g
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
