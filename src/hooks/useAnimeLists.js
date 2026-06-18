import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useAnimeLists() {
  const { user } = useAuth()
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLists = useCallback(async () => {
    if (!user || !isSupabaseReady()) return
    const { data } = await supabase
      .from('anime_lists')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    setLists(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) { setLists([]); setLoading(false); return }
    fetchLists()
  }, [user, fetchLists])

  async function setListStatus(anilistId, title, image, status) {
    if (!user) return
    const existing = lists.find((l) => l.anilist_id === anilistId)
    if (existing) {
      if (existing.status === status) {
        await supabase.from('anime_lists').delete().eq('id', existing.id)
      } else {
        await supabase.from('anime_lists').update({ status, updated_at: new Date().toISOString() }).eq('id', existing.id)
      }
    } else {
      await supabase.from('anime_lists').insert({
        user_id: user.id,
        anilist_id: anilistId,
        title,
        image,
        status,
      })
    }
    await fetchLists()
  }

  function getListStatus(anilistId) {
    return lists.find((l) => l.anilist_id === anilistId)?.status || null
  }

  function getUserList(status) {
    return lists.filter((l) => l.status === status)
  }

  return { lists, loading, setListStatus, getListStatus, getUserList }
}
