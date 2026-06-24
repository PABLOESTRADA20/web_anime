import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useWatchParty(anilistId, episodeNumber, videoRef) {
  const { user } = useAuth()
  const [participants, setParticipants] = useState([])
  const [partyId, setPartyId] = useState(null)
  const [connected, setConnected] = useState(false)
  const channelRef = useRef(null)
  const syncingRef = useRef(false)

  const roomId = anilistId && episodeNumber ? `wp:${anilistId}:${episodeNumber}` : null

  const leave = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setConnected(false)
    setPartyId(null)
    setParticipants([])
  }, [])

  const join = useCallback(async () => {
    if (!roomId || !user || !isSupabaseReady() || !videoRef?.current) return

    leave()

    const channel = supabase.channel(roomId, {
      config: {
        broadcast: { self: true, ack: false },
        presence: { key: user.id },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.values(state)
          .flat()
          .map((p) => ({
            id: p.id,
            email: p.email?.split('@')[0] || 'Anónimo',
          }))
        setParticipants(users)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setParticipants((prev) => {
          const existing = new Set(prev.map((p) => p.id))
          const newUsers = newPresences
            .filter((p) => !existing.has(p.id))
            .map((p) => ({ id: p.id, email: p.email?.split('@')[0] || 'Anónimo' }))
          return [...prev, ...newUsers]
        })
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setParticipants((prev) => prev.filter((p) => p.id !== key))
      })
      .on('broadcast', { event: 'sync' }, ({ payload }) => {
        if (syncingRef.current) return
        const video = videoRef.current
        if (!video) return

        switch (payload.action) {
          case 'play':
            if (video.paused && Math.abs(video.currentTime - payload.time) > 2) {
              video.currentTime = payload.time
            }
            video.play().catch(() => {})
            break
          case 'pause':
            video.pause()
            if (Math.abs(video.currentTime - payload.time) > 2) {
              video.currentTime = payload.time
            }
            break
          case 'seek':
            video.currentTime = payload.time
            break
        }
      })

    channelRef.current = channel

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: user.id,
          email: user.email,
          online_at: new Date().toISOString(),
        })
        setConnected(true)
        setPartyId(roomId)
      }
    })
  }, [roomId, user, videoRef, leave])

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  const broadcast = useCallback(
    (action, time) => {
      if (!channelRef.current || !connected) return
      syncingRef.current = true
      channelRef.current.send({
        type: 'broadcast',
        event: 'sync',
        payload: { action, time },
      })
      setTimeout(() => {
        syncingRef.current = false
      }, 100)
    },
    [connected],
  )

  return { join, leave, broadcast, participants, connected, partyId }
}
