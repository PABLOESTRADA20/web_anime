import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useNovelRatings() {
  const { user } = useAuth()
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  }, [user])
  const [ratings, setRatings] = useState({})

  const fetchRating = useCallback(async (slug) => {
    const currentUser = userRef.current
    if (!currentUser || !isSupabaseReady()) return
    try {
      const { data } = await supabase
        .from('novel_ratings')
        .select('rating')
        .eq('user_id', currentUser.id)
        .eq('novel_slug', slug)
        .maybeSingle()
      if (data) {
        setRatings((prev) => ({ ...prev, [slug]: data.rating }))
      }
    } catch {
      /* ignore */
    }
  }, [])

  async function setRating(slug, rating) {
    const currentUser = userRef.current
    if (!currentUser) return
    const existing = ratings[slug]
    if (existing === rating) {
      await supabase.from('novel_ratings').delete().eq('user_id', currentUser.id).eq('novel_slug', slug)
      setRatings((prev) => {
        const n = { ...prev }
        delete n[slug]
        return n
      })
    } else {
      const { data } = await supabase
        .from('novel_ratings')
        .upsert({ user_id: currentUser.id, novel_slug: slug, rating }, { onConflict: 'user_id, novel_slug' })
        .select('rating')
        .maybeSingle()
      if (data) {
        setRatings((prev) => ({ ...prev, [slug]: data.rating }))
      }
    }
  }

  return { ratings, fetchRating, setRating }
}
