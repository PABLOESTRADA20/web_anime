export type AudioType = 'sub' | 'dub' | 'latam'

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
  latency?: number
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spanishInfo?: Record<string, any>
}

export interface HealthStatus {
  available: boolean
  latency: number
  lastCheck: number
  errorRate: number
}

export interface ProviderAdapter {
  name: string
  label: string
  supportedAudio: AudioType[]
  priority: number
  getEpisodes(anilistId: number | string, audio?: AudioType): Promise<EpisodeResult | null>
  getWatch(anilistId: number | string, epNum: number, audio: AudioType, signal?: AbortSignal): Promise<ProviderResult | null>
  healthCheck(): Promise<HealthStatus>
}

export interface AudioOption {
  label: string
  value: AudioType
  flag: string
  available: boolean
  error: string | null
  provider: string | null
}

export interface ProviderStats {
  name: string
  success: number
  fail: number
  avgLatency: number
  lastCheck: number
  available: boolean
}
