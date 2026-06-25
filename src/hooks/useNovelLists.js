import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useNovelLists() {
  const { user } = useAuth()
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLists = useCallback(async () => {
    if (!user || !isSupabaseReady()) return
    const { data } = await supabase.from('novel_lists').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
    setLists(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) {
      setLists([])
      setLoading(false)
      return
    }
    fetchLists()
  }, [user, fetchLists])

  async function setListStatus(slug, title, cover, status) {
    if (!user) return
    const existing = lists.find((l) => l.novel_slug === slug)
    if (existing) {
      if (existing.status === status) {
        await supabase.from('novel_lists').delete().eq('id', existing.id)
      } else {
        await supabase.from('novel_lists').update({ status, updated_at: new Date().toISOString() }).eq('id', existing.id)
      }
    } else {
      await supabase.from('novel_lists').insert({ user_id: user.id, novel_slug: slug, title, cover, status })
    }
    await fetchLists()
  }

  function getListStatus(slug) {
    return lists.find((l) => l.novel_slug === slug)?.status || null
  }

  function getUserList(status) {
    return lists.filter((l) => l.status === status)
  }

  return { lists, loading, setListStatus, getListStatus, getUserList }
}
