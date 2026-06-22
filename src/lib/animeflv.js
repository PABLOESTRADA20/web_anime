const ANIMEFLV_API = 'https://animeflv.ahmedrangel.com/api'
const FETCH_TIMEOUT = 10000

async function fetchJSON(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
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
  'demon slayer': 'kimetsu-no-yaiba',
  'kimetsu no yaiba': 'kimetsu-no-yaiba',
  'jujutsu kaisen': 'jujutsu-kaisen',
  'chainsaw man': 'chainsaw-man',
  'spy x family': 'spy-x-family',
  'mob psycho 100': 'mob-psycho-100',
  'one punch man': 'one-punch-man',
  'steins;gate': 'steins-gate',
  'code geass': 'code-geass',
  'cowboy bebop': 'cowboy-bebop',
  'evangelion': 'neon-genesis-evangelion',
  'neon genesis evangelion': 'neon-genesis-evangelion',
  'hunter x hunter': 'hunter-x-hunter',
  'hunterxhunter': 'hunter-x-hunter',
  'tokyo ghoul': 'tokyo-ghoul',
  're:zero': 'rezero-starting-life-in-another-world',
  'rezero': 'rezero-starting-life-in-another-world',
  'overlord': 'overlord',
  'konosuba': 'konosuba',
  'that time i got reincarnated as a slime': 'tensei-shitara-slime-datta-ken',
  'tensei shitara slime datta ken': 'tensei-shitara-slime-datta-ken',
  'mushoku tensei': 'mushoku-tensei',
  'made in abyss': 'made-in-abyss',
  'vinland saga': 'vinland-saga',
  'berserk': 'berserk',
  'bleach': 'bleach',
  'bleach thousand year blood war': 'bleach-thousand-year-blood-war',
  'gintama': 'gintama',
  'fairy tail': 'fairy-tail',
  'haikyuu': 'haikyuu',
  'haikyu': 'haikyuu',
  'kuroko no basket': 'kuroko-no-basket',
  'kurokos basketball': 'kuroko-no-basket',
  'shokugeki no soma': 'shokugeki-no-soma',
  'food wars': 'shokugeki-no-soma',
  'black clover': 'black-clover',
  'dr stone': 'dr-stone',
  'promised neverland': 'yakusoku-no-neverland',
  'yakusoku no neverland': 'yakusoku-no-neverland',
  'no game no life': 'no-game-no-life',
  'classroom of the elite': 'classroom-of-the-elite',
  'danmachi': 'danmachi',
  'gochuumon wa usagi desu ka': 'gochuumon-wa-usagi-desu-ka',
  'kaguya-sama': 'kaguya-sama-love-is-war',
  'kaguya sama': 'kaguya-sama-love-is-war',
  'love is war': 'kaguya-sama-love-is-war',
  'oshi no ko': 'oshi-no-ko',
  'frieren': 'sousou-no-frieren',
  'sousou no frieren': 'sousou-no-frieren',
  'solo leveling': 'solo-leveling',
  'dungeon meshi': 'dungeon-meshi',
  'delicious in dungeon': 'dungeon-meshi',
  'dandadan': 'dandadan',
  'kaiju no 8': 'kaiju-no-8',
  'kaiju number 8': 'kaiju-no-8',
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
