import { supabase } from './supabase'
import { gql } from './anilist'

const RECOMMENDATION_QUERY = `
  query ($genres: [String], $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(genre_in: $genres, sort: [SCORE_DESC, POPULARITY_DESC], type: ANIME, isAdult: false) {
        id
        title { romaji english native }
        coverImage { large }
        genres
        format
        episodes
        averageScore
        season
        seasonYear
      }
      pageInfo { hasNextPage }
    }
  }
`

export async function getRecommendations(genres, page = 1, perPage = 20) {
  if (!genres || genres.length === 0) return { data: [], hasNextPage: false }
  const data = await gql(RECOMMENDATION_QUERY, { genres, page, perPage })
  return { data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage }
}

export async function getUserGenreProfile(userId) {
  if (!userId) return []

  const anilistIds = new Set()

  const tables = ['anime_lists', 'anime_favorites', 'anime_ratings', 'watchlist', 'history']
  await Promise.all(tables.map(async (table) => {
    const { data } = await supabase
      .from(table)
      .select('anilist_id')
      .eq('user_id', userId)
    if (data) data.forEach(d => anilistIds.add(d.anilist_id))
  }))

  if (anilistIds.size === 0) return []

  const ids = [...anilistIds].slice(0, 30)
  const idChunks = []
  for (let i = 0; i < ids.length; i += 10) {
    idChunks.push(ids.slice(i, i + 10))
  }

  const genreCount = {}

  await Promise.all(idChunks.map(async (chunk) => {
    const query = `
      query ($ids: [Int]) {
        Page(page: 1, perPage: 10) {
          media(id_in: $ids, type: ANIME) {
            genres
          }
        }
      }`
    try {
      const data = await gql(query, { ids: chunk })
      if (data?.Page?.media) {
        data.Page.media.forEach(m => {
          if (m.genres) m.genres.forEach(g => {
            genreCount[g] = (genreCount[g] || 0) + 1
          })
        })
      }
    } catch { /* ignore */ }
  }))

  const sorted = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre)

  return sorted
}

export async function getUserInteractionIds(userId) {
  if (!userId) return new Set()
  const ids = new Set()
  const tables = ['anime_lists', 'anime_favorites', 'anime_ratings', 'watchlist', 'history']
  await Promise.all(tables.map(async (table) => {
    const { data } = await supabase
      .from(table)
      .select('anilist_id')
      .eq('user_id', userId)
    if (data) data.forEach(d => ids.add(d.anilist_id))
  }))
  return ids
}
