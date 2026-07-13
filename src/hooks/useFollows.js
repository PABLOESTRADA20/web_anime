import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'

export function useFollows(targetUserId) {
  const { user } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchCounts = useCallback(async () => {
    if (!targetUserId) return
    try {
      const res = await fetch(`/api/follows?target_id=${encodeURIComponent(targetUserId)}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const { data } = await res.json()
      setFollowerCount(data.followerCount ?? 0)
      setFollowingCount(data.followingCount ?? 0)
      setIsFollowing(data.isFollowing ?? false)
    } catch { /* ignore */ }
  }, [targetUserId])

  const checkFollow = useCallback(async () => {
    if (!user || !targetUserId) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/follows?target_id=${encodeURIComponent(targetUserId)}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const { data } = await res.json()
      setIsFollowing(data.isFollowing ?? false)
    } catch { /* ignore */ }
    setLoading(false)
  }, [user, targetUserId])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])
  useEffect(() => {
    checkFollow()
  }, [checkFollow])

  async function follow() {
    if (!user || !targetUserId) throw new Error('Debes iniciar sesión')
    const res = await fetch('/api/follows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_id: targetUserId }),
    })
    if (!res.ok) throw new Error(await res.text())
    setIsFollowing(true)
    setFollowerCount((prev) => prev + 1)
  }

  async function unfollow() {
    if (!user || !targetUserId) throw new Error('Debes iniciar sesión')
    const res = await fetch(`/api/follows?target_id=${encodeURIComponent(targetUserId)}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(await res.text())
    setIsFollowing(false)
    setFollowerCount((prev) => Math.max(0, prev - 1))
  }

  return { isFollowing, followerCount, followingCount, loading, follow, unfollow, refetch: fetchCounts }
}

export function useFollowedUsers() {
  const { user } = useAuth()
  const [followedIds, setFollowedIds] = useState([])

  const fetchFollowed = useCallback(async () => {
    if (!user) {
      setFollowedIds([])
      return
    }
    try {
      const res = await fetch('/api/follows')
      if (!res.ok) throw new Error('Failed to fetch')
      const { data } = await res.json()
      setFollowedIds(data || [])
    } catch { /* ignore */ }
  }, [user])

  useEffect(() => {
    fetchFollowed()
  }, [fetchFollowed])

  return { followedIds, refetch: fetchFollowed }
}
