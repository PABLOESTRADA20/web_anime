import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useAnimeFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user || !isSupabaseReady()) return
    const { data } = await supabase
      .from('anime_favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setFavorites(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) { setFavorites([]); setLoading(false); return }
    fetch()
  }, [user, fetch])

  async function toggleFavorite(anilistId, title, image) {
    if (!user) return
    const existing = favorites.find((f) => f.anilist_id === anilistId)
    if (existing) {
      await supabase.from('anime_favorites').delete().eq('id', existing.id)
    } else {
      await supabase.from('anime_favorites').insert({ user_id: user.id, anilist_id: anilistId, title, image })
    }
    fetch()
  }

  function isFavorite(anilistId) {
    return favorites.some((f) => f.anilist_id === anilistId)
  }

  return { favorites, loading, toggleFavorite, isFavorite }
}
