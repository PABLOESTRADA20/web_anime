import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { getToken } from '../lib/auth'

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/profile', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!res.ok) throw new Error('Failed to fetch')
      const { data } = await res.json()
      setProfile(data || null)
    } catch {
      /* ignore */
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  async function ensureProfile() {
    try {
      const token = await getToken()
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ensure: true }),
      })
      if (!res.ok) throw new Error('Failed to ensure profile')
      const { data } = await res.json()
      if (data) setProfile(data)
      return data
    } catch {
      return null
    }
  }

  async function updateProfile(updates) {
    if (!user) throw new Error('Not authenticated')
    const token = await getToken()
    setLoading(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error(await res.text())
      const { data } = await res.json()
      setProfile(data)
      setLoading(false)
      return data
    } catch (e) {
      setLoading(false)
      throw e
    }
  }

  return { profile, loading, fetchProfile, updateProfile, ensureProfile }
}
