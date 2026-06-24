import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/community-episodes` : null

const PROVIDER_NAMES = {
  mega: 'MEGA',
  google_drive: 'Google Drive',
  youtube: 'YouTube',
  streamtape: 'Streamtape',
  fembed: 'Fembed',
  okru: 'Ok.ru',
  mediafire: 'MediaFire',
  zippyshare: 'Zippyshare',
  direct: 'Directo',
  other: 'Otro',
}

const PROVIDER_COLORS = {
  mega: 'text-red-400 bg-red-500/10',
  google_drive: 'text-green-400 bg-green-500/10',
  youtube: 'text-red-400 bg-red-500/10',
  streamtape: 'text-orange-400 bg-orange-500/10',
  fembed: 'text-blue-400 bg-blue-500/10',
  okru: 'text-yellow-400 bg-yellow-500/10',
  direct: 'text-purple-400 bg-purple-500/10',
  other: 'text-text-secondary bg-surface',
}

const LANGUAGE_LABELS = {
  sub: 'SUB',
  dub: 'DUB',
  latam: 'LATAM',
}

export function getProviderLabel(provider) {
  return PROVIDER_NAMES[provider] || provider || 'Desconocido'
}

export function getProviderColor(provider) {
  return PROVIDER_COLORS[provider] || PROVIDER_COLORS.other
}

export function getLanguageLabel(lang) {
  return LANGUAGE_LABELS[lang] || lang || 'SUB'
}

function detectProvider(url) {
  if (!url) return 'other'
  const u = url.toLowerCase()
  if (u.includes('mega.nz')) return 'mega'
  if (u.includes('drive.google.com')) return 'google_drive'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  if (u.includes('streamtape')) return 'streamtape'
  if (u.includes('fembed') || u.includes('fcdn')) return 'fembed'
  if (u.includes('ok.ru') || u.includes('ok.ru')) return 'okru'
  if (u.includes('mediafire')) return 'mediafire'
  if (u.includes('zippyshare')) return 'zippyshare'
  if (u.endsWith('.mp4') || u.endsWith('.m3u8') || u.includes('.m3u8')) return 'direct'
  return 'other'
}

export function useCommunityEpisodes(anilistId, episodeNumber) {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchLinks = useCallback(async () => {
    if (!API_URL || !anilistId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ anilist_id: anilistId })
      if (episodeNumber) params.set('episode_number', episodeNumber)
      const res = await fetch(`${API_URL}?${params}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      setLinks(json.data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [anilistId, episodeNumber])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  return { links, loading, error, refetch: fetchLinks }
}

export function useSubmitEpisode() {
  const [submitting, setSubmitting] = useState(false)

  const submit = useCallback(async ({ anilist_id, episode_number, url, language, title }) => {
    if (!API_URL) throw new Error('API no configurada')
    setSubmitting(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Debes iniciar sesión')

      const provider_name = detectProvider(url)

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'submit',
          anilist_id,
          episode_number,
          url,
          provider_name,
          language: language || 'latam',
          title: title || '',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al enviar')
      }
      return await res.json()
    } finally {
      setSubmitting(false)
    }
  }, [])

  return { submit, submitting }
}

export function useEpisodeVote() {
  const [voting, setVoting] = useState({})

  const vote = useCallback(async (episodeId, value) => {
    if (!API_URL) throw new Error('API no configurada')
    setVoting((prev) => ({ ...prev, [episodeId]: true }))
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Debes iniciar sesión')

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'vote',
          episode_id: episodeId,
          vote: value,
        }),
      })
      if (!res.ok) throw new Error('Error al votar')
      return await res.json()
    } finally {
      setVoting((prev) => ({ ...prev, [episodeId]: false }))
    }
  }, [])

  return { vote, voting }
}
