import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { getToken } from '../lib/auth'

export function useComments(contentId, mediaType = 'anime', episodeNumber = null) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchComments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ anilist_id: String(contentId), media_type: mediaType })
      if (episodeNumber) params.set('episode_number', String(episodeNumber))
      const res = await fetch(`/api/comments?${params}`)
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      setComments(json.data || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [contentId, mediaType, episodeNumber])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  async function addComment(content, rating = null, parentId = null) {
    if (!user) return
    const token = await getToken()
    try {
      const body = {
        anilist_id: typeof contentId === 'number' ? contentId : parseInt(contentId, 10),
        media_type: mediaType,
        content,
        rating,
        parent_id: parentId,
      }
      if (episodeNumber) body.episode_number = episodeNumber
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.code === 'RATE_LIMIT') {
          const err = new Error(json.message || 'Rate limit exceeded')
          err.code = 'RATE_LIMIT'
          throw err
        }
        const err = new Error(json.error || 'Failed to add comment')
        err.code = 'UNKNOWN'
        throw err
      }
      await fetchComments()
      return json.data
    } catch (e) {
      setError(e.message)
      throw e
    }
  }

  async function deleteComment(commentId) {
    if (!user) return
    const token = await getToken()
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(await res.text())
      await fetchComments()
    } catch (e) {
      setError(e.message)
    }
  }

  async function toggleLike(commentId) {
    if (!user) return
    const token = await getToken()
    try {
      const res = await fetch(`/api/comments/${commentId}/likes`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(await res.text())
      await fetchComments()
    } catch (e) {
      setError(e.message)
    }
  }

  return { comments, loading, error, addComment, deleteComment, toggleLike, refresh: fetchComments }
}
