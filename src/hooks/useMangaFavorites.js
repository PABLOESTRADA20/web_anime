import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useMangaFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFavorites = useCallback(async () => {
    if (!user || !isSupabaseReady()) return
    const { data } = await supabase
      .from('manga_favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setFavorites(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) { setFavorites([]); setLoading(false); return }
    fetchFavorites()
  }, [user, fetchFavorites])

  async function toggleFavorite(anilistId, title, image) {
    if (!user) return
    const existing = favorites.find((f) => f.anilist_id === anilistId)
    if (existing) {
      await supabase.from('manga_favorites').delete().eq('id', existing.id)
    } else {
      await supabase.from('manga_favorites').insert({
        user_id: user.id,
        anilist_id: anilistId,
        title,
        image,
      })
    }
    fetchFavorites()
  }

  function isFavorite(anilistId) {
    return favorites.some((f) => f.anilist_id === anilistId)
  }

  return { favorites, loading, toggleFavorite, isFavorite }
}
