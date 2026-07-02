import { getCached, setCache } from './cache.js'

const ANILIST_API = 'https://graphql.anilist.co'

interface PageInfo {
  hasNextPage: boolean
  total?: number
}

interface Title {
  romaji?: string
  english?: string
  native?: string
}

interface CoverImage {
  large?: string
  color?: string
}

interface FuzzyDate {
  year?: number
  month?: number
  day?: number
}

interface Media {
  id: number
  idMal?: number
  title: Title
  coverImage: CoverImage
  bannerImage?: string
  description?: string
  averageScore?: number
  meanScore?: number
  genres?: string[]
  format?: string
  status?: string
  episodes?: number
  duration?: number
  chapters?: number
  volumes?: number
  season?: string
  seasonYear?: number
  startDate?: FuzzyDate
  endDate?: FuzzyDate
  countryOfOrigin?: string
  hashtag?: string
  isAdult?: boolean
  synonyms?: string[]
  tags?: { name: string; rank: number }[]
  studios?: { nodes: { id: number; name: string }[] }
  staff?: { edges: StaffEdge[] }
  characters?: { edges: CharacterEdge[] }
  trailer?: { id: string; site: string }
  relations?: { edges: RelationEdge[] }
  recommendations?: { nodes: RecommendationNode[] }
  nextAiringEpisode?: { airingAt: number; episode: number }
  externalLinks?: ExternalLink[]
  streamingEpisodes?: StreamingEpisode[]
}

interface ExternalLink {
  url: string
  site: string
  siteName?: string
  language?: string
  color?: string
  icon?: string
  type?: string
  isDisabled?: boolean
}

interface StreamingEpisode {
  title: string
  thumbnail: string
  url: string
  site: string
}

interface StaffEdge {
  node: {
    id: number
    name: { full: string }
    image: { large: string }
    primaryOccupations?: string[]
  }
  role: string
}

interface CharacterEdge {
  node: {
    id: number
    name: { full: string; native?: string }
    image: { large: string }
  }
  role: string
  voiceActors: {
    id: number
    name: { full: string }
    image: { large: string }
    language: string
  }[]
}

interface RelationEdge {
  node: {
    id: number
    title: Title
    coverImage: CoverImage
    type: string
    format?: string
    averageScore?: number
    episodes?: number
    status?: string
    season?: string
    seasonYear?: number
    startDate?: FuzzyDate
  }
  relationType: string
}

interface RecommendationNode {
  mediaRecommendation: {
    id: number
    title: Title
    coverImage: CoverImage
    type: string
    format?: string
    averageScore?: number
  }
}

interface Character {
  id: number
  name: { full: string; native?: string; alternative?: string[] }
  image: { large: string }
  description?: string
  gender?: string
  dateOfBirth?: FuzzyDate
  age?: number
  bloodType?: string
  favourites: number
  media?: {
    edges: {
      node: {
        id: number
        title: Title
        coverImage: CoverImage
        type: string
        format?: string
        averageScore?: number
      }
      voiceActors: {
        id: number
        name: { full: string }
        image: { large: string }
        language: string
      }[]
      role: string
    }[]
  }
}

interface AiringSchedule {
  id: number
  airingAt: number
  episode: number
  media: Media
}

interface AnimeListResult {
  data: Media[]
  hasNextPage: boolean
  total?: number
}

interface CharacterListResult {
  data: Character[]
  hasNextPage: boolean
}

interface ScheduleResult {
  data: AiringSchedule[]
  hasNextPage: boolean
}

interface CharactersResult {
  data: CharacterEdge[]
  pageInfo: PageInfo
}

interface DirectoryFilters {
  search?: string
  genre?: string
  genre_in?: string[]
  year?: number
  format?: string
  status?: string
  season?: string
  sort?: string[]
  minScore?: number
}

const SEARCH_MANGA = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage total }
      media(search: $search, type: MANGA, sort: POPULARITY_DESC) {
        id
        title { romaji english native }
        coverImage { large color }
        bannerImage
        description
        averageScore
        genres
        format
        status
        chapters
        volumes
        startDate { year month day }
      }
    }
  }`

const GET_MANGA = `
  query ($id: Int) {
    Media(id: $id, type: MANGA) {
      id
      title { romaji english native }
      coverImage { large color }
      bannerImage
      description
      averageScore
      meanScore
      genres
      format
      status
      chapters
      volumes
      startDate { year month day }
      endDate { year month day }
      countryOfOrigin
      hashtag
      isAdult
      synonyms
      tags { name rank }
      studios(isMain: true) { nodes { id name } }
      staff { edges { node { id name { full } image { large } primaryOccupations } role } }
      characters { edges { node { id name { full } image { large } } role voiceActors { id name { full } image { large } language } } }
      relations { edges { node { id title { romaji english } coverImage { large } type format averageScore } relationType } }
      recommendations(sort: RATING_DESC, perPage: 10) {
        nodes { mediaRecommendation { id title { romaji english } coverImage { large } type format averageScore } }
      }
    }
  }`

const TOP_MANGA = `
  query ($page: Int, $perPage: Int, $sort: [MediaSort], $status: MediaStatus) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage total }
      media(type: MANGA, sort: $sort, status: $status, isAdult: false) {
        id
        title { romaji english }
        coverImage { large }
        averageScore
        format
        chapters
        volumes
      }
    }
  }`

const SEARCH_CHARACTER = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage total }
      characters(search: $search, sort: FAVOURITES_DESC) {
        id
        name { full native }
        image { large }
        description
        gender
        dateOfBirth { year month day }
        age
        favourites
      }
    }
  }`

const GET_CHARACTER = `
  query ($id: Int) {
    Character(id: $id) {
      id
      name { full native alternative }
      image { large }
      description
      gender
      dateOfBirth { year month day }
      age
      bloodType
      favourites
      media(page: 1, perPage: 25, sort: POPULARITY_DESC) {
        edges {
          node { id title { romaji english } coverImage { large } type format averageScore }
          voiceActors { id name { full } image { large } language }
          role
        }
      }
    }
  }`

const GET_ANIME_CHARACTERS = `
  query ($id: Int, $page: Int, $perPage: Int) {
    Media(id: $id) {
      characters(page: $page, perPage: $perPage, sort: ROLE) {
        pageInfo { hasNextPage total }
        edges {
          node { id name { full native } image { large } }
          role
          voiceActors { id name { full } image { large } language }
        }
      }
    }
  }`

const SEARCH_ANIME = `
  query ($search: String, $page: Int, $perPage: Int, $genre: String, $year: Int, $format: MediaFormat, $minScore: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage total }
      media(search: $search, type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false, genre: $genre, seasonYear: $year, format: $format, averageScore_greater: $minScore) {
        id
        title { romaji english }
        coverImage { large }
        bannerImage
        averageScore
        genres
        format
        episodes
        status
        season
        startDate { year month day }
      }
    }
  }`

const TOP_ANIME = `
  query ($page: Int, $perPage: Int, $sort: [MediaSort], $status: MediaStatus) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage total }
      media(type: ANIME, sort: $sort, status: $status, isAdult: false) {
        id
        title { romaji english }
        coverImage { large }
        averageScore
        format
        episodes
        status
      }
    }
  }`

const GET_ANIME = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      idMal
      title { romaji english native }
      coverImage { large color }
      bannerImage
      description
      averageScore
      meanScore
      genres
      format
      status
      episodes
      duration
      season
      seasonYear
      startDate { year month day }
      endDate { year month day }
      countryOfOrigin
      hashtag
      isAdult
      synonyms
      tags { name rank }
      studios(isMain: true) { nodes { id name } }
      staff { edges { node { id name { full } image { large } primaryOccupations } role } }
      characters { edges { node { id name { full } image { large } } role voiceActors { id name { full } image { large } language } } }
      trailer { id site }
      relations { edges { node { id title { romaji english } coverImage { large } type format averageScore episodes status season seasonYear startDate { year month day } } relationType } }
      recommendations(sort: RATING_DESC, perPage: 10) {
        nodes { mediaRecommendation { id title { romaji english } coverImage { large } type format averageScore } }
      }
      nextAiringEpisode { airingAt episode }
      externalLinks { url site language color icon type isDisabled }
      streamingEpisodes { title thumbnail url site }
    }
  }`

const GET_SCHEDULE = `
  query ($page: Int, $perPage: Int, $notYetAired: Boolean) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage total }
      airingSchedules(notYetAired: $notYetAired, sort: TIME) {
        id
        airingAt
        episode
        media {
          id
          title { romaji english }
          coverImage { large }
          format
          averageScore
          status
          episodes
          nextAiringEpisode { airingAt episode }
        }
      }
    }
  }`

const GET_SEASONAL = `
  query ($season: MediaSeason, $seasonYear: Int, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage total }
      media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC, isAdult: false) {
        id
        title { romaji english }
        coverImage { large }
        bannerImage
        averageScore
        genres
        format
        episodes
        status
        season
        startDate { year month day }
      }
    }
  }`

const DIRECTORY_QUERY = `
  query ($page: Int, $perPage: Int, $search: String, $genre: String, $genre_in: [String], $year: Int, $format: MediaFormat, $status: MediaStatus, $season: MediaSeason, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage total }
      media(type: ANIME, isAdult: false, search: $search, genre: $genre, genre_in: $genre_in, seasonYear: $year, format: $format, status: $status, season: $season, sort: $sort) {
        id
        title { romaji english }
        coverImage { large }
        bannerImage
        averageScore
        genres
        format
        episodes
        status
        season
        seasonYear
        startDate { year month day }
      }
    }
  }`

const MANGA_DIRECTORY = `
  query ($page: Int, $perPage: Int, $search: String, $genre: String, $genre_in: [String], $year: Int, $format: MediaFormat, $status: MediaStatus, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage total }
      media(type: MANGA, isAdult: false, search: $search, genre: $genre, genre_in: $genre_in, seasonYear: $year, format: $format, status: $status, sort: $sort) {
        id
        title { romaji english }
        coverImage { large }
        averageScore
        genres
        format
        chapters
        volumes
        status
        startDate { year }
      }
    }
  }`

function gqlCacheKey(query: string, variables: Record<string, unknown> = {}): string {
  return query.trim().slice(0, 80) + ':' + JSON.stringify(variables)
}

export async function gql<T>(query: string, variables: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
  const cacheKey = gqlCacheKey(query, variables)
  const cached = getCached(cacheKey, 'anilist')
  if (cached) return cached as T

  const res = await fetch(ANILIST_API, {
    signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10) * 1000
    await new Promise((r) => setTimeout(r, Math.min(retryAfter, 15000)))
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    return gql<T>(query, variables, signal)
  }
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AniList error ${res.status}: ${err}`)
  }
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0]?.message || 'AniList error')

  setCache(cacheKey, json.data, 'anilist')
  return json.data as T
}

export async function searchManga(query: string, page = 1, perPage = 20): Promise<AnimeListResult> {
  const data = await gql<{ Page: { media: Media[]; pageInfo: PageInfo } }>(SEARCH_MANGA, { search: query, page, perPage })
  return { data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage, total: data.Page.pageInfo.total }
}

export async function getMangaInfo(id: number | string): Promise<Media> {
  const data = await gql<{ Media: Media }>(GET_MANGA, { id: Number(id) })
  return data.Media
}

export async function getTopManga(category = 'TRENDING', page = 1, perPage = 20): Promise<AnimeListResult> {
  const sortMap: Record<string, string[]> = {
    trending: ['TRENDING_DESC', 'POPULARITY_DESC'],
    popular: ['POPULARITY_DESC'],
    top: ['SCORE_DESC'],
    releasing: ['POPULARITY_DESC'],
    upcoming: ['POPULARITY_DESC'],
  }
  const statusMap: Record<string, string> = {
    releasing: 'RELEASING',
    upcoming: 'NOT_YET_RELEASED',
  }
  const sorts = sortMap[category] || sortMap.trending
  const status = statusMap[category] || null
  const data = await gql<{ Page: { media: Media[]; pageInfo: PageInfo } }>(TOP_MANGA, { page, perPage, sort: sorts, status })
  return { data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage }
}

export async function getMangaDirectory(
  page = 1,
  perPage = 30,
  filters: DirectoryFilters = {},
  signal?: AbortSignal,
): Promise<AnimeListResult> {
  const vars: Record<string, unknown> = { page, perPage }
  if (filters.search) vars.search = filters.search
  if (filters.genre) vars.genre = filters.genre
  if (filters.genre_in?.length) vars.genre_in = filters.genre_in
  if (filters.year) vars.year = filters.year
  if (filters.format) vars.format = filters.format
  if (filters.status) vars.status = filters.status
  vars.sort = filters.sort || ['TRENDING_DESC', 'POPULARITY_DESC']
  const data = await gql<{ Page: { media: Media[]; pageInfo: PageInfo } }>(MANGA_DIRECTORY, vars, signal)
  return { data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage, total: data.Page.pageInfo.total }
}

export async function searchAnime(
  query: string,
  page = 1,
  perPage = 20,
  filters: DirectoryFilters = {},
  signal?: AbortSignal,
): Promise<AnimeListResult> {
  const vars: Record<string, unknown> = { page, perPage }
  if (query) vars.search = query
  if (filters.genre) vars.genre = filters.genre
  if (filters.year) vars.year = filters.year
  if (filters.format) vars.format = filters.format
  if (filters.minScore) vars.minScore = filters.minScore
  const data = await gql<{ Page: { media: Media[]; pageInfo: PageInfo } }>(SEARCH_ANIME, vars, signal)
  return { data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage, total: data.Page.pageInfo.total }
}

export async function browseAnime(page = 1, perPage = 24, filters: DirectoryFilters = {}): Promise<AnimeListResult> {
  const vars: Record<string, unknown> = { page, perPage }
  if (filters.genre) vars.genre = filters.genre
  if (filters.year) vars.year = filters.year
  if (filters.format) vars.format = filters.format
  if (filters.minScore) vars.minScore = filters.minScore
  const data = await gql<{ Page: { media: Media[]; pageInfo: PageInfo } }>(SEARCH_ANIME, vars)
  return { data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage, total: data.Page.pageInfo.total }
}

export async function getTopAnimeList(category = 'trending', page = 1, perPage = 20): Promise<AnimeListResult> {
  const sortMap: Record<string, string[]> = {
    trending: ['TRENDING_DESC', 'POPULARITY_DESC'],
    popular: ['POPULARITY_DESC'],
    top: ['SCORE_DESC'],
    airing: ['POPULARITY_DESC'],
    upcoming: ['POPULARITY_DESC'],
  }
  const statusMap: Record<string, string> = {
    airing: 'RELEASING',
    upcoming: 'NOT_YET_RELEASED',
  }
  const sorts = sortMap[category] || sortMap.trending
  const status = statusMap[category] || null
  const data = await gql<{ Page: { media: Media[]; pageInfo: PageInfo } }>(TOP_ANIME, { page, perPage, sort: sorts, status })
  return { data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage }
}

export async function getAnimeInfo(id: number | string): Promise<Media> {
  const data = await gql<{ Media: Media }>(GET_ANIME, { id: Number(id) })
  return data.Media
}

export async function searchCharacter(query: string, page = 1, perPage = 20): Promise<CharacterListResult> {
  const data = await gql<{ Page: { characters: Character[]; pageInfo: PageInfo } }>(SEARCH_CHARACTER, { search: query, page, perPage })
  return { data: data.Page.characters, hasNextPage: data.Page.pageInfo.hasNextPage }
}

export async function getCharacterInfo(id: number | string): Promise<Character> {
  const data = await gql<{ Character: Character }>(GET_CHARACTER, { id: Number(id) })
  return data.Character
}

export async function getAnimeCharacters(animeId: number | string, page = 1, perPage = 50): Promise<CharactersResult> {
  const data = await gql<{ Media: { characters: { edges: CharacterEdge[]; pageInfo: PageInfo } } }>(GET_ANIME_CHARACTERS, {
    id: Number(animeId),
    page,
    perPage,
  })
  return { data: data.Media?.characters?.edges || [], pageInfo: data.Media?.characters?.pageInfo }
}

export async function getSchedule(page = 1, perPage = 30, notYetAired = true): Promise<ScheduleResult> {
  const data = await gql<{ Page: { airingSchedules: AiringSchedule[]; pageInfo: PageInfo } }>(GET_SCHEDULE, { page, perPage, notYetAired })
  return { data: data.Page.airingSchedules, hasNextPage: data.Page.pageInfo.hasNextPage }
}

export async function getSeasonalAnime(season: string, year: number, page = 1, perPage = 20): Promise<AnimeListResult> {
  const seasonUpper = season ? season.toUpperCase() : getCurrentSeason()
  const seasonYear = year || new Date().getFullYear()
  const data = await gql<{ Page: { media: Media[]; pageInfo: PageInfo } }>(GET_SEASONAL, { season: seasonUpper, seasonYear, page, perPage })
  return { data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage }
}

const GET_ANIME_TITLE = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english }
    }
  }`

export async function getAnimeTitle(id: number | string): Promise<Title | null> {
  const data = await gql<{ Media: { title: Title } }>(GET_ANIME_TITLE, { id: Number(id) })
  return data?.Media?.title || null
}

const GET_STAFF = `
  query ($id: Int) {
    Staff(id: $id) {
      id
      name { full native alternative }
      image { large }
      description
      primaryOccupations
      gender
      dateOfBirth { year month day }
      age
      homeTown
      bloodType
      favourites
      staffMedia(page: 1, perPage: 25, sort: POPULARITY_DESC) {
        edges {
          node { id title { romaji english } coverImage { large } type format averageScore episodes chapters status startDate { year month day } }
          staffRole
        }
      }
      characters(page: 1, perPage: 25, sort: ROLE) {
        edges {
          node { id name { full } image { large } }
          role
          media { id title { romaji english } coverImage { large } type format }
        }
      }
    }
  }`

interface StaffDetail {
  id: number
  name: { full: string; native?: string; alternative?: string[] }
  image: { large: string }
  description?: string
  primaryOccupations?: string[]
  gender?: string
  dateOfBirth?: FuzzyDate
  age?: number
  homeTown?: string
  bloodType?: string
  favourites: number
  staffMedia?: {
    edges: {
      node: Media
      staffRole: string
    }[]
  }
  characters?: {
    edges: {
      node: { id: number; name: { full: string }; image: { large: string } }
      role: string
      media: { id: number; title: Title; coverImage: CoverImage; type: string; format?: string }
    }[]
  }
}

export async function getStaffInfo(id: number | string): Promise<StaffDetail> {
  const data = await gql<{ Staff: StaffDetail }>(GET_STAFF, { id: Number(id) })
  return data.Staff
}

const GET_STUDIO = `
  query ($id: Int, $page: Int, $perPage: Int) {
    Studio(id: $id) {
      id
      name
      isAnimationStudio
      favourites
      media(page: $page, perPage: $perPage, sort: POPULARITY_DESC) {
        pageInfo { hasNextPage total }
        nodes { id title { romaji english } coverImage { large } type format averageScore episodes status startDate { year month day } }
      }
    }
  }`

interface StudioDetail {
  id: number
  name: string
  isAnimationStudio: boolean
  favourites: number
  media: {
    pageInfo: PageInfo
    nodes: Media[]
  }
}

export async function getStudioInfo(id: number | string, page = 1, perPage = 30): Promise<StudioDetail> {
  const data = await gql<{ Studio: StudioDetail }>(GET_STUDIO, { id: Number(id), page, perPage })
  return data.Studio
}

export async function getDirectory(page = 1, perPage = 30, filters: DirectoryFilters = {}, signal?: AbortSignal): Promise<AnimeListResult> {
  const vars: Record<string, unknown> = { page, perPage }
  if (filters.search) vars.search = filters.search
  if (filters.genre) vars.genre = filters.genre
  if (filters.genre_in?.length) vars.genre_in = filters.genre_in
  if (filters.year) vars.year = filters.year
  if (filters.format) vars.format = filters.format
  if (filters.status) vars.status = filters.status
  if (filters.season) vars.season = filters.season
  vars.sort = filters.sort || ['TRENDING_DESC', 'POPULARITY_DESC']
  const data = await gql<{ Page: { media: Media[]; pageInfo: PageInfo } }>(DIRECTORY_QUERY, vars, signal)
  return { data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage, total: data.Page.pageInfo.total }
}

export async function searchMangaByTitle(title: string): Promise<Media | null> {
  try {
    const result = await searchManga(title, 1, 5)
    const lower = title.toLowerCase()
    const match = result.data.find((m) => {
      const romaji = m.title?.romaji?.toLowerCase() || ''
      const english = m.title?.english?.toLowerCase() || ''
      return romaji.includes(lower) || english.includes(lower) || lower.includes(romaji) || lower.includes(english)
    })
    return match || result.data[0] || null
  } catch {
    return null
  }
}

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1
  if (month <= 3) return 'WINTER'
  if (month <= 6) return 'SPRING'
  if (month <= 9) return 'SUMMER'
  return 'FALL'
}
