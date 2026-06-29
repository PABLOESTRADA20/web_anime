import { describe, it, expect } from 'vitest'
import { tryProviders, getProviderNames } from './registry'

describe('registry', () => {
  describe('getProviderNames', () => {
    it('retorna lista de providers', () => {
      const names = getProviderNames()
      expect(Array.isArray(names)).toBe(true)
      expect(names.length).toBeGreaterThanOrEqual(2)
      expect(names).toContain('readnovelfull')
      expect(names).toContain('novelbuddy')
    })
  })

  describe('tryProviders', () => {
    it('encuentra resultados de búsqueda con fallback', async () => {
      const results = await tryProviders('search', { q: 'Solo Leveling' })
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results._source).toBeTruthy()
    })

    it('retorna info con source especificado', async () => {
      const info = await tryProviders('info', { slug: 'only-i-level-up', source: 'readnovelfull' })
      expect(info.title).toBeTruthy()
      expect(info._source).toBe('readnovelfull')
    })

    it('retorna info con source novelbuddy', async () => {
      const info = await tryProviders('info', { slug: 'only-i-level-up', source: 'novelbuddy' })
      expect(info.title).toBeTruthy()
      expect(info._source).toBe('novelbuddy')
    })

    it('lanza error para source desconocido', async () => {
      await expect(tryProviders('info', { slug: 'only-i-level-up', source: 'unknown-source-123' })).rejects.toThrow(/Fuente desconocida/)
    })

    it('lanza error para acción inválida', async () => {
      await expect(tryProviders('invalidAction', { slug: 'only-i-level-up', source: 'readnovelfull' })).rejects.toThrow(
        /Acción no soportada/,
      )
    })
  })
})
