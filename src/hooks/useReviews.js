import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'

export function useReviews(anilistId, mediaType = 'anime') {
  const [reviews, setReviews] = useState([])
  const [userReview, setUserReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchReviews = useCallback(async () => {
    if (!isSupabaseReady()) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, user:user_id(email), votes:review_votes(sum)')
        .eq('anilist_id', anilistId)
        .eq('media_type', mediaType)
        .order('created_at', { ascending: false })

      if (error) throw error

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const own = (data || []).find((r) => r.user_id === user.id)
        setUserReview(own || null)
      }

      setReviews(data || [])
    } catch (e) {
      console.error('Error fetching reviews:', e)
    }
    setLoading(false)
  }, [anilistId, mediaType])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  async function submitReview({ score, content, hasSpoilers }) {
    if (!isSupabaseReady()) return
    setSubmitting(true)
    if (userReview) {
      const { error } = await supabase
        .from('reviews')
        .update({ score, content, has_spoilers: hasSpoilers, updated_at: new Date().toISOString() })
        .eq('id', userReview.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('reviews')
        .insert({ anilist_id: anilistId, media_type: mediaType, score, content, has_spoilers: hasSpoilers })
      if (error) throw error
    }
    await fetchReviews()
    setSubmitting(false)
  }

  async function deleteReview(id) {
    if (!isSupabaseReady()) return
    try {
      const { error } = await supabase.from('reviews').delete().eq('id', id)
      if (error) throw error
      setUserReview(null)
      await fetchReviews()
    } catch (e) {
      console.error('Error deleting review:', e)
    }
  }

  async function voteReview(reviewId, vote) {
    if (!isSupabaseReady()) return
    try {
      const { data: existing } = await supabase.from('review_votes').select('id, vote').eq('review_id', reviewId).single()

      if (existing) {
        if (existing.vote === vote) {
          await supabase.from('review_votes').delete().eq('id', existing.id)
        } else {
          await supabase.from('review_votes').update({ vote }).eq('id', existing.id)
        }
      } else {
        await supabase.from('review_votes').insert({ review_id: reviewId, vote })
      }
    } catch {
      /* ignore unique violations */
    }
  }

  return { reviews, userReview, loading, submitting, submitReview, deleteReview, voteReview, refresh: fetchReviews }
}
