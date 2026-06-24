import { describe, it, expect, beforeEach } from 'vitest'
import { getCached, setCache, clearCache } from './cache'

const storage = new Map()

globalThis.localStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => storage.set(k, v),
  removeItem: (k) => storage.delete(k),
  get length() {
    return storage.size
  },
  key: (i) => [...storage.keys()][i] ?? null,
  clear: () => storage.clear(),
}

beforeEach(() => {
  storage.clear()
})

describe('setCache / getCached', () => {
  it('guarda y recupera datos', () => {
    setCache('key1', { foo: 'bar' })
    expect(getCached('key1')).toEqual({ foo: 'bar' })
  })

  it('retorna null para clave inexistente', () => {
    expect(getCached('noexiste')).toBeNull()
  })

  it('usa stores diferentes', () => {
    setCache('a', 'data-a', 'provider')
    setCache('b', 'data-b', 'anilist')
    expect(getCached('a', 'provider')).toBe('data-a')
    expect(getCached('b', 'anilist')).toBe('data-b')
  })

  it('no mezcla memo cache entre stores con misma clave', () => {
    setCache('x', 'provider-val', 'provider')
    setCache('x', 'anilist-val', 'anilist')
    expect(getCached('x', 'provider')).toBe('provider-val')
    expect(getCached('x', 'anilist')).toBe('anilist-val')
  })

  it('retorna null después de expirar', async () => {
    setCache('expire', 'soon', 'provider') // provider TTL = 30s
    // Simular tiempo futuro (TTL de provider es 30s)
    const future = Date.now() + 31000
    const orig = Date.now
    Date.now = () => future
    expect(getCached('expire', 'provider')).toBeNull()
    Date.now = orig
  })
})

describe('clearCache', () => {
  it('limpia todo cuando no se especifica store', () => {
    setCache('a', 1)
    setCache('b', 2, 'mangadex')
    clearCache()
    expect(getCached('a')).toBeNull()
    expect(getCached('b', 'mangadex')).toBeNull()
  })

  it('limpia solo un store específico', () => {
    setCache('a', 1)
    setCache('b', 2, 'mangadex')
    clearCache('anilist')
    expect(getCached('a')).toBeNull()
    expect(getCached('b', 'mangadex')).toEqual(2)
  })
})
