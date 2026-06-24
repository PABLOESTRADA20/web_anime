import { describe, it, expect } from 'vitest'
import { normalizeStreams } from './anivexa'

describe('normalizeStreams', () => {
  it('retorna vacío si no hay datos', () => {
    expect(normalizeStreams(null)).toEqual({ sources: [], subtitles: [], audioLang: null })
    expect(normalizeStreams(undefined)).toEqual({ sources: [], subtitles: [], audioLang: null })
  })

  it('extrae streams y subs de ssub', () => {
    const input = {
      ssub: {
        streams: [
          { url: 'https://cdn.com/video.m3u8', type: 'hls', quality: '1080p', server: 'srv1' },
          { url: 'https://cdn.com/video.mp4', type: 'mp4', quality: '720p', server: 'srv1' },
        ],
        subtitles: [
          { file: 'https://cdn.com/es.vtt', language: 'es', label: 'Spanish' },
          { file: 'https://cdn.com/en.vtt', language: 'en', label: 'English' },
        ],
      },
    }
    const result = normalizeStreams(input)
    expect(result.sources).toHaveLength(2)
    expect(result.sources[0].url).toContain('.m3u8')
    expect(result.sources[1].url).toContain('.mp4')
    expect(result.subtitles).toHaveLength(2)
    expect(result.subtitles[0].language).toBe('es')
  })

  it('filtra streams no-hls/no-mp4 de ssub', () => {
    const input = {
      ssub: {
        streams: [
          { url: 'https://cdn.com/video.m3u8', type: 'hls' },
          { url: 'https://cdn.com/video.dash', type: 'dash' },
          { url: 'https://cdn.com/something', type: 'other' },
        ],
        subtitles: [],
      },
    }
    const result = normalizeStreams(input)
    expect(result.sources).toHaveLength(1)
    expect(result.sources[0].type).toBe('hls')
  })

  it('extrae streams y subs de watchData.streams', () => {
    const input = {
      streams: [
        { url: 'https://cdn.com/video.m3u8', type: 'hls', quality: '1080p' },
        { url: 'https://cdn.com/video.m3u8', type: 'hls-redirect', quality: '720p' },
      ],
      subtitles: [{ file: 'https://cdn.com/spa-01.vtt', language: 'spa', label: 'Spanish (Latin America)' }],
    }
    const result = normalizeStreams(input)
    expect(result.sources).toHaveLength(2)
    expect(result.subtitles).toHaveLength(1)
    expect(result.subtitles[0].language).toBe('spa')
  })

  it('filtra streams inactivos de watchData.streams', () => {
    const input = {
      streams: [
        { url: 'https://cdn.com/active.m3u8', type: 'hls', isActive: true },
        { url: 'https://cdn.com/inactive.m3u8', type: 'hls', isActive: false },
      ],
      subtitles: [],
    }
    const result = normalizeStreams(input)
    expect(result.sources).toHaveLength(1)
    expect(result.sources[0].url).toContain('active')
  })

  it('extrae de watchData.sources (formato miruro)', () => {
    const input = {
      sources: [
        {
          url: 'https://src.com/video.m3u8',
          extractedUrl: 'https://cdn.com/video.m3u8',
          name: '1080p',
          headers: { Referer: 'https://referer.com' },
        },
        { url: 'https://src.com/embed', type: 'iframe' },
      ],
    }
    const result = normalizeStreams(input)
    expect(result.sources).toHaveLength(2)
    expect(result.sources[0].url).toBe('https://cdn.com/video.m3u8')
    expect(result.sources[0].referer).toBe('https://referer.com')
    expect(result.sources[1].type).toBe('iframe')
  })

  it('asigna referer de stream a subtítulos cuando falta', () => {
    const input = {
      streams: [{ url: 'https://cdn.com/video.m3u8', type: 'hls', referer: 'https://cdn.com' }],
      subtitles: [{ file: 'https://cdn.com/sub.vtt', language: 'en' }],
    }
    const result = normalizeStreams(input)
    expect(result.subtitles[0].referer).toBe('https://cdn.com')
  })

  it('filtra subtítulos sin file', () => {
    const input = {
      streams: [{ url: 'https://cdn.com/v.m3u8', type: 'hls' }],
      subtitles: [
        { file: 'https://cdn.com/es.vtt', language: 'es' },
        { language: 'en' },
        { url: 'https://cdn.com/fr.vtt', language: 'fr' },
      ],
    }
    const result = normalizeStreams(input)
    expect(result.subtitles).toHaveLength(2)
    expect(result.subtitles[0].language).toBe('es')
    expect(result.subtitles[1].language).toBe('fr')
  })
})
