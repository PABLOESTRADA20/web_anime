import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useWatchParty(anilistId, episodeNumber, videoRef) {
  const { user } = useAuth()
  const [participants, setParticipants] = useState([])
  const [partyId, setPartyId] = useState(null)
  const [connected, setConnected] = useState(false)
  const [hostId, setHostId] = useState(null)
  const [messages, setMessages] = useState([])
  const [reactions, setReactions] = useState([])
  const channelRef = useRef(null)
  const syncingRef = useRef(false)

  const roomId = anilistId && episodeNumber ? `wp:${anilistId}:${episodeNumber}` : null
  const amHost = connected && hostId === user?.id

  const leave = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setConnected(false)
    setPartyId(null)
    setParticipants([])
    setHostId(null)
    setMessages([])
    setReactions([])
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
        if (!hostId && users.length > 0) {
          setHostId(users[0].id)
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setParticipants((prev) => {
          const existing = new Set(prev.map((p) => p.id))
          const newUsers = newPresences
            .filter((p) => !existing.has(p.id))
            .map((p) => ({ id: p.id, email: p.email?.split('@')[0] || 'Anónimo' }))
          if (prev.length === 0 && newUsers.length > 0) {
            setHostId(newUsers[0].id)
          }
          return [...prev, ...newUsers]
        })
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setParticipants((prev) => {
          const remaining = prev.filter((p) => p.id !== key)
          if (key === hostId && remaining.length > 0) {
            setHostId(remaining[0].id)
          }
          return remaining
        })
      })
      .on('broadcast', { event: 'sync' }, ({ payload }) => {
        if (syncingRef.current) return
        if (!payload.isHost) return
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
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setMessages((prev) => [...prev, { id: payload.id, text: payload.text, sender: payload.sender, timestamp: payload.timestamp }])
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const r = { id: payload.id, emoji: payload.emoji, sender: payload.sender }
        setReactions((prev) => [...prev, r])
        setTimeout(() => {
          setReactions((prev) => prev.filter((x) => x.id !== r.id))
        }, 3000)
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
  }, [roomId, user, videoRef, leave, hostId])

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  const broadcast = useCallback(
    (action, time) => {
      if (!channelRef.current || !connected || !amHost) return
      syncingRef.current = true
      channelRef.current.send({
        type: 'broadcast',
        event: 'sync',
        payload: { action, time, isHost: true },
      })
      setTimeout(() => {
        syncingRef.current = false
      }, 100)
    },
    [connected, amHost],
  )

  const sendMessage = useCallback(
    (text) => {
      if (!channelRef.current || !connected || !text.trim()) return
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat',
        payload: {
          id: `${user.id}-${Date.now()}`,
          text: text.trim(),
          sender: user.email?.split('@')[0] || 'Anónimo',
          timestamp: Date.now(),
        },
      })
    },
    [connected, user],
  )

  const sendReaction = useCallback(
    (emoji) => {
      if (!channelRef.current || !connected) return
      channelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: {
          id: `${user.id}-${Date.now()}`,
          emoji,
          sender: user.email?.split('@')[0] || 'Anónimo',
        },
      })
    },
    [connected, user],
  )

  const requestHost = useCallback(() => {
    if (!channelRef.current || !connected) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'requestHost',
      payload: { id: user.id },
    })
  }, [connected, user])

  return {
    join,
    leave,
    broadcast,
    sendMessage,
    sendReaction,
    requestHost,
    participants,
    connected,
    partyId,
    hostId,
    amHost,
    messages,
    reactions,
  }
}
