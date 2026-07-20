import * as Sentry from '@sentry/react'
import { providerManager } from '../providers/manager'
import { searchAnime as anilistSearch, browseAnime as anilistBrowse, getTopAnimeList, getAnimeInfo as anilistGetInfo } from './anilist.js'
import { getSpanishMetadata } from './animeflv.js'

function normalizeAnime(item) {
  if (!item) return item
  return {
    ...item,
    anilistId: item.id || item.anilistId,
    image: item.image || item.coverImage?.large || item.posterImage,
    score: item.score ?? item.averageScore ?? null,
    synopsis: item.synopsis || item.description || '',
    studio: item.studio || (item.studios?.nodes?.[0] ? { id: item.studios.nodes[0].id, name: item.studios.nodes[0].name } : null),
    relations: (item.relations?.edges || item.relations || []).map((e) => {
      const node = e.node || e.mediaRecommendation || e
      return { ...node, anilistId: node.id, image: node.image || node.coverImage?.large }
    }),
    recommendations: (item.recommendations?.nodes || item.recommendations || []).map((e) => {
      const r = e.mediaRecommendation || e
      return { ...r, anilistId: r.id, image: r.image || r.coverImage?.large }
    }),
  }
}

function normalizeList(items) {
  return (items || []).map(normalizeAnime)
}

export async function searchAnime(query, page = 1, filters = {}, signal) {
  try {
    const res = query ? await anilistSearch(query, page, 20, filters, signal) : await anilistBrowse(page, 24, filters)
    return { data: normalizeList(res.data), hasNextPage: res.hasNextPage }
  } catch (e) {
    if (e.name === 'AbortError') throw e
    Sentry.captureException(e, { tags: { context: 'searchAnime' } })
    return { data: [], hasNextPage: false }
  }
}

export async function getTopAnime(category = 'trending', page = 1) {
  try {
    const res = await getTopAnimeList(category, page)
    return { data: normalizeList(res.data), hasNextPage: res.hasNextPage }
  } catch (e) {
    Sentry.captureException(e, { tags: { context: 'getTopAnime' } })
    return { data: [], hasNextPage: false }
  }
}

export async function getAnimeInfo(id) {
  try {
    const data = await anilistGetInfo(id)
    const enriched = normalizeAnime(data)
    await tryEnrichSpanish(enriched)
    return { data: enriched }
  } catch (e) {
    Sentry.captureException(e, { tags: { context: 'getAnimeInfo', anilistId: String(id) } })
    return { data: null }
  }
}

async function tryEnrichSpanish(anime) {
  const title = anime.title?.romaji || anime.title?.english || ''
  if (!title) return
  const es = await getSpanishMetadata(title)
  if (es) {
    anime.title_es = es.title
    anime.synopsis_es = es.synopsis
    anime.genres_es = es.genres
  }
}

const ES_CONCURRENCY = 3

export async function enrichAnimeBatch(list) {
  const queue = [...list]
  async function worker() {
    while (queue.length) {
      const item = queue.shift()
      if (!item || item.title_es) continue
      const title = item.title?.romaji || item.title?.english || ''
      if (!title) continue
      try {
        const es = await getSpanishMetadata(title)
        if (es) {
          item.title_es = es.title
          item.synopsis_es = es.synopsis
          item.genres_es = es.genres
        }
      } catch {
        /* skip */
      }
    }
  }
  await Promise.all(Array.from({ length: ES_CONCURRENCY }, () => worker()))
}

export async function getWatchWithFallback(anilistId, preferredProvider, epNum, audio = 'sub') {
  providerManager.init()

  try {
    const result = await providerManager.getWatch(anilistId, epNum, audio)
    return result
  } catch (e) {
    Sentry.captureException(e, {
      tags: { anilistId: String(anilistId), episode: epNum, context: 'allProvidersFailed' },
      extra: { errors: e.errors?.map((er) => `${er.provider}: ${er.message}`) },
    })
    e.providerErrors = e.errors || []
    throw e
  }
}

export async function getAnimeEpisodes(anilistId, audio) {
  providerManager.init()

  try {
    const result = await providerManager.getEpisodes(anilistId, audio || 'sub')
    return result
  } catch {
    return { providerEpisodes: [], dubEpisodes: [], provider: null }
  }
}
