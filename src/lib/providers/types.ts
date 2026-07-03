export interface ProviderSource {
  url: string
  quality?: string
  server?: string
  referer?: string
  type?: string
}

export interface ProviderSubtitle {
  file: string
  label: string
  language: string
  referer?: string
}

export interface ProviderResult {
  sources: ProviderSource[]
  subtitles: ProviderSubtitle[]
  downloads?: ProviderSource[]
  audioLang?: string | null
  audioType: string
  provider: string
  backend: string
}

export interface ProviderEpisode {
  number: number
  title: string
  episodeId: string
  image?: string
  duration?: number
}

export interface EpisodeResult {
  providerEpisodes: ProviderEpisode[]
  dubEpisodes?: ProviderEpisode[]
  provider?: string | null
  spanishInfo?: Record<string, any>
}

export interface ProviderAdapter {
  name: string
  label: string
  backend: string
  supportedAudio: string[]
  getWatch(_anilistId: number | string, _epNum: number, _audio: string, _signal?: AbortSignal): Promise<ProviderResult>
  getEpisodes?(_anilistId: number | string, _audio?: string): Promise<EpisodeResult | null>
}
