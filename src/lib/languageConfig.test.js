import { describe, it, expect } from 'vitest'
import { LANGUAGES, MIRURO_PROVIDERS, ANIVEXA_PROVIDERS, getProviderLabel, getLanguageInfo } from './languageConfig'

describe('LANGUAGES', () => {
  it('tiene configuración para sub', () => {
    expect(LANGUAGES.sub.label).toBe('SUB')
    expect(LANGUAGES.sub.providerPriority.length).toBeGreaterThan(0)
  })
  it('tiene configuración para dub', () => {
    expect(LANGUAGES.dub.label).toBe('DUB')
  })
  it('tiene configuración para latam', () => {
    expect(LANGUAGES.latam.label).toBe('LATAM')
  })
})

describe('MIRURO_PROVIDERS', () => {
  it('contiene proveedores miruro esperados', () => {
    expect(MIRURO_PROVIDERS).toContain('kiwi')
    expect(MIRURO_PROVIDERS).toContain('pewe')
    expect(MIRURO_PROVIDERS).not.toContain('anikoto')
  })
})

describe('ANIVEXA_PROVIDERS', () => {
  it('contiene proveedores anivexa esperados', () => {
    expect(ANIVEXA_PROVIDERS).toContain('anikoto')
    expect(ANIVEXA_PROVIDERS).toContain('animepahe')
    expect(ANIVEXA_PROVIDERS).not.toContain('kiwi')
  })
})

describe('getProviderLabel', () => {
  it('retorna label conocido', () => {
    expect(getProviderLabel('kenjitsu')).toBe('Animepahe')
    expect(getProviderLabel('animeflv')).toBe('AnimeFLV')
    expect(getProviderLabel('anikoto')).toBe('Anikoto')
  })
  it('fallback al provider si no está mapeado', () => {
    expect(getProviderLabel('unknown')).toBe('unknown')
  })
})

describe('getLanguageInfo', () => {
  it('retorna info para audio conocido', () => {
    const info = getLanguageInfo('latam')
    expect(info.label).toBe('LATAM')
    expect(info.anivexaVersion).toBe('dub')
  })
  it('fallback a sub para audio desconocido', () => {
    const info = getLanguageInfo('xyz')
    expect(info.label).toBe('SUB')
  })
})
