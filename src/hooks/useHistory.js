import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useHistory() {
  const { user } = useAuth()
  const [history, setHistory] = useState([])

  const fetchHistory = useCallback(async () => {
    if (!user || !isSupabaseReady()) return
    const { data } = await supabase.from('history').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(50)
    setHistory(data || [])
  }, [user])

  useEffect(() => {
    if (!user) {
      setHistory([])
      return
    }
    fetchHistory()
  }, [user, fetchHistory])

  const saveProgress = useCallback(
    async (anilistId, episodeNumber, title, image, episodeId, progress, duration) => {
      if (!user || !isSupabaseReady()) return
      const { data: existing } = await supabase
        .from('history')
        .select('id, progress, duration')
        .eq('user_id', user.id)
        .eq('anilist_id', anilistId)
        .eq('episode_number', episodeNumber)
        .maybeSingle()

      if (existing) {
        const update = { updated_at: new Date().toISOString() }
        if (progress !== undefined) update.progress = progress
        if (duration !== undefined) update.duration = duration
        await supabase.from('history').update(update).eq('id', existing.id)
      } else {
        await supabase.from('history').insert({
          user_id: user.id,
          anilist_id: anilistId,
          episode_number: episodeNumber,
          title,
          image,
          episode_id: episodeId,
          progress: progress || 0,
          duration: duration || 0,
        })
      }
      fetchHistory()
    },
    [user, fetchHistory],
  )

  return { history, saveProgress }
}
