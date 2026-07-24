import BaseAdapter from '../BaseAdapter'
import { isSpanishSub } from '../../utils/subtitles'
import {
  getEpisodes as anivexaGetEpisodes,
  getWatch as anivexaGetWatch,
  getBestProvider,
  getEpisodeList,
  normalizeStreams,
} from '../../lib/anivexa'

const PRIORITY = ['allmanga', 'anikoto', 'animegg', 'anineko', 'reanime', 'anidbapp', 'animepahe']

export default class AnivexaAdapter extends BaseAdapter {
  constructor() {
    super({
      name: 'anivexa',
      label: 'Anivexa',
      backend: 'anivexa',
      supportedAudio: ['sub', 'dub'],
      priority: 1,
      cacheTtl: 30000,
      maxRetries: 1,
      timeout: 8000,
    })
  }

  async _healthCheckImpl() {
    const data = await anivexaGetEpisodes(1)
    return !!data
  }

  async getEpisodes(anilistId) {
    return this._withRetry(async () => {
      const data = await anivexaGetEpisodes(anilistId)
      if (!data) return null
      const provider = getBestProvider(data)
      if (!provider) return null
      const sub = getEpisodeList(data, provider, 'sub')
      const dub = getEpisodeList(data, provider, 'dub')
      if (!sub.length) return null
      return { providerEpisodes: sub, dubEpisodes: dub, provider }
    }, `episodes:anivexa:${anilistId}`)
  }

  async getWatch(anilistId, epNum, audio, signal) {
    const dubAudio = audio === 'latam' ? 'dub' : audio
    const errors = []

    for (const p of PRIORITY) {
      try {
        const result = await this._withRetry(async () => {
          const data = await anivexaGetWatch(anilistId, p, epNum, dubAudio, signal)
          if (!data) throw new Error(`${p}: sin datos`)
          const { sources, subtitles, downloads, audioLang } = normalizeStreams(data)
          if (!sources?.length) throw new Error(`${p}: sin fuentes`)
          const audioType = audio === 'latam' ? 'latam' : audio
          return { sources, subtitles, downloads, audioLang, provider: p, backend: 'anivexa', audioType }
        }, `watch:anivexa:${anilistId}:${p}:${epNum}:${dubAudio}`)

        if (!result.subtitles.some(isSpanishSub)) {
          const esSubs = await this._findSpanishSubs(anilistId, epNum, signal)
          if (esSubs.length > 0) {
            const existing = result.subtitles.filter((s) => !isSpanishSub(s))
            result.subtitles = [...esSubs, ...existing]
          }
        }
        return result
      } catch (e) {
        errors.push({ provider: p, message: e.message })
      }
    }

    return null
  }

  async _findSpanishSubs(anilistId, epNum, signal) {
    const providers = PRIORITY.filter((p) => p !== 'animepahe')
    for (const p of providers) {
      try {
        const data = await anivexaGetWatch(anilistId, p, epNum, 'sub', signal)
        const { subtitles } = normalizeStreams(data)
        const es = subtitles.find(isSpanishSub)
        if (es) return [es]
      } catch {
        /* skip */
      }
    }
    return []
  }
}
