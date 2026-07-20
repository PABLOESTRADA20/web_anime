import BaseAdapter from '../BaseAdapter'
import { getAnimeTitle as anilistGetTitle } from '../../lib/anilist'
import {
  getTioAnimeServers as jimovGetServers,
  findTioAnimeSlug,
  getMonosChinosServers as jimovMonosChinosServers,
  searchMonosChinos as jimovSearchMonosChinos,
  extractMonosChinosSlug as jimovExtractSlug,
  getTioAnimeEpisodes as jimovGetEpisodes,
  searchTioAnime as jimovSearchTioAnime,
} from '../../lib/jimov'

export class TioAnimeAdapter extends BaseAdapter {
  constructor() {
    super({
      name: 'tioanime',
      label: 'TioAnime',
      backend: 'jimov',
      supportedAudio: ['latam'],
      priority: 2,
      cacheTtl: 60000,
    })
  }

  async _healthCheckImpl() {
    const results = await jimovSearchTioAnime('naruto')
    return results.length > 0
  }

  async getEpisodes(anilistId) {
    return this._withRetry(async () => {
      const title = await anilistGetTitle(anilistId)
      if (!title) return null
      const result = await jimovGetEpisodes(anilistId, title)
      return result
    }, `episodes:tioanime:${anilistId}`)
  }

  async getWatch(anilistId, epNum) {
    return this._withRetry(async () => {
      const title = await anilistGetTitle(anilistId)
      if (!title) throw new Error('sin título')
      const slug = await findTioAnimeSlug(anilistId, title)
      if (!slug) throw new Error('slug no encontrado')
      const result = await jimovGetServers(slug, epNum)
      if (!result?.sources?.length) throw new Error('sin fuentes')
      return {
        sources: result.sources,
        subtitles: [],
        downloads: [],
        audioLang: 'es',
        provider: 'tioanime',
        backend: 'jimov',
        audioType: 'latam',
      }
    }, `watch:tioanime:${anilistId}:${epNum}`)
  }
}

export class MonosChinosAdapter extends BaseAdapter {
  constructor() {
    super({
      name: 'monoschinos',
      label: 'MonosChinos',
      backend: 'jimov',
      supportedAudio: ['latam'],
      priority: 3,
      cacheTtl: 60000,
    })
  }

  async _healthCheckImpl() {
    const results = await jimovSearchMonosChinos('naruto')
    return results.length > 0
  }

  async getWatch(anilistId, epNum) {
    return this._withRetry(async () => {
      const title = await anilistGetTitle(anilistId)
      if (!title?.romaji && !title?.english) throw new Error('sin título')
      const results = await jimovSearchMonosChinos(title.romaji || title.english)
      if (!results.length) throw new Error('anime no encontrado')
      const animeUrl = results[0].url
      if (!animeUrl) throw new Error('sin URL')
      const animeSlug = await jimovExtractSlug(animeUrl)
      if (!animeSlug) throw new Error('sin slug')
      const episodeSlug = `${animeSlug}-episodio-${epNum}`
      const result = await jimovMonosChinosServers(episodeSlug)
      if (!result?.sources?.length) throw new Error('sin fuentes')
      return {
        sources: result.sources,
        subtitles: [],
        downloads: [],
        audioLang: 'es',
        provider: 'monoschinos',
        backend: 'jimov',
        audioType: 'latam',
      }
    }, `watch:monoschinos:${anilistId}:${epNum}`)
  }
}
