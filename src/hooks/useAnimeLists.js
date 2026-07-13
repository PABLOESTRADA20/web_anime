import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const VAPID_PUBLIC_KEY = 'BM8M-xS2XiyO9jufJKUVNFpGHKl155PT4GYXzIBKPWu65bQDW1FX82mMTp3v5n3bGz1BlwoBxdMH7XKZNv53CU'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function useAnimeLists() {
  const { user } = useAuth()
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  }, [])

  const ensurePushSub = useCallback(async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission !== 'granted') return
    try {
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        await supabase.from('push_subscriptions').upsert(
          {
            user_id: session.user.id,
            endpoint: sub.endpoint,
            p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
            auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))),
          },
          { onConflict: 'user_id, endpoint' },
        )
      }
    } catch {
      /* push not available */
    }
  }, [])

  const fetchLists = useCallback(async () => {
    if (!user) return
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/anime/lists', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const { data } = await res.json()
      setLists(data || [])
    } catch {
      setLists([])
    }
    setLoading(false)
  }, [user, getToken])

  useEffect(() => {
    if (!user) {
      setLists([])
      setLoading(false)
      return
    }
    fetchLists()
  }, [user, fetchLists])

  async function setListStatus(anilistId, title, image, status) {
    if (!user) return
    const token = await getToken()
    if (!token) return
    const existing = lists.find((l) => l.anilist_id === anilistId)
    if (existing) {
      if (existing.status === status) {
        await fetch('/api/anime/lists', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ anilist_id: anilistId }),
        })
      } else {
        await fetch('/api/anime/lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ anilist_id: anilistId, title, image, status }),
        })
      }
    } else {
      await fetch('/api/anime/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ anilist_id: anilistId, title, image, status }),
      })
    }
    if (status === 'watching') ensurePushSub()
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
