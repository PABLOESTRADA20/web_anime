import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'

export function useReviews(anilistId, mediaType = 'anime') {
  const { user } = useAuth()
  const [reviews, setReviews] = useState([])
  const [userReview, setUserReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reviews?anilist_id=${anilistId}&media_type=${mediaType}`)
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      const items = json.data || []
      setReviews(items)
      if (user) {
        const own = items.find((r) => r.user_id === user.id)
        setUserReview(own || null)
      }
    } catch (e) {
      console.error('Error fetching reviews:', e)
    }
    setLoading(false)
  }, [anilistId, mediaType, user])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  async function submitReview({ score, content, hasSpoilers }) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anilist_id: anilistId,
          media_type: mediaType,
          score,
          content,
          has_spoilers: hasSpoilers,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      await fetchReviews()
    } catch (e) {
      console.error('Error submitting review:', e)
    }
    setSubmitting(false)
  }

  async function deleteReview(id) {
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      setUserReview(null)
      await fetchReviews()
    } catch (e) {
      console.error('Error deleting review:', e)
    }
  }

  async function voteReview(reviewId, vote) {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote }),
      })
      if (!res.ok) throw new Error(await res.text())
      await fetchReviews()
    } catch (e) {
      console.error('Error voting:', e)
    }
  }

  return { reviews, userReview, loading, submitting, submitReview, deleteReview, voteReview, refresh: fetchReviews }
}
