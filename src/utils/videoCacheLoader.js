const VIDEO_CACHE = 'animeverse-video-v1'
const LOAD_TIMEOUT = 15000

export class VideoCacheLoader {
  constructor(config) {
    this.config = config
    this._aborted = false
    this._timer = null
  }

  async load(context, conf, callbacks) {
    if (this._aborted) return

    const { url, type } = context

    if (type === 'manifest' || type === 'level') {
      const cache = await caches.open(VIDEO_CACHE)
      const cached = await cache.match(url)
      if (cached) {
        const text = await cached.text()
        this._resolve(callbacks, text, url)
        return
      }
    }

    if (type === 'frag' || type === 'audiovideo') {
      const cache = await caches.open(VIDEO_CACHE)
      const cached = await cache.match(url)
      if (cached) {
        const buf = await cached.arrayBuffer()
        this._resolve(callbacks, buf, url, buf.byteLength)
        return
      }
    }

    this._fetchFallback(url, callbacks)
  }

  _resolve(callbacks, data, url, loaded) {
    const stats = {
      trequest: performance.now(),
      tfirst: performance.now(),
      tload: performance.now(),
      loaded: loaded || (typeof data === 'string' ? data.length : data.byteLength),
      total: loaded || (typeof data === 'string' ? data.length : data.byteLength),
    }
    callbacks.onSuccess({ url, data }, stats, { type: 'frag', url }, null)
  }

  async _fetchFallback(url, callbacks) {
    try {
      const controller = new AbortController()
      this._timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(this._timer)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const isText = url.includes('.m3u8') || url.includes('.vtt')
      const data = isText ? await res.text() : await res.arrayBuffer()
      const stats = {
        trequest: performance.now(),
        tfirst: performance.now(),
        tload: performance.now(),
        loaded: isText ? data.length : data.byteLength,
        total: isText ? data.length : data.byteLength,
      }
      callbacks.onSuccess({ url, data }, stats, { type: 'frag', url }, null)
    } catch (e) {
      callbacks.onError({ code: 0, text: e.message }, { type: 'frag', url }, null, { trequest: 0, tfirst: 0, tload: 0, loaded: 0, total: 0 })
    }
  }

  abort() {
    this._aborted = true
    if (this._timer) clearTimeout(this._timer)
  }

  destroy() {
    this._aborted = true
    if (this._timer) clearTimeout(this._timer)
  }
}
