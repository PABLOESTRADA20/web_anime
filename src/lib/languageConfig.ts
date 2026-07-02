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
    providerPriority: ['allmanga', 'anikoto', 'animegg', 'anineko', 'reanime', 'consumet', 'anidbapp', 'animepahe', 'kenjitsu'],
    backend: 'sub',
    anivexaVersion: 'sub',
  },
  dub: {
    label: 'DUB',
    description: 'Doblaje (Inglés/otros)',
    icon: '🎙️',
    providerPriority: ['allmanga', 'anikoto', 'animegg', 'anineko', 'reanime', 'consumet', 'anidbapp', 'animepahe', 'kenjitsu'],
    backend: 'dub',
    anivexaVersion: 'dub',
  },
  latam: {
    label: 'LATAM',
    description: 'Español Latino',
    icon: '🌎',
    providerPriority: [
      'tioanime',
      'monoschinos',
      'consumet',
      'allmanga',
      'anikoto',
      'animegg',
      'anineko',
      'reanime',
      'anidbapp',
      'animepahe',
      'kenjitsu',
    ],
    backend: 'latam',
    anivexaVersion: 'dub',
  },
}

export const MIRURO_PROVIDERS = ['kiwi', 'pewe', 'moo', 'bee', 'hop', 'bonk', 'ally', 'nun', 'twin', 'cog', 'bun', 'telli']

export const ANIVEXA_PROVIDERS = ['allmanga', 'anikoto', 'animegg', 'anineko', 'reanime', 'anidbapp', 'animepahe']

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
  consumet: 'Consumet',
  tioanime: 'TioAnime',
  monoschinos: 'MonosChinos',
}

export function getProviderLabel(provider: string): string {
  return LABELS[provider] || provider
}

export function getLanguageInfo(audio: string): LanguageConfig {
  return LANGUAGES[audio] || LANGUAGES.sub
}
