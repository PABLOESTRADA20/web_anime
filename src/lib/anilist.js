const ANILIST_API = 'https://graphql.anilist.co'

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
      relations { edges { node { id title { romaji english } coverImage { large } type format averageScore } relationType } }
      recommendations(sort: RATING_DESC, perPage: 10) {
        nodes { mediaRecommendation { id title { romaji english } coverImage { large } type format averageScore } }
      }
      nextAiringEpisode { airingAt episode }
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

async function gql(query, variables = {}, signal) {
  const res = await fetch(ANILIST_API, {
    signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AniList error ${res.status}: ${err}`)
  }
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0]?.message || 'AniList error')
  return json.data
}

export async function searchManga(query, page = 1, perPage = 20) {
  const data = await gql(SEARCH_MANGA, { search: query, page, perPage })
  return { data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage, total: data.Page.pageInfo.total }
}

export async function getMangaInfo(id) {
  const data = await gql(GET_MANGA, { id })
  return data.Media
}

export async function getTopManga(category = 'TRENDING', page = 1, perPage = 20) {
  const sortMap = {
    trending: ['TRENDING_DESC', 'POPULARITY_DESC'],
    popular: ['POPULARITY_DESC'],
    top: ['SCORE_DESC'],
    releasing: ['POPULARITY_DESC'],
    upcoming: ['POPULARITY_DESC'],
  }
  const statusMap = {
    releasing: 'RELEASING',
    upcoming: 'NOT_YET_RELEASED',
  }
  const sorts = sortMap[category] || sortMap.trending
  const status = statusMap[category] || null
  const data = await gql(TOP_MANGA, { page, perPage, sort: sorts, status })
  return { data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage }
}

export async function searchAnime(query, page = 1, perPage = 20, filters = {}, signal) {
  const vars = { page, perPage }
  if (query) vars.search = query
  if (filters.genre) vars.genre = filters.genre
  if (filters.year) vars.year = filters.year
  if (filters.format) vars.format = filters.format
  if (filters.minScore) vars.minScore = filters.minScore
  const data = await gql(SEARCH_ANIME, vars, signal)
  return { data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage, total: data.Page.pageInfo.total }
}

export async function browseAnime(page = 1, perPage = 24, filters = {}) {
  const vars = { page, perPage }
  if (filters.genre) vars.genre = filters.genre
  if (filters.year) vars.year = filters.year
  if (filters.format) vars.format = filters.format
  if (filters.minScore) vars.minScore = filters.minScore
  const data = await gql(SEARCH_ANIME, vars)
  return { data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage, total: data.Page.pageInfo.total }
}

export async function getTopAnimeList(category = 'trending', page = 1, perPage = 20) {
  const sortMap = {
    trending: ['TRENDING_DESC', 'POPULARITY_DESC'],
    popular: ['POPULARITY_DESC'],
    top: ['SCORE_DESC'],
    airing: ['POPULARITY_DESC'],
    upcoming: ['POPULARITY_DESC'],
  }
  const statusMap = {
    airing: 'RELEASING',
    upcoming: 'NOT_YET_RELEASED',
  }
  const sorts = sortMap[category] || sortMap.trending
  const status = statusMap[category] || null
  const data = await gql(TOP_ANIME, { page, perPage, sort: sorts, status })
  return { data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage }
}

export async function getAnimeInfo(id) {
  const data = await gql(GET_ANIME, { id })
  return data.Media
}

export async function searchCharacter(query, page = 1, perPage = 20) {
  const data = await gql(SEARCH_CHARACTER, { search: query, page, perPage })
  return { data: data.Page.characters, hasNextPage: data.Page.pageInfo.hasNextPage }
}

export async function getCharacterInfo(id) {
  const data = await gql(GET_CHARACTER, { id })
  return data.Character
}

export async function getAnimeCharacters(animeId, page = 1, perPage = 50) {
  const data = await gql(GET_ANIME_CHARACTERS, { id: animeId, page, perPage })
  return { data: data.Media?.characters?.edges || [], pageInfo: data.Media?.characters?.pageInfo }
}

export async function getSchedule(page = 1, perPage = 30, notYetAired = true) {
  const data = await gql(GET_SCHEDULE, { page, perPage, notYetAired })
  return { data: data.Page.airingSchedules, hasNextPage: data.Page.pageInfo.hasNextPage }
}

export async function getSeasonalAnime(season, year, page = 1, perPage = 20) {
  const seasonUpper = season ? season.toUpperCase() : getCurrentSeason()
  const seasonYear = year || new Date().getFullYear()
  const data = await gql(GET_SEASONAL, { season: seasonUpper, seasonYear, page, perPage })
  return { data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage }
}

function getCurrentSeason() {
  const month = new Date().getMonth() + 1
  if (month <= 3) return 'WINTER'
  if (month <= 6) return 'SPRING'
  if (month <= 9) return 'SUMMER'
  return 'FALL'
}
