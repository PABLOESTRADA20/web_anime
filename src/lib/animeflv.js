const PROXY = '/api/proxy?url='
const ANIMEFLV_API = import.meta.env.VITE_ANIMEFLV_URL || 'https://animeflv.ahmedrangel.com/api'
const FETCH_TIMEOUT = 10000
const slugCache = new Map()

async function fetchJSON(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(PROXY + encodeURIComponent(url), { signal: controller.signal })
    if (!res.ok) return null
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const SLUG_OVERRIDES = {
  naruto: 'naruto',
  'naruto shippuden': 'naruto-shippuden-hd',
  'naruto shippūden': 'naruto-shippuden-hd',
  'boruto naruto next generations': 'boruto-naruto-next-generations',
  'dragon ball': 'dragon-ball',
  'dragon ball z': 'dragon-ball-z',
  'dragon ball super': 'dragon-ball-super',
  'one piece': 'one-piece-tv',
  'attack on titan': 'shingeki-no-kyojin',
  'attack on titan final season': 'shingeki-no-kyojin-4',
  'shingeki no kyojin': 'shingeki-no-kyojin',
  'sword art online': 'sword-art-online',
  'sword art online ii': 'sword-art-online-2',
  'sword art online alicization': 'sword-art-online-alicization',
  'death note': 'death-note',
  'fullmetal alchemist': 'fullmetal-alchemist',
  'fullmetal alchemist brotherhood': 'fullmetal-alchemist-brotherhood',
  'full metal alchemist': 'fullmetal-alchemist',
  'my hero academia': 'boku-no-hero-academia',
  'boku no hero academia': 'boku-no-hero-academia',
  'demon slayer': 'kimetsu-no-yaiba',
  'kimetsu no yaiba': 'kimetsu-no-yaiba',
  'jujutsu kaisen': 'jujutsu-kaisen-tv',
  'chainsaw man': 'chainsaw-man',
  'spy x family': 'spy-x-family',
  'mob psycho 100': 'mob-psycho-100',
  'one punch man': 'one-punch-man',
  'steins gate': 'steinsgate',
  'steins;gate': 'steinsgate',
  'code geass': 'code-geass',
  'code geass lelouch of the rebellion': 'code-geass',
  'cowboy bebop': 'cowboy-bebop',
  evangelion: 'neon-genesis-evangelion',
  'neon genesis evangelion': 'neon-genesis-evangelion',
  'hunter x hunter': 'hunter-x-hunter',
  hunterxhunter: 'hunter-x-hunter',
  'tokyo ghoul': 'tokyo-ghoul',
  'tokyo ghoul √a': 'tokyo-ghoul-2',
  'tokyo ghoul:re': 'tokyo-ghoul-re',
  're zero': 're-zero-kara-hajimeru-isekai-seikatsu',
  rezero: 're-zero-kara-hajimeru-isekai-seikatsu',
  're:zero': 're-zero-kara-hajimeru-isekai-seikatsu',
  're zero kara hajimeru isekai seikatsu': 're-zero-kara-hajimeru-isekai-seikatsu',
  overlord: 'overlord',
  konosuba: 'kono-subarashii-sekai-ni-shukufuku-wo',
  'kono subarashii sekai ni shukufuku wo': 'kono-subarashii-sekai-ni-shukufuku-wo',
  'that time i got reincarnated as a slime': 'tensei-shitara-slime-datta-ken',
  'tensei shitara slime datta ken': 'tensei-shitara-slime-datta-ken',
  'mushoku tensei': 'mushoku-tensei-isekai-ittara-honki-dasu',
  'mushoku tensei isekai ittara honki dasu': 'mushoku-tensei-isekai-ittara-honki-dasu',
  'made in abyss': 'made-in-abyss',
  'vinland saga': 'vinland-saga',
  berserk: 'berserk',
  'berserk 2016': 'berserk-2',
  bleach: 'bleach-tv',
  'bleach thousand year blood war': 'bleach-sennen-kessen-hen',
  gintama: 'gintama',
  'fairy tail': 'fairy-tail',
  haikyuu: 'haikyuu',
  haikyu: 'haikyuu',
  'kuroko no basket': 'kuroko-no-basket',
  'kurokos basketball': 'kuroko-no-basket',
  'shokugeki no soma': 'shokugeki-no-souma',
  'food wars': 'shokugeki-no-souma',
  'black clover': 'black-clover-tv',
  'dr stone': 'dr-stone',
  'dr. stone': 'dr-stone',
  'dr.stone': 'dr-stone',
  'promised neverland': 'yakusoku-no-neverland',
  'the promised neverland': 'yakusoku-no-neverland',
  'yakusoku no neverland': 'yakusoku-no-neverland',
  'no game no life': 'no-game-no-life',
  'classroom of the elite': 'youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-tv',
  'youkoso jitsuryoku shijou shugi no kyoushitsu e': 'youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-tv',
  danmachi: 'danmachi',
  'gochuumon wa usagi desu ka': 'gochuumon-wa-usagi-desu-ka',
  'kaguya sama': 'kaguya-sama-love-is-war',
  'kaguya-sama': 'kaguya-sama-love-is-war',
  'love is war': 'kaguya-sama-love-is-war',
  'oshi no ko': 'oshi-no-ko',
  frieren: 'sousou-no-frieren',
  'sousou no frieren': 'sousou-no-frieren',
  'solo leveling': 'ore-dake-level-up-na-ken',
  'ore dake level up na ken': 'ore-dake-level-up-na-ken',
  'dungeon meshi': 'dungeon-meshi',
  'delicious in dungeon': 'dungeon-meshi',
  dandadan: 'dandadan',
  'kaiju no 8': 'kaijuu-8-gou',
  'kaiju number 8': 'kaijuu-8-gou',
  'kaijuu 8 gou': 'kaijuu-8-gou',
  'cyberpunk edgerunners': 'cyberpunk-edgerunners',
  'devilman crybaby': 'devilman-crybaby',
  'your name': '5-centimetros-por-segundo',
  'kimi no na wa': '5-centimetros-por-segundo',
  akira: 'akira',
  'ghost in the shell': 'ghost-in-the-shell',
  'princess mononoke': 'princess-mononoke',
  'spirited away': 'el-viaje-de-chihiro',
  'howl moving castle': 'howl-no-ugoku-shiro',
  'howl no ugoku shiro': 'howl-no-ugoku-shiro',
  'naruto shippuden hd': 'naruto-shippuden-hd',
  parasyte: 'parasyte-the-maxim',
  'parasyte the maxim': 'parasyte-the-maxim',
  kiseijuu: 'parasyte-the-maxim',
  'steins gate 0': 'steinsgate-0',
  'steins;gate 0': 'steinsgate-0',
  're zero 2': 're-zero-kara-hajimeru-isekai-seikatsu-2',
  'rezero 2': 're-zero-kara-hajimeru-isekai-seikatsu-2',
  're:zero 2': 're-zero-kara-hajimeru-isekai-seikatsu-2',
  're zero 3': 're-zero-kara-hajimeru-isekai-seikatsu-3',
  'rezero 3': 're-zero-kara-hajimeru-isekai-seikatsu-3',
  'one punch man 2': 'one-punch-man-2',
  'one punch man 3': 'one-punch-man-3',
  'attack on titan 2': 'shingeki-no-kyojin-2',
  'attack on titan 3': 'shingeki-no-kyojin-3',
  'attack on titan 4': 'shingeki-no-kyojin-4',
  'shingeki no kyojin 2': 'shingeki-no-kyojin-2',
  'shingeki no kyojin 3': 'shingeki-no-kyojin-3',
  'shingeki no kyojin 4': 'shingeki-no-kyojin-4',
  'my hero academia 2': 'boku-no-hero-academia-2',
  'my hero academia 3': 'boku-no-hero-academia-3',
  'my hero academia 4': 'boku-no-hero-academia-4',
  'my hero academia 5': 'boku-no-hero-academia-5',
  'my hero academia 6': 'boku-no-hero-academia-6',
  'boku no hero academia 2': 'boku-no-hero-academia-2',
  'demon slayer 2': 'kimetsu-no-yaiba-2',
  'demon slayer 3': 'kimetsu-no-yaiba-3',
  'demon slayer 4': 'kimetsu-no-yaiba-4',
  'kimetsu no yaiba 2': 'kimetsu-no-yaiba-2',
  'kimetsu no yaiba 3': 'kimetsu-no-yaiba-3',
  'kimetsu no yaiba 4': 'kimetsu-no-yaiba-4',
  'jujutsu kaisen 2': 'jujutsu-kaisen-2nd-season',
  'jujutsu kaisen 0': 'jujutsu-kaisen-0',
  'chainsaw man tv': 'chainsaw-man',
  'mob psycho 100 2': 'mob-psycho-100-2',
  'mob psycho 100 3': 'mob-psycho-100-3',
  'overlord 2': 'overlord-2',
  'overlord 3': 'overlord-3',
  'overlord 4': 'overlord-4',
  'tokyo revengers': 'tokyo-revengers',
  'death parade': 'death-parade',
  'angel beats': 'angel-beats',
  clannad: 'clannad',
  'clannad after story': 'clannad-after-story',
  toradora: 'toradora',
  anohana: 'anohana',
  'ano hi mita hana no namae o bokutachi wa mada shiranai': 'anohana',
  erased: 'erased',
  'boku dake ga inai machi': 'erased',
  'your lie in april': 'shigatsu-wa-kimi-no-uso',
  'shigatsu wa kimi no uso': 'shigatsu-wa-kimi-no-uso',
  'violet evergarden': 'violet-evergarden',
  'a silent voice': 'koe-no-katachi',
  'koe no katachi': 'koe-no-katachi',
  'weathering with you': 'tenki-no-ko',
  'tenki no ko': 'tenki-no-ko',
  suzume: 'suzume-no-tojimari',
  'suzume no tojimari': 'suzume-no-tojimari',
  'the girl who leapt through time': 'tokikake',
  tokikake: 'tokikake',
  'fate stay night': 'fate-stay-night',
  'fate/stay night': 'fate-stay-night',
  'fate zero': 'fate-zero',
  'fate grand order': 'fate-grand-order',
  'fate grand order absolute demotic front babylonia': 'fate-grand-order-babylonia',
  'jojo bizarre adventure': 'jojo-no-kimyou-na-bouken-tv',
  'jojos bizarre adventure': 'jojo-no-kimyou-na-bouken-tv',
  'jojo no kimyou na bouken': 'jojo-no-kimyou-na-bouken-tv',
  jojos: 'jojo-no-kimyou-na-bouken-tv',
  'dragon ball gt': 'dragon-ball-gt',
  'dragon ball kai': 'dragon-ball-kai',
  'dragon ball heroes': 'dragon-ball-heroes',
  pokemon: 'pokemon',
  pokémon: 'pokemon',
  'digimon adventure': 'digimon-adventure',
  digimon: 'digimon-adventure',
  'shaman king': 'shaman-king',
  'yu yu hakusho': 'yu-yu-hakusho',
  'yuyu hakusho': 'yu-yu-hakusho',
  ruroken: 'samurai-x',
  'rurouni kenshin': 'samurai-x',
  'samurai x': 'samurai-x',
  'saint seiya': 'caballeros-del-zodiaco',
  'caballeros del zodiaco': 'caballeros-del-zodiaco',
  'sailor moon': 'sailor-moon',
  'sailor moon crystal': 'sailor-moon-crystal',
  'cardcaptor sakura': 'cardcaptor-sakura',
  inuyasha: 'inuyasha',
  'ranma ½': 'ranma',
  ranma: 'ranma',
  trigun: 'trigun',
  'trigun stampede': 'trigun-stampede',
  hellsing: 'hellsing',
  'hellsing ultimate': 'hellsing-ultimate',
  'samurai champloo': 'samurai-champloo',
  flcl: 'flcl',
  'fooly cooly': 'flcl',
  'gurren lagann': 'gurren-lagann',
  ttgl: 'gurren-lagann',
  'tengen toppa gurren lagann': 'gurren-lagann',
  'monogatari series': 'bakemonogatari',
  bakemonogatari: 'bakemonogatari',
  'psycho pass': 'psycho-pass',
  psychopass: 'psycho-pass',
  'serial experiments lain': 'lain',
  lain: 'lain',
  'elfen lied': 'elfen-lied',
  'cory en la casa': 'cory-en-la-casa',
  'high school dxd': 'high-school-dxd',
  'highschool dxd': 'high-school-dxd',
  durarara: 'durarara',
  baccano: 'baccano',
  noragami: 'noragami',
  'kino journey': 'kino-no-tabi',
  'kino no tabi': 'kino-no-tabi',
  mushishi: 'mushishi',
  'natsume book of friends': 'natsume-yuujinchou',
  'natsume yuujinchou': 'natsume-yuujinchou',
  'akame ga kill': 'akame-ga-kill',
  'kill la kill': 'kill-la-kill',
  'sword art online gun gale': 'sword-art-online-ggo',
  'sword art online alicization war of underworld': 'sword-art-online-alicization-2',
  'fairy tail 2': 'fairy-tail-2',
  'fairy tail 3': 'fairy-tail-3',
  'haikyuu 2': 'haikyuu-2',
  'haikyuu 3': 'haikyuu-3',
  'haikyuu 4': 'haikyuu-4',
  'kuroko no basket 2': 'kuroko-no-basket-2',
  'kuroko no basket 3': 'kuroko-no-basket-3',
  'black clover movie': 'black-clover-movie',
  'dragon ball super hero': 'dragon-ball-super-hero',
  'dragon ball super movie': 'dragon-ball-super-hero',
  'one piece film red': 'one-piece-film-red',
  'one piece stampede': 'one-piece-stampede',
  'jujutsu kaisen movie': 'jujutsu-kaisen-0',
  'demon slayer movie': 'kimetsu-no-yaiba-movie',
  'demon slayer mugen train': 'kimetsu-no-yaiba-movie',
  'kimetsu no yaiba movie': 'kimetsu-no-yaiba-movie',
  'frieren journey': 'sousou-no-frieren',
}

export function getSlug(title) {
  if (!title) return ''
  const key = title.toLowerCase().trim()
  if (SLUG_OVERRIDES[key]) return SLUG_OVERRIDES[key]
  return slugify(key)
}

async function trySlug(slug) {
  if (slugCache.has(slug)) return slugCache.get(slug)
  const data = await fetchJSON(`${ANIMEFLV_API}/anime/${slug}`)
  if (data?.success) {
    slugCache.set(slug, data.data)
    return data.data
  }
  slugCache.set(slug, null)
  return null
}

function getSlugVariants(slug, originalTitle) {
  const variants = [slug]
  const lowered = originalTitle?.toLowerCase() || ''

  if (!slug.endsWith('-tv') && !slug.endsWith('-hd')) {
    variants.push(`${slug}-tv`)
    variants.push(`${slug}-hd`)
  }
  if (slug.endsWith('-tv')) {
    variants.push(slug.replace(/-tv$/, ''))
  }
  if (slug.endsWith('-hd')) {
    variants.push(slug.replace(/-hd$/, ''))
  }

  if (lowered.includes('tv') && !slug.includes('-tv')) {
    variants.push(`${slug}-tv`)
  }

  return [...new Set(variants)]
}

export async function getSpanishMetadata(anilistTitle) {
  const romaji = anilistTitle?.romaji || anilistTitle?.english || ''
  if (!romaji) return null

  const slug = getSlug(romaji)
  let data = await trySlug(slug)
  if (data) return { ...data, slug }

  const variants = getSlugVariants(slug, romaji)
  for (const v of variants) {
    if (v === slug) continue
    data = await trySlug(v)
    if (data) return { ...data, slug: v }
  }

  return null
}
