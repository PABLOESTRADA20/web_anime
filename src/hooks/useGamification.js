import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
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
    Promise.all([
      supabase.from('user_profiles').select('xp, level').eq('id', user.id).single(),
      supabase.from('user_achievements').select('achievement_id, unlocked_at').eq('user_id', user.id),
    ])
      .then(([profileRes, achRes]) => {
        if (profileRes.data) {
          setProfile(profileRes.data)
        } else {
          supabase.from('user_profiles').upsert({ id: user.id, xp: 0, level: 1 }).then()
          setProfile({ xp: 0, level: 1 })
        }
        setAchievements(achRes.data || [])
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        initialLoadDone.current = true
      })
  }, [user])

  const addXp = useCallback(
    async (amount, reason) => {
      if (!user || !amount) return null
      const { data: current } = await supabase.from('user_profiles').select('xp, level').eq('id', user.id).single()
      const oldXp = current?.xp ?? profile?.xp ?? 0
      const newXp = Math.max(0, oldXp + amount)
      const newLevel = levelFromXp(newXp)
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ xp: newXp, level: newLevel, xp_updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select('xp, level')
        .single()
      if (!error && data) {
        setProfile(data)
      } else {
        setProfile((p) => (p ? { ...p, xp: newXp, level: newLevel } : p))
      }
      const leveledUp = newLevel > (current?.level ?? 1)
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
          const { error } = await supabase.from('user_achievements').insert({ user_id: user.id, achievement_id: ach.id })
          if (!error) {
            newlyUnlocked.push(ach)
            unlockedIds.add(ach.id)
            addXp(ach.xp, `achievement:${ach.id}`)
          }
        }
      }

      if (newlyUnlocked.length > 0) {
        const { data } = await supabase.from('user_achievements').select('achievement_id, unlocked_at').eq('user_id', user.id)
        setAchievements(data || [])
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
