import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useAdmin() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkAdmin = useCallback(async () => {
    if (!user || !isSupabaseReady()) {
      setLoading(false)
      return
    }
    const { data } = await supabase.from('admin_users').select('id').eq('user_id', user.id).maybeSingle()
    setIsAdmin(!!data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    checkAdmin()
  }, [checkAdmin])

  async function bootstrapAdmin() {
    if (!user || !isSupabaseReady()) throw new Error('Debes iniciar sesión')
    const { data, error } = await supabase.from('admin_users').insert({ user_id: user.id }).select().single()
    if (error) throw error
    setIsAdmin(true)
    return data
  }

  return { isAdmin, loading, checkAdmin, bootstrapAdmin }
}

function useModerationTable(table) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.from(table).select('*').order('created_at', { ascending: false })
    if (err) {
      setError(err.message)
      setItems([])
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }, [table])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  async function updateStatus(id, status) {
    const { error } = await supabase.from(table).update({ status }).eq('id', id)
    if (error) throw error
    setItems((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)))
  }

  async function removeItem(id) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    setItems((prev) => prev.filter((e) => e.id !== id))
  }

  return { items, loading, error, refetch: fetchAll, updateStatus, removeItem }
}

export function useModeration() {
  return useModerationTable('community_episodes')
}

export function useMangaModeration() {
  return useModerationTable('community_manga_chapters')
}

export function useNovelModeration() {
  return useModerationTable('community_novel_chapters')
}
