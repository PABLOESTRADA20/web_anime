import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useAnimeFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  }, [])

  const fetch = useCallback(async () => {
    if (!user) return
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/anime/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const { data } = await res.json()
      setFavorites(data || [])
    } catch {
      setFavorites([])
    }
    setLoading(false)
  }, [user, getToken])

  useEffect(() => {
    if (!user) {
      setFavorites([])
      setLoading(false)
      return
    }
    fetch()
  }, [user, fetch])

  async function toggleFavorite(anilistId, title, image) {
    if (!user) return
    const token = await getToken()
    if (!token) return
    const existing = favorites.find((f) => f.anilist_id === anilistId)
    if (existing) {
      await fetch('/api/anime/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ anilist_id: anilistId }),
      })
    } else {
      await fetch('/api/anime/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ anilist_id: anilistId, title, image }),
      })
    }
    await fetch()
  }

  function isFavorite(anilistId) {
    return favorites.some((f) => f.anilist_id === anilistId)
  }

  return { favorites, loading, toggleFavorite, isFavorite }
}
