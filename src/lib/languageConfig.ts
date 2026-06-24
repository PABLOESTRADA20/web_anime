export interface LanguageConfig {
  label: string
  description: string
  icon: string
  providerPriority: string[]
  backend: string
  anivexaVersion: string
}

export const LANGUAGES: Record<string, LanguageConfig> = {
  sub: {
    label: 'SUB',
    description: 'Subtitulado',
    icon: '💬',
    providerPriority: [
      'kiwi',
      'pewe',
      'moo',
      'bee',
      'hop',
      'bonk',
      'ally',
      'nun',
      'twin',
      'cog',
      'bun',
      'telli',
      'anikoto',
      'reanime',
      'allmanga',
      'animegg',
      'anineko',
      'anidbapp',
      'animepahe',
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
      'kiwi',
      'pewe',
      'moo',
      'bee',
      'hop',
      'bonk',
      'ally',
      'nun',
      'twin',
      'cog',
      'bun',
      'telli',
      'anikoto',
      'reanime',
      'allmanga',
      'animegg',
      'anineko',
      'anidbapp',
      'animepahe',
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
      'kiwi',
      'pewe',
      'moo',
      'bee',
      'hop',
      'bonk',
      'ally',
      'nun',
      'twin',
      'cog',
      'bun',
      'telli',
      'anidbapp',
      'animepahe',
      'anikoto',
      'reanime',
      'allmanga',
      'animegg',
      'anineko',
    ],
    backend: 'latam',
    anivexaVersion: 'dub',
  },
}

export const MIRURO_PROVIDERS = ['kiwi', 'pewe', 'moo', 'bee', 'hop', 'bonk', 'ally', 'nun', 'twin', 'cog', 'bun', 'telli']

export const ANIVEXA_PROVIDERS = ['anikoto', 'reanime', 'allmanga', 'animegg', 'anineko', 'anidbapp', 'animepahe']

const LABELS: Record<string, string> = {
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

export function getProviderLabel(provider: string): string {
  return LABELS[provider] || provider
}

export function getLanguageInfo(audio: string): LanguageConfig {
  return LANGUAGES[audio] || LANGUAGES.sub
}
