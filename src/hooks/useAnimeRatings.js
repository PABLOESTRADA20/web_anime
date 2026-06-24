import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useAnimeRatings() {
  const { user } = useAuth()
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  }, [user])
  const [ratings, setRatings] = useState({})

  const fetchRating = useCallback(async (anilistId) => {
    const currentUser = userRef.current
    if (!currentUser || !isSupabaseReady()) return
    try {
      const { data } = await supabase
        .from('anime_ratings')
        .select('rating')
        .eq('user_id', currentUser.id)
        .eq('anilist_id', anilistId)
        .maybeSingle()
      if (data) {
        setRatings((prev) => ({ ...prev, [anilistId]: data.rating }))
      }
    } catch {
      /* ignore */
    }
  }, [])

  async function setRating(anilistId, rating) {
    const currentUser = userRef.current
    if (!currentUser) return
    const existing = ratings[anilistId]
    if (existing === rating) {
      await supabase.from('anime_ratings').delete().eq('user_id', currentUser.id).eq('anilist_id', anilistId)
      setRatings((prev) => {
        const n = { ...prev }
        delete n[anilistId]
        return n
      })
    } else {
      const { data } = await supabase
        .from('anime_ratings')
        .upsert({ user_id: currentUser.id, anilist_id: anilistId, rating }, { onConflict: 'user_id, anilist_id' })
        .select('rating')
        .maybeSingle()
      if (data) {
        setRatings((prev) => ({ ...prev, [anilistId]: data.rating }))
      }
    }
  }

  return { ratings, fetchRating, setRating }
}
