import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { getToken } from '../lib/auth'

export function useAdmin() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkAdmin = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    try {
      const token = await getToken()
      if (!token) {
        setLoading(false)
        return
      }
      const res = await fetch('/api/admin/check', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setIsAdmin(false)
        setLoading(false)
        return
      }
      const json = await res.json()
      setIsAdmin(!!json.data?.is_admin)
    } catch {
      setIsAdmin(false)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    checkAdmin()
  }, [checkAdmin])

  async function bootstrapAdmin() {
    if (!user) throw new Error('Debes iniciar sesión')
    const token = await getToken()
    if (!token) throw new Error('Debes iniciar sesión')
    const res = await fetch('/api/admin/bootstrap', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Failed to bootstrap admin')
    setIsAdmin(true)
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
    try {
      const token = await getToken()
      if (!token) {
        setError('Not authenticated')
        setLoading(false)
        return
      }
      const res = await fetch(`/api/admin/moderation?table=${table}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setError('Failed to fetch')
        setItems([])
      } else {
        const json = await res.json()
        setItems(json.data || [])
      }
    } catch (e) {
      setError(e.message)
      setItems([])
    }
    setLoading(false)
  }, [table])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  async function updateStatus(id, status) {
    const token = await getToken()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch(`/api/admin/moderation?table=${table}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    })
    if (!res.ok) throw new Error('Failed to update')
    setItems((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)))
  }

  async function removeItem(id) {
    const token = await getToken()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch(`/api/admin/moderation?table=${table}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) throw new Error('Failed to delete')
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
