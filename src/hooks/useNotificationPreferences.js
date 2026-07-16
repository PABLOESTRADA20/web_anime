import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { getToken } from '../lib/auth'

const DEFAULTS = {
  new_episode: true,
  new_review: true,
  comment_reply: true,
  review_vote: true,
  weekly_digest: false,
}

export function useNotificationPreferences() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchPrefs = useCallback(async () => {
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
      const res = await fetch('/api/notification-preferences', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setLoading(false)
        return
      }
      const json = await res.json()
      setPrefs(json.data || null)
    } catch {
      setPrefs(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchPrefs()
  }, [fetchPrefs])

  async function ensurePrefs() {
    if (!user) return
    const token = await getToken()
    if (!token) return
    const res = await fetch('/api/notification-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      const json = await res.json()
      setPrefs(json.data)
    }
  }

  async function updatePref(key, value) {
    if (!user) throw new Error('Not authenticated')
    const token = await getToken()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch('/api/notification-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ [key]: value }),
    })
    if (!res.ok) throw new Error('Failed to update preferences')
    const json = await res.json()
    setPrefs(json.data)
    return json.data
  }

  const merged = { ...DEFAULTS, ...(prefs || {}) }

  return { prefs: merged, loading, fetchPrefs, ensurePrefs, updatePref }
}
