import { getCached, setCache } from '../lib/cache'
import { AllProvidersFailedError } from './errors'
import { getRecentLogs } from './BaseAdapter'
import AnivexaAdapter from './adapters/AnivexaAdapter'
import { TioAnimeAdapter, MonosChinosAdapter } from './adapters/JimovAdapter'
import JKanimeAdapter from './adapters/JKanimeAdapter'

const HEALTH_CHECK_INTERVAL = 300000

export default class ProviderManager {
  constructor() {
    this.adapters = []
    this._healthTimers = new Map()
    this._initialized = false
  }

  register(adapter) {
    this.adapters.push(adapter)
    return this
  }

  registerAll(adapters) {
    for (const a of adapters) this.register(a)
    return this
  }

  init() {
    if (this._initialized) return
    this._initialized = true

    this.registerAll([new AnivexaAdapter(), new TioAnimeAdapter(), new MonosChinosAdapter(), new JKanimeAdapter()])

    this._startHealthChecks()
    return this
  }

  _startHealthChecks() {
    const run = async () => {
      for (const a of this.adapters) {
        if (this._healthTimers.get(a.name) === 'running') continue
        this._healthTimers.set(a.name, 'running')
        try {
          const status = await a.healthCheck()
          a._stats.available = status.available
          a._stats.lastCheck = status.lastCheck
        } catch {
          a._stats.available = false
        }
        this._healthTimers.set(a.name, 'idle')
      }
    }
    run()
    setInterval(run, HEALTH_CHECK_INTERVAL)
  }

  getAdapter(name) {
    return this.adapters.find((a) => a.name === name) || null
  }

  _getSortedAdapters(audio) {
    return this.adapters
      .filter((a) => a.supportedAudio.includes(audio || 'sub'))
      .sort((a, b) => {
        if (a._stats.available !== b._stats.available) return a._stats.available ? -1 : 1
        return a.priority - b.priority
      })
  }

  async getEpisodes(anilistId, audio = 'sub') {
    const cacheKey = `episodes:all:${anilistId}:${audio}`
    const cached = getCached(cacheKey, 'provider')
    if (cached) return cached

    for (const adapter of this._getSortedAdapters(audio)) {
      if (!adapter._stats.available) continue
      try {
        const result = await adapter.getEpisodes(anilistId, audio)
        if (result?.providerEpisodes?.length) {
          setCache(cacheKey, result, 'provider')
          return result
        }
      } catch (e) {
        adapter.log('warn', `getEpisodes falló para ${anilistId}`, { error: e.message })
      }
    }

    return { providerEpisodes: [], dubEpisodes: [], provider: null }
  }

  async getWatch(anilistId, epNum, audio = 'sub') {
    const errors = []

    for (const adapter of this._getSortedAdapters(audio)) {
      if (!adapter._stats.available) {
        errors.push({ provider: adapter.name, backend: adapter.backend, message: 'health check fail' })
        continue
      }
      try {
        const result = await adapter.getWatch(anilistId, epNum, audio)
        if (result?.sources?.length) {
          return { ...result, audioType: result.audioType || audio }
        }
        errors.push({ provider: adapter.name, backend: adapter.backend, message: 'sin fuentes' })
      } catch (e) {
        errors.push({ provider: adapter.name, backend: adapter.backend, message: e.message })
      }
    }

    throw new AllProvidersFailedError(errors, anilistId, epNum)
  }

  async detectAudio(anilistId, t) {
    const results = {
      japanese: { label: t('audio.japanese'), value: 'sub', flag: 'JP', available: false, error: null, provider: null },
      english: { label: t('audio.english'), value: 'dub', flag: 'US', available: false, error: null, provider: null },
      spanish: { label: t('audio.spanish'), value: 'latam', flag: 'MX', available: false, error: null, provider: null },
    }

    const checks = this.adapters.map(async (adapter) => {
      if (!adapter._stats.available) return
      try {
        if (adapter.supportedAudio.includes('sub')) {
          const eps = await adapter.getEpisodes(anilistId)
          if (eps?.providerEpisodes?.length) {
            results.japanese.available = true
            results.japanese.provider = adapter.label
          }
        }
        if (adapter.supportedAudio.includes('dub')) {
          const eps = await adapter.getEpisodes(anilistId)
          if (eps?.dubEpisodes?.length) {
            results.english.available = true
            results.english.provider = adapter.label
          }
        }
        if (adapter.supportedAudio.includes('latam')) {
          const eps = await adapter.getEpisodes(anilistId)
          if (eps?.providerEpisodes?.length) {
            results.spanish.available = true
            results.spanish.provider = adapter.label
          }
        }
      } catch {
        /* ignore */
      }
    })

    await Promise.allSettled(checks)

    if (!results.japanese.available) results.japanese.error = t('audio.noJapanese')
    if (!results.english.available) results.english.error = t('audio.noEnglish')
    if (!results.spanish.available) results.spanish.error = t('audio.noSpanish')

    return results
  }

  async forceHealthCheck() {
    const results = []
    for (const a of this.adapters) {
      const status = await a.healthCheck()
      a._stats.available = status.available
      a._stats.lastCheck = status.lastCheck
      results.push({ name: a.name, ...status })
    }
    return results
  }

  getAllStats() {
    return this.adapters.map((a) => a.stats)
  }

  getLogs(limit = 50) {
    return getRecentLogs(limit)
  }
}

export const providerManager = new ProviderManager()
