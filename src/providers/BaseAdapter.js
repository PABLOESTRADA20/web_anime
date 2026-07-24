import { ProviderError, ProviderTimeoutError } from './errors'
import { getCached, setCache } from '../lib/cache'

const DEFAULT_TIMEOUT = 10000
const MAX_RETRIES = 2
const BASE_DELAY = 1000
const HTTP_ERROR_RE = /error (4\d\d|5\d\d)/

let adapterLogs = []

export function getRecentLogs(limit = 50) {
  return adapterLogs.slice(-limit)
}

function log(level, adapter, msg, data) {
  const entry = { level, adapter, msg, data, time: Date.now() }
  adapterLogs.push(entry)
  if (adapterLogs.length > 200) adapterLogs = adapterLogs.slice(-200)
  if (level === 'error') console.error(`[${adapter}] ${msg}`, data)
  else if (level === 'warn') console.warn(`[${adapter}] ${msg}`, data)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export default class BaseAdapter {
  constructor(config) {
    this.name = config.name
    this.label = config.label || config.name
    this.supportedAudio = config.supportedAudio || ['sub']
    this.priority = config.priority || 10
    this.backend = config.backend || config.name
    this.timeout = config.timeout || DEFAULT_TIMEOUT
    this.maxRetries = config.maxRetries ?? MAX_RETRIES
    this.cacheTtl = config.cacheTtl || 30000
    this._stats = { success: 0, fail: 0, avgLatency: 0, lastCheck: 0, available: true }
  }

  get stats() {
    return { ...this._stats, name: this.name }
  }

  _recordSuccess(latency) {
    const s = this._stats
    s.success++
    s.avgLatency = s.avgLatency ? (s.avgLatency * (s.success - 1) + latency) / s.success : latency
    s.lastCheck = Date.now()
    s.available = true
  }

  _recordFail() {
    const s = this._stats
    s.fail++
    s.lastCheck = Date.now()
    if (s.fail > 3 && s.success === 0) s.available = false
  }

  async _fetchWithTimeout(url, options = {}, signal) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)
    const combinedSignal = signal ? this._combineSignals(signal, controller.signal) : controller.signal
    try {
      const res = await fetch(url, { ...options, signal: combinedSignal })
      return res
    } finally {
      clearTimeout(timeoutId)
    }
  }

  _combineSignals(...signals) {
    const controller = new AbortController()
    for (const sig of signals) {
      if (sig.aborted) {
        controller.abort(sig.reason)
        return controller.signal
      }
      sig.addEventListener('abort', () => controller.abort(sig.reason), { once: true })
    }
    return controller.signal
  }

  async _withRetry(fn, cacheKey) {
    if (cacheKey) {
      const cached = getCached(cacheKey, 'provider')
      if (cached) return cached
    }

    let lastError
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const start = performance.now()
        const result = await fn()
        const latency = performance.now() - start
        this._recordSuccess(latency)
        log('info', this.name, `OK (${latency.toFixed(0)}ms)`, { attempt })

        if (cacheKey && result) setCache(cacheKey, result, 'provider')
        return result
      } catch (e) {
        lastError = e
        this._recordFail()
        log('warn', this.name, `intento ${attempt + 1}/${this.maxRetries + 1} falló`, { error: e.message })

        if (e.name === 'AbortError') {
          throw new ProviderTimeoutError(this.name, this.backend, this.timeout)
        }

        if (HTTP_ERROR_RE.test(e.message)) {
          throw new ProviderError(`HTTP error definitivo: ${e.message}`, this.name, this.backend, e)
        }

        if (attempt < this.maxRetries) {
          const delay = BASE_DELAY * Math.pow(2, attempt) + Math.random() * 500
          await sleep(delay)
        }
      }
    }

    throw new ProviderError(`Falló tras ${this.maxRetries + 1} intentos: ${lastError.message}`, this.name, this.backend, lastError)
  }

  log(level, msg, data) {
    log(level, this.name, msg, data)
  }

  async healthCheck() {
    const start = performance.now()
    try {
      const ok = await this._healthCheckImpl()
      const latency = performance.now() - start
      log('info', this.name, `health check: ${ok ? 'OK' : 'FAIL'} (${latency.toFixed(0)}ms)`)
      return { available: ok, latency, lastCheck: Date.now(), errorRate: this._stats.fail / (this._stats.success + this._stats.fail || 1) }
    } catch (e) {
      log('error', this.name, 'health check error', { error: e.message })
      return { available: false, latency: 0, lastCheck: Date.now(), errorRate: 1 }
    }
  }

  async _healthCheckImpl() {
    return true
  }

  async getEpisodes() {
    throw new Error(`${this.name}: getEpisodes not implemented`)
  }

  async getWatch() {
    throw new Error(`${this.name}: getWatch not implemented`)
  }
}
