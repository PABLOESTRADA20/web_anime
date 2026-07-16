import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { getToken } from '../lib/auth'

export function useMangaFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFavorites = useCallback(async () => {
    if (!user) return
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/manga/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const { data } = await res.json()
      setFavorites(data || [])
    } catch {
      setFavorites([])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) {
      setFavorites([])
      setLoading(false)
      return
    }
    fetchFavorites()
  }, [user, fetchFavorites])

  async function toggleFavorite(anilistId, title, image) {
    if (!user) return
    const token = await getToken()
    if (!token) return
    const existing = favorites.find((f) => f.anilist_id === anilistId)
    if (existing) {
      await fetch('/api/manga/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ anilist_id: anilistId }),
      })
    } else {
      await fetch('/api/manga/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ anilist_id: anilistId, title, image }),
      })
    }
    fetchFavorites()
  }

  function isFavorite(anilistId) {
    return favorites.some((f) => f.anilist_id === anilistId)
  }

  return { favorites, loading, toggleFavorite, isFavorite }
}
