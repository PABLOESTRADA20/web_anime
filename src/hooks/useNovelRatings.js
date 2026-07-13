import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useNovelRatings() {
  const { user } = useAuth()
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])
  const [ratings, setRatings] = useState({})

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  }, [])

  const fetchRating = useCallback(async (slug) => {
    const currentUser = userRef.current
    if (!currentUser) return
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch(`/api/novel/ratings?novel_slug=${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      if (data?.rating) setRatings((prev) => ({ ...prev, [slug]: data.rating }))
    } catch { /* ignore */ }
  }, [getToken])

  async function setRating(slug, rating) {
    const currentUser = userRef.current
    if (!currentUser) return
    const token = await getToken()
    if (!token) return
    const existing = ratings[slug]
    if (existing === rating) {
      await fetch('/api/novel/ratings', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ novel_slug: slug }) })
      setRatings((prev) => { const n = { ...prev }; delete n[slug]; return n })
    } else {
      const res = await fetch('/api/novel/ratings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ novel_slug: slug, rating }) })
      if (res.ok) {
        const { data } = await res.json()
        if (data?.rating) setRatings((prev) => ({ ...prev, [slug]: data.rating }))
      }
    }
  }

  return { ratings, fetchRating, setRating }
}
