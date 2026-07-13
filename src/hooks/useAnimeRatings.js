import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useAnimeRatings() {
  const { user } = useAuth()
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  }, [user])
  const [ratings, setRatings] = useState({})

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  }, [])

  const fetchRating = useCallback(async (anilistId) => {
    const currentUser = userRef.current
    if (!currentUser) return
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch(`/api/anime/ratings?anilist_id=${anilistId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const { data } = await res.json()
      if (data?.rating) {
        setRatings((prev) => ({ ...prev, [anilistId]: data.rating }))
      }
    } catch {
      /* ignore */
    }
  }, [getToken])

  async function setRating(anilistId, rating) {
    const currentUser = userRef.current
    if (!currentUser) return
    const token = await getToken()
    if (!token) return
    const existing = ratings[anilistId]
    if (existing === rating) {
      await fetch('/api/anime/ratings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ anilist_id: anilistId }),
      })
      setRatings((prev) => {
        const n = { ...prev }
        delete n[anilistId]
        return n
      })
    } else {
      const res = await fetch('/api/anime/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ anilist_id: anilistId, rating }),
      })
      if (res.ok) {
        const { data } = await res.json()
        if (data?.rating) {
          setRatings((prev) => ({ ...prev, [anilistId]: data.rating }))
        }
      }
    }
  }

  return { ratings, fetchRating, setRating }
}
