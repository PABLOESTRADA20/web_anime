import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useNovelFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  }, [])

  const fetchFavorites = useCallback(async () => {
    if (!user) return
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/novel/favorites', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setFavorites(data || [])
    } catch { setFavorites([]) }
    setLoading(false)
  }, [user, getToken])

  useEffect(() => {
    if (!user) { setFavorites([]); setLoading(false); return }
    fetchFavorites()
  }, [user, fetchFavorites])

  async function toggleFavorite(slug, title, cover) {
    if (!user) return
    const token = await getToken()
    if (!token) return
    const existing = favorites.find((f) => f.novel_slug === slug)
    if (existing) {
      await fetch('/api/novel/favorites', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ novel_slug: slug }) })
    } else {
      await fetch('/api/novel/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ novel_slug: slug, title, cover }) })
    }
    fetchFavorites()
  }

  function isFavorite(slug) {
    return favorites.some((f) => f.novel_slug === slug)
  }

  return { favorites, loading, toggleFavorite, isFavorite }
}
