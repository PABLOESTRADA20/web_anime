import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useNovelLists() {
  const { user } = useAuth()
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  }, [])

  const fetchLists = useCallback(async () => {
    if (!user) return
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/novel/lists', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setLists(data || [])
    } catch { setLists([]) }
    setLoading(false)
  }, [user, getToken])

  useEffect(() => {
    if (!user) { setLists([]); setLoading(false); return }
    fetchLists()
  }, [user, fetchLists])

  async function setListStatus(slug, title, cover, status) {
    if (!user) return
    const token = await getToken()
    if (!token) return
    const existing = lists.find((l) => l.novel_slug === slug)
    if (existing) {
      if (existing.status === status) {
        await fetch('/api/novel/lists', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ novel_slug: slug }) })
      } else {
        await fetch('/api/novel/lists', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ novel_slug: slug, title, cover, status }) })
      }
    } else {
      await fetch('/api/novel/lists', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ novel_slug: slug, title, cover, status }) })
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
