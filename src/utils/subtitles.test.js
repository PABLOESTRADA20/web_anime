import { describe, it, expect } from 'vitest'
import { subtitleLangLabel, subtitleSrcLang, isCloudflareBlock, isLikelySubtitle, isSpanishSub, getSubtitleInfo } from './subtitles'

describe('subtitleLangLabel', () => {
  it('detecta español por language code', () => {
    expect(subtitleLangLabel({ language: 'es' })).toBe('Español')
  })
  it('detecta español por label', () => {
    expect(subtitleLangLabel({ label: 'Spanish' })).toBe('Español')
    expect(subtitleLangLabel({ label: 'Español' })).toBe('Español')
    expect(subtitleLangLabel({ label: 'Latino' })).toBe('Español')
  })
  it('detecta inglés', () => {
    expect(subtitleLangLabel({ language: 'en' })).toBe('English')
    expect(subtitleLangLabel({ label: 'English' })).toBe('English')
  })
  it('detecta japonés', () => {
    expect(subtitleLangLabel({ language: 'ja' })).toBe('日本語')
    expect(subtitleLangLabel({ label: '日本語' })).toBe('日本語')
  })
  it('fallback a label si no hay match', () => {
    expect(subtitleLangLabel({ label: 'Unknown', index: 3 })).toBe('Unknown')
  })
  it('fallback genérico si no hay nada', () => {
    expect(subtitleLangLabel({ index: 0 })).toBe('Track 0')
  })
})

describe('subtitleSrcLang', () => {
  it('usa language si existe', () => {
    expect(subtitleSrcLang({ language: 'fr' })).toBe('fr')
  })
  it('detecta español por patrón', () => {
    expect(subtitleSrcLang({ label: 'Spanish' })).toBe('es')
  })
  it('fallback a en', () => {
    expect(subtitleSrcLang({ label: 'xyz' })).toBe('en')
  })
})

describe('isCloudflareBlock', () => {
  it('detecta cf-browser-verification', () => {
    expect(isCloudflareBlock('cf-browser-verification')).toBe(true)
  })
  it('detecta __cf_chl_', () => {
    expect(isCloudflareBlock('__cf_chl_foo')).toBe(true)
  })
  it('detecta Just a moment', () => {
    expect(isCloudflareBlock('Just a moment...')).toBe(true)
  })
  it('retorna false para VTT normal', () => {
    expect(isCloudflareBlock('WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nHola')).toBe(false)
  })
})

describe('isLikelySubtitle', () => {
  it('detecta WEBVTT header', () => {
    expect(isLikelySubtitle('WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nHola')).toBe(true)
  })
  it('detecta timestamp pattern', () => {
    expect(isLikelySubtitle('00:00:01.000 --> 00:00:04.000\nHola')).toBe(true)
  })
  it('rechaza HTML', () => {
    expect(isLikelySubtitle('<!DOCTYPE html><html>')).toBe(false)
  })
})

describe('isSpanishSub', () => {
  it('detecta por language code es', () => {
    expect(isSpanishSub({ language: 'es' })).toBe(true)
  })
  it('detecta por language code spa', () => {
    expect(isSpanishSub({ language: 'spa' })).toBe(true)
  })
  it('detecta por label', () => {
    expect(isSpanishSub({ label: 'Spanish' })).toBe(true)
    expect(isSpanishSub({ label: 'Español' })).toBe(true)
    expect(isSpanishSub({ label: 'Castellano' })).toBe(true)
  })
  it('detecta por file path', () => {
    expect(isSpanishSub({ file: 'es.vtt' })).toBe(true)
    expect(isSpanishSub({ file: 'spanish.vtt' })).toBe(true)
    expect(isSpanishSub({ file: 'spa-01.vtt' })).toBe(true)
  })
  it('retorna false para inglés', () => {
    expect(isSpanishSub({ language: 'en', label: 'English' })).toBe(false)
  })
})

describe('getSubtitleInfo', () => {
  it('retorna info completa', () => {
    const info = getSubtitleInfo({ language: 'es', label: 'Spanish', file: 'es.vtt' })
    expect(info.label).toBe('Español')
    expect(info.srcLang).toBe('es')
    expect(info.isSpanish).toBe(true)
    expect(info.file).toBe('es.vtt')
  })
})
