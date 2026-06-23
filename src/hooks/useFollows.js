import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useFollows(targetUserId) {
  const { user } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchCounts = useCallback(async () => {
    if (!targetUserId || !isSupabaseReady()) return
    const [followerRes, followingRes] = await Promise.all([
      supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', targetUserId),
      supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', targetUserId),
    ])
    setFollowerCount(followerRes.count ?? 0)
    setFollowingCount(followingRes.count ?? 0)
  }, [targetUserId])

  const checkFollow = useCallback(async () => {
    if (!user || !targetUserId || !isSupabaseReady()) { setLoading(false); return }
    const { data } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle()
    setIsFollowing(!!data)
    setLoading(false)
  }, [user, targetUserId])

  useEffect(() => { fetchCounts() }, [fetchCounts])
  useEffect(() => { checkFollow() }, [checkFollow])

  async function follow() {
    if (!user || !targetUserId) throw new Error('Debes iniciar sesión')
    const { error } = await supabase.from('user_follows').insert({ follower_id: user.id, following_id: targetUserId })
    if (error) throw error
    setIsFollowing(true)
    setFollowerCount(prev => prev + 1)
  }

  async function unfollow() {
    if (!user || !targetUserId) throw new Error('Debes iniciar sesión')
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
    if (error) throw error
    setIsFollowing(false)
    setFollowerCount(prev => Math.max(0, prev - 1))
  }

  return { isFollowing, followerCount, followingCount, loading, follow, unfollow, refetch: fetchCounts }
}

export function useFollowedUsers() {
  const { user } = useAuth()
  const [followedIds, setFollowedIds] = useState([])

  const fetchFollowed = useCallback(async () => {
    if (!user || !isSupabaseReady()) { setFollowedIds([]); return }
    const { data } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id)
    setFollowedIds(data?.map(f => f.following_id) || [])
  }, [user])

  useEffect(() => { fetchFollowed() }, [fetchFollowed])

  return { followedIds, refetch: fetchFollowed }
}
