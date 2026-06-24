import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useComments(anilistId, mediaType = 'anime', episodeNumber = null) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchComments = useCallback(async () => {
    if (!isSupabaseReady()) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('comments')
        .select(
          `
          *,
          user:user_id ( email ),
          likes:comment_likes ( count )
        `,
        )
        .eq('anilist_id', anilistId)
        .eq('media_type', mediaType)
        .is('parent_id', null)

      if (episodeNumber) {
        query = query.eq('episode_number', episodeNumber)
      }

      const { data, error: err } = await query.order('created_at', { ascending: false })

      if (err) throw err

      // Fetch replies separately for each top-level comment
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from('comments')
            .select('*, user:user_id ( email )')
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true })
          return { ...comment, replies: replies || [] }
        }),
      )

      setComments(commentsWithReplies)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [anilistId, mediaType, episodeNumber])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  async function addComment(content, rating = null, parentId = null) {
    if (!user || !isSupabaseReady()) return
    try {
      const insertData = {
        user_id: user.id,
        anilist_id: parseInt(anilistId, 10),
        media_type: mediaType,
        content,
        rating,
        parent_id: parentId,
      }
      if (episodeNumber) insertData.episode_number = episodeNumber

      const { data, error: err } = await supabase.from('comments').insert(insertData).select().single()

      if (err) throw err
      await fetchComments()
      return data
    } catch (e) {
      setError(e.message)
      throw e
    }
  }

  async function deleteComment(commentId) {
    if (!user || !isSupabaseReady()) return
    try {
      const { error: err } = await supabase.from('comments').delete().eq('id', commentId).eq('user_id', user.id)

      if (err) throw err
      await fetchComments()
    } catch (e) {
      setError(e.message)
    }
  }

  async function toggleLike(commentId) {
    if (!user || !isSupabaseReady()) return
    try {
      const { data: existing } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .single()

      if (existing) {
        await supabase.from('comment_likes').delete().eq('id', existing.id)
      } else {
        await supabase.from('comment_likes').insert({ user_id: user.id, comment_id: commentId })
      }
      await fetchComments()
    } catch (e) {
      setError(e.message)
    }
  }

  return { comments, loading, error, addComment, deleteComment, toggleLike, refresh: fetchComments }
}
