import BaseAdapter from '../BaseAdapter'
import { getWatch as jkanimeGetWatch, searchJkanime } from '../../lib/jkanime'

export default class JKanimeAdapter extends BaseAdapter {
  constructor() {
    super({
      name: 'jkanime',
      label: 'JKanime',
      backend: 'jkanime',
      supportedAudio: ['sub'],
      priority: 20,
      cacheTtl: 60000,
    })
  }

  async _healthCheckImpl() {
    const results = await searchJkanime('naruto')
    return results.length > 0
  }

  async getWatch(anilistId, epNum) {
    return this._withRetry(async () => {
      const result = await jkanimeGetWatch(anilistId, epNum)
      if (!result?.sources?.length) throw new Error('sin fuentes')
      return result
    }, `watch:jkanime:${anilistId}:${epNum}`)
  }
}
