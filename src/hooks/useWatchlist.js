import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useWatchlist() {
  const { user } = useAuth()
  const [watchlist, setWatchlist] = useState([])
  const [loading, setLoading] = useState(true)

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  }, [])

  const fetchWatchlist = useCallback(async () => {
    if (!user) return
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/anime/watchlist', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const { data } = await res.json()
      setWatchlist(data || [])
    } catch {
      setWatchlist([])
    }
    setLoading(false)
  }, [user, getToken])

  useEffect(() => {
    if (!user) {
      setWatchlist([])
      setLoading(false)
      return
    }
    fetchWatchlist()
  }, [user, fetchWatchlist])

  async function toggleWatchlist(anilistId, title, image) {
    if (!user) return
    const token = await getToken()
    if (!token) return
    const existing = watchlist.find((w) => w.anilist_id === anilistId)
    if (existing) {
      await fetch('/api/anime/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ anilist_id: anilistId }),
      })
    } else {
      await fetch('/api/anime/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ anilist_id: anilistId, title, image }),
      })
    }
    await fetchWatchlist()
  }

  function isInWatchlist(anilistId) {
    return watchlist.some((w) => w.anilist_id === anilistId)
  }

  return { watchlist, loading, toggleWatchlist, isInWatchlist }
}
