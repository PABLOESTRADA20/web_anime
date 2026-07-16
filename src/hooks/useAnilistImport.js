import { useState } from 'react'
import { getToken } from '../lib/auth'

const ANILIST_API = import.meta.env.VITE_ANILIST_API || 'https://graphql.anilist.co'

const GET_USER_LISTS = `
  query ($userName: String) {
    MediaListCollection(userName: $userName, type: ANIME) {
      lists {
        name
        entries {
          mediaId
          media {
            id
            title { romaji english }
            coverImage { large }
            averageScore
            format
            episodes
          }
          status
          score
          progress
          startedAt { year month day }
          completedAt { year month day }
        }
      }
    }
  }`

function mapStatus(alStatus) {
  switch (alStatus) {
    case 'CURRENT':
      return 'watching'
    case 'PLANNING':
      return 'plan_to_watch'
    case 'COMPLETED':
      return 'completed'
    case 'DROPPED':
      return 'dropped'
    case 'PAUSED':
      return 'paused'
    case 'REPEATING':
      return 'watching'
    default:
      return 'plan_to_watch'
  }
}

export function useAnilistImport() {
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function importByUsername(userName) {
    setImporting(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch(ANILIST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: GET_USER_LISTS, variables: { userName } }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}: Usuario no encontrado`)
      const json = await res.json()
      if (json.errors) throw new Error(json.errors[0]?.message || 'Error al obtener lista')

      const lists = json.data?.MediaListCollection?.lists || []
      if (!lists.length) throw new Error('No se encontraron listas públicas para este usuario')

      const token = await getToken()
      if (!token) throw new Error('Debes iniciar sesión')

      const counts = { watching: 0, plan_to_watch: 0, completed: 0, dropped: 0, paused: 0 }

      for (const list of lists) {
        const status = mapStatus(list.name)
        if (!status || status === 'dropped' || status === 'paused') continue

        for (const entry of list.entries || []) {
          const media = entry.media
          if (!media?.id) continue

          const upsertRes = await fetch('/api/anime/lists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              anilist_id: media.id,
              title: media.title?.romaji || media.title?.english || '',
              image: media.coverImage?.large || null,
              status,
            }),
          })

          if (upsertRes.ok) counts[status]++
        }
      }

      setResult(counts)
    } catch (e) {
      setError(e.message)
    } finally {
      setImporting(false)
    }
  }

  return { importByUsername, importing, result, error }
}
