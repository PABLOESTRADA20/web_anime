export const LANGUAGES = {
  sub: {
    label: 'SUB',
    description: 'Subtitulado',
    icon: '💬',
    providerPriority: [
      'kiwi', 'pewe', 'moo', 'bee', 'hop', 'bonk', 'ally', 'nun', 'twin', 'cog', 'bun', 'telli',
      'anikoto', 'reanime', 'allmanga', 'animegg', 'anineko', 'anidbapp', 'animepahe',
      'kenjitsu',
    ],
    backend: 'sub',
    anivexaVersion: 'sub',
  },
  dub: {
    label: 'DUB',
    description: 'Doblaje (Inglés/otros)',
    icon: '🎙️',
    providerPriority: [
      'kiwi', 'pewe', 'moo', 'bee', 'hop', 'bonk', 'ally', 'nun', 'twin', 'cog', 'bun', 'telli',
      'anikoto', 'reanime', 'allmanga', 'animegg', 'anineko', 'anidbapp', 'animepahe',
      'kenjitsu',
    ],
    backend: 'dub',
    anivexaVersion: 'dub',
  },
  latam: {
    label: 'LATAM',
    description: 'Español Latino',
    icon: '🌎',
    providerPriority: [
      'animeflv',
      'kiwi', 'pewe', 'moo', 'bee', 'hop', 'bonk', 'ally', 'nun', 'twin', 'cog', 'bun', 'telli',
      'anidbapp', 'animepahe',
      'anikoto', 'reanime', 'allmanga', 'animegg', 'anineko',
    ],
    backend: 'latam',
    anivexaVersion: 'dub',
  },
}

export const MIRURO_PROVIDERS = ['kiwi', 'pewe', 'moo', 'bee', 'hop', 'bonk', 'ally', 'nun', 'twin', 'cog', 'bun', 'telli']

export const ANIVEXA_PROVIDERS = ['anikoto', 'reanime', 'allmanga', 'animegg', 'anineko', 'anidbapp', 'animepahe']

export function getProviderLabel(provider) {
  const labels = {
    kenjitsu: 'Animepahe',
    animeflv: 'AnimeFLV',
    veranime: 'VerAnime',
    anikoto: 'Anikoto',
    reanime: 'Reanime',
    allmanga: 'AllManga',
    animegg: 'AnimeGG',
    anineko: 'Anineko',
    anidbapp: 'AnidbApp',
    animepahe: 'AnimePahe',
    kiwi: 'Kiwi',
    pewe: 'Pewe',
    moo: 'Moo',
    bee: 'Bee',
    hop: 'Hop',
    bonk: 'Bonk',
    ally: 'Ally',
    nun: 'Nun',
    twin: 'Twin',
    cog: 'Cog',
    bun: 'Bun',
    telli: 'Telli',
  }
  return labels[provider] || provider
}

export function getLanguageInfo(audio) {
  return LANGUAGES[audio] || LANGUAGES.sub
}
