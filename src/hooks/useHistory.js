import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { getToken } from '../lib/auth'

export function useHistory() {
  const { user } = useAuth()
  const [history, setHistory] = useState([])

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
  }, [user])

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
    [user, fetchHistory],
  )

  return { history, saveProgress }
}
