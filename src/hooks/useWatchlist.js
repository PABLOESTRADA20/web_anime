import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useWatchlist() {
  const { user } = useAuth()
  const [watchlist, setWatchlist] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchWatchlist = useCallback(async () => {
    if (!user || !isSupabaseReady()) return
    const { data } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setWatchlist(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) { setWatchlist([]); setLoading(false); return }
    fetchWatchlist()
  }, [user, fetchWatchlist])

  async function toggleWatchlist(anilistId, title, image) {
    if (!user) return
    const existing = watchlist.find((w) => w.anilist_id === anilistId)
    if (existing) {
      await supabase.from('watchlist').delete().eq('id', existing.id)
    } else {
      await supabase.from('watchlist').insert({
        user_id: user.id,
        anilist_id: anilistId,
        title,
        image,
      })
    }
    fetchWatchlist()
  }

  function isInWatchlist(anilistId) {
    return watchlist.some((w) => w.anilist_id === anilistId)
  }

  return { watchlist, loading, toggleWatchlist, isInWatchlist }
}
