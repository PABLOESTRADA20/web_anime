import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useNovelFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFavorites = useCallback(async () => {
    if (!user || !isSupabaseReady()) return
    const { data } = await supabase.from('novel_favorites').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setFavorites(data || [])
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

  async function toggleFavorite(slug, title, cover) {
    if (!user) return
    const existing = favorites.find((f) => f.novel_slug === slug)
    if (existing) {
      await supabase.from('novel_favorites').delete().eq('id', existing.id)
    } else {
      await supabase.from('novel_favorites').insert({ user_id: user.id, novel_slug: slug, title, cover })
    }
    fetchFavorites()
  }

  function isFavorite(slug) {
    return favorites.some((f) => f.novel_slug === slug)
  }

  return { favorites, loading, toggleFavorite, isFavorite }
}
