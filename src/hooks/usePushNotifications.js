import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = 'BM8M-xS2XiyO9jufJKUVNFpGHKl155PT4GYXzIBKPWu65bQDW1FX82mMTp3v5n3bGz1BlwoBxdMH7XKZNv53CU'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState(Notification.permission)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSupported('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window)
  }, [])

  useEffect(() => {
    if (!supported) return
    async function check() {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    }
    check()
  }, [supported])

  const subscribe = useCallback(async () => {
    if (!supported) return
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      setPermission(permission)
      if (permission !== 'granted') throw new Error('Permiso denegado')

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
      if (!session) throw new Error('Debes iniciar sesión')

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: session.user.id,
          endpoint: sub.endpoint,
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
          auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))),
        },
        { onConflict: 'user_id, endpoint' },
      )

      if (error) throw error
      setSubscribed(true)
    } catch (e) {
      console.error('Push subscribe error:', e)
      throw e
    } finally {
      setLoading(false)
    }
  }, [supported])

  const unsubscribe = useCallback(async () => {
    if (!supported) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        await supabase.from('push_subscriptions').delete().eq('user_id', session.user.id)
      }
      setSubscribed(false)
    } catch (e) {
      console.error('Push unsubscribe error:', e)
    } finally {
      setLoading(false)
    }
  }, [supported])

  return { supported, permission, subscribed, subscribe, unsubscribe, loading }
}
