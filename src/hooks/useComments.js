import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useComments(anilistId, mediaType = 'anime') {
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
      const { data, error: err } = await supabase
        .from('comments')
        .select(`
          *,
          user:user_id ( email ),
          likes:comment_likes ( count ),
          replies:comments!parent_id ( * )
        `)
        .eq('anilist_id', anilistId)
        .eq('media_type', mediaType)
        .is('parent_id', null)
        .order('created_at', { ascending: false })

      if (err) throw err
      setComments(data || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [anilistId, mediaType])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  async function addComment(content, rating = null, parentId = null) {
    if (!user || !isSupabaseReady()) return
    const { data, error: err } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        anilist_id: parseInt(anilistId, 10),
        media_type: mediaType,
        content,
        rating,
        parent_id: parentId,
      })
      .select()
      .single()

    if (err) throw err
    await fetchComments()
    return data
  }

  async function deleteComment(commentId) {
    if (!user || !isSupabaseReady()) return
    const { error: err } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id)

    if (err) throw err
    await fetchComments()
  }

  async function toggleLike(commentId) {
    if (!user || !isSupabaseReady()) return
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
  }

  return { comments, loading, error, addComment, deleteComment, toggleLike, refresh: fetchComments }
}
