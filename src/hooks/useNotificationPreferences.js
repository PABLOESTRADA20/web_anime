import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

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
    if (!user || !isSupabaseReady()) {
      setLoading(false)
      return
    }
    const { data } = await supabase.from('notification_preferences').select('*').eq('user_id', user.id).maybeSingle()
    setPrefs(data || null)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchPrefs()
  }, [fetchPrefs])

  async function ensurePrefs() {
    if (!user || !isSupabaseReady()) return
    const { data } = await supabase
      .from('notification_preferences')
      .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
      .select()
      .single()
    if (data) setPrefs(data)
    return data
  }

  async function updatePref(key, value) {
    if (!user || !isSupabaseReady()) throw new Error('Not authenticated')
    const updates = { user_id: user.id, [key]: value, updated_at: new Date().toISOString() }
    const { data, error } = await supabase.from('notification_preferences').upsert(updates, { onConflict: 'user_id' }).select().single()
    if (error) throw error
    setPrefs(data)
    return data
  }

  const merged = { ...DEFAULTS, ...(prefs || {}) }

  return { prefs: merged, loading, fetchPrefs, ensurePrefs, updatePref }
}
