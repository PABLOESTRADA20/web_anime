const ANIMEFLV_API = 'https://animeflv.ahmedrangel.com/api'

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const SLUG_OVERRIDES = {
  'naruto shippuden': 'naruto-shippuden-hd',
  'naruto shippūden': 'naruto-shippuden-hd',
  'dragon ball z': 'dragon-ball-z',
  'dragon ball super': 'dragon-ball-super',
  'one piece': 'one-piece',
  'attack on titan': 'shingeki-no-kyojin',
  'shingeki no kyojin': 'shingeki-no-kyojin',
  'sword art online': 'sword-art-online',
  'death note': 'death-note',
  'fullmetal alchemist': 'fullmetal-alchemist',
  'full metal alchemist': 'fullmetal-alchemist',
  'my hero academia': 'boku-no-hero-academia',
  'boku no hero academia': 'boku-no-hero-academia',
}

export function getSlug(title) {
  const key = title.toLowerCase().trim()
  return SLUG_OVERRIDES[key] || slugify(key)
}

export async function getAnimeInfo(slug) {
  const data = await fetchJSON(`${ANIMEFLV_API}/anime/${slug}`)
  if (!data?.success) return null
  return data.data
}

export async function searchAnime(query) {
  const slug = getSlug(query)
  const data = await getAnimeInfo(slug)
  if (data) {
    return [{
      title: data.title,
      slug,
      synopsis: data.synopsis,
      image: data.cover,
      genres: data.genres,
      episodes: data.episodes?.length || 0,
      url: data.url,
      rating: data.rating,
      status: data.status,
      related: data.related,
    }]
  }
  return []
}

export async function getSpanishMetadata(anilistTitle) {
  const romaji = anilistTitle?.romaji || anilistTitle?.english || ''
  const slug = getSlug(romaji)
  const data = await getAnimeInfo(slug)
  return data ? { ...data, slug } : null
}
