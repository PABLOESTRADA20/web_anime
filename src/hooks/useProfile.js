import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!user || !isSupabaseReady()) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
    setProfile(data || null)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  async function ensureProfile(userId) {
    if (!isSupabaseReady()) return null
    const { data } = await supabase
      .from('user_profiles')
      .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true })
      .select()
      .single()
    if (data) setProfile(data)
    return data
  }

  async function updateProfile(updates) {
    if (!user || !isSupabaseReady()) throw new Error('Not authenticated')
    setLoading(true)
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (error) {
      setLoading(false)
      throw error
    }
    setProfile(data)
    setLoading(false)
    return data
  }

  return { profile, loading, fetchProfile, updateProfile, ensureProfile }
}
