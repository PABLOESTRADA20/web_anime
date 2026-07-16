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
  const normalized = (data.Page.media || []).map(normalizeRec)
  return { data: normalized, hasNextPage: data.Page.pageInfo.hasNextPage }
}

function normalizeRec(item) {
  if (!item) return item
  return {
    ...item,
    anilistId: item.id,
    image: item.image || item.coverImage?.large,
    score: item.averageScore ?? null,
  }
}

async function fetchAnilistIds(endpoint, userId) {
  try {
    const res = await fetch(`/api/anime/${endpoint}?user_id=${userId}`)
    if (!res.ok) return []
    const json = await res.json()
    return (json.data || []).map((d) => d.anilist_id).filter(Boolean)
  } catch {
    return []
  }
}

export async function getUserGenreProfile(userId) {
  if (!userId) return []

  const endpoints = ['lists', 'favorites', 'ratings', 'watchlist', 'history']
  const results = await Promise.all(endpoints.map((ep) => fetchAnilistIds(ep, userId)))
  const anilistIds = new Set(results.flat())

  if (anilistIds.size === 0) return []

  const ids = [...anilistIds].slice(0, 30)
  const idChunks = []
  for (let i = 0; i < ids.length; i += 10) {
    idChunks.push(ids.slice(i, i + 10))
  }

  const genreCount = {}

  await Promise.all(
    idChunks.map(async (chunk) => {
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
          data.Page.media.forEach((m) => {
            if (m.genres)
              m.genres.forEach((g) => {
                genreCount[g] = (genreCount[g] || 0) + 1
              })
          })
        }
      } catch {
        /* ignore */
      }
    }),
  )

  const sorted = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre)

  return sorted
}

export async function getUserInteractionIds(userId) {
  if (!userId) return new Set()
  const endpoints = ['lists', 'favorites', 'ratings', 'watchlist', 'history']
  const results = await Promise.all(endpoints.map((ep) => fetchAnilistIds(ep, userId)))
  return new Set(results.flat())
}

export async function getAiRecommendations(genres, lang = 'es', count = 6) {
  if (!genres || genres.length === 0) return []
  if (import.meta.env.DEV) return []
  try {
    const params = new URLSearchParams({ genres: genres.join(','), lang, count: String(count) })
    const res = await fetch(`/api/ai-recommend?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.recommendations || []
  } catch {
    return []
  }
}
