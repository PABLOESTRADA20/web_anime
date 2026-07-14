import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { getToken } from '../lib/auth'
import { ACHIEVEMENTS, xpProgress, levelFromXp } from '../lib/achievements'

export function useGamification() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const initialLoadDone = useRef(false)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setAchievements([])
      setLoading(false)
      initialLoadDone.current = false
      return
    }
    setLoading(true)
    ;(async () => {
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      fetch('/api/profile', { headers })
        .then((res) => res.json())
        .then((json) => {
          const data = json.data
          if (data && data.xp !== undefined) {
            setProfile({ xp: data.xp, level: data.level })
          } else {
            fetch('/api/profile', {
              method: 'PUT',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ ensure: true }),
            })
              .then((r) => r.json())
              .then((j) => {
                const p = j.data
                if (p) setProfile({ xp: p.xp ?? 0, level: p.level ?? 1 })
              })
            setProfile({ xp: 0, level: 1 })
          }
          setAchievements(data?.achievements || [])
        })
        .catch(() => {})
        .finally(() => {
          setLoading(false)
          initialLoadDone.current = true
        })
    })()
  }, [user])

  const addXp = useCallback(
    async (amount, reason) => {
      if (!user || !amount) return null
      const oldXp = profile?.xp ?? 0
      const newXp = Math.max(0, oldXp + amount)
      const newLevel = levelFromXp(newXp)
      try {
        const token = await getToken()
        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ xp: amount }),
        })
        if (res.ok) {
          const { data } = await res.json()
          if (data) setProfile(data)
        } else {
          setProfile((p) => (p ? { ...p, xp: newXp, level: newLevel } : p))
        }
      } catch {
        setProfile((p) => (p ? { ...p, xp: newXp, level: newLevel } : p))
      }
      const leveledUp = newLevel > (profile?.level ?? 1)
      return { xp: newXp, level: newLevel, leveledUp, reason }
    },
    [user, profile],
  )

  const checkAchievements = useCallback(
    async (stats) => {
      if (!user) return []
      const unlockedIds = new Set(achievements.map((a) => a.achievement_id))
      const newlyUnlocked = []

      for (const ach of ACHIEVEMENTS) {
        if (unlockedIds.has(ach.id)) continue
        const earned = checkEarned(ach.id, stats)
        if (earned) {
          try {
            const token = await getToken()
            const res = await fetch('/api/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({ achievement_id: ach.id }),
            })
            if (res.ok) {
              newlyUnlocked.push(ach)
              unlockedIds.add(ach.id)
              addXp(ach.xp, `achievement:${ach.id}`)
            }
          } catch {
            /* ignore */
          }
        }
      }

      if (newlyUnlocked.length > 0) {
        try {
          const token = await getToken()
          const res = await fetch('/api/profile', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
          const json = await res.json()
          setAchievements(json.data?.achievements || [])
        } catch {
          /* ignore */
        }
      }

      return newlyUnlocked
    },
    [user, achievements, addXp],
  )

  const unlockedSet = new Set(achievements.map((a) => a.achievement_id))
  const progress = profile ? xpProgress(profile.xp) : null

  return { profile, achievements, unlockedSet, progress, loading, addXp, checkAchievements }
}

function checkEarned(id, stats) {
  if (!stats) return false
  switch (id) {
    case 'first_episode':
      return (stats.episodesWatched || 0) >= 1
    case 'episode_50':
      return (stats.episodesWatched || 0) >= 50
    case 'episode_100':
      return (stats.episodesWatched || 0) >= 100
    case 'episode_500':
      return (stats.episodesWatched || 0) >= 500
    case 'episode_1000':
      return (stats.episodesWatched || 0) >= 1000
    case 'first_manga':
      return (stats.mangaRead || 0) >= 1
    case 'manga_50':
      return (stats.mangaRead || 0) >= 50
    case 'manga_100':
      return (stats.mangaRead || 0) >= 100
    case 'first_novel':
      return (stats.novelRead || 0) >= 1
    case 'novel_50':
      return (stats.novelRead || 0) >= 50
    case 'first_review':
      return (stats.reviewsWritten || 0) >= 1
    case 'review_10':
      return (stats.reviewsWritten || 0) >= 10
    case 'first_favorite':
      return (stats.favorites || 0) >= 1
    case 'favorite_25':
      return (stats.favorites || 0) >= 25
    case 'favorite_100':
      return (stats.favorites || 0) >= 100
    case 'watch_party':
      return (stats.watchParties || 0) >= 1
    case 'collector':
      return (stats.collections || 0) >= 3
    default:
      return false
  }
}
