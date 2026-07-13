import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useHistory() {
  const { user } = useAuth()
  const [history, setHistory] = useState([])

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  }, [])

  const fetchHistory = useCallback(async () => {
    if (!user) return
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/anime/history', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const { data } = await res.json()
      setHistory(data || [])
    } catch {
      setHistory([])
    }
  }, [user, getToken])

  useEffect(() => {
    if (!user) {
      setHistory([])
      return
    }
    fetchHistory()
  }, [user, fetchHistory])

  const saveProgress = useCallback(
    async (anilistId, episodeNumber, title, image, episodeId, progress, duration) => {
      if (!user) return
      const token = await getToken()
      if (!token) return
      try {
        await fetch('/api/anime/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            anilist_id: anilistId,
            episode_number: episodeNumber,
            title,
            image,
            episode_id: episodeId,
            progress: progress ?? 0,
            duration: duration ?? 0,
          }),
        })
        fetchHistory()
      } catch {
        /* silent */
      }
    },
    [user, getToken, fetchHistory],
  )

  return { history, saveProgress }
}
