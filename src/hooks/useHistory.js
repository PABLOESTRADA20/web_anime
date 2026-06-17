import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useHistory() {
  const { user } = useAuth()
  const [history, setHistory] = useState([])

  const fetchHistory = useCallback(async () => {
    if (!user || !isSupabaseReady()) return
    const { data } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50)
    setHistory(data || [])
  }, [user])

  useEffect(() => {
    if (!user) { setHistory([]); return }
    fetchHistory()
  }, [user, fetchHistory])

  async function saveProgress(anilistId, episodeNumber, title, image, episodeId) {
    if (!user || !isSupabaseReady()) return
    const { data: existing } = await supabase
      .from('history')
      .select('id')
      .eq('user_id', user.id)
      .eq('anilist_id', anilistId)
      .eq('episode_number', episodeNumber)
      .maybeSingle()

    if (existing) {
      await supabase.from('history').update({ updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('history').insert({
        user_id: user.id,
        anilist_id: anilistId,
        episode_number: episodeNumber,
        title,
        image,
        episode_id: episodeId,
      })
    }
    fetchHistory()
  }

  return { history, saveProgress }
}
