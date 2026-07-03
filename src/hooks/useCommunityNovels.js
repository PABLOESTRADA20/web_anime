import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/community-novel-chapters` : null

const PROVIDER_NAMES = {
  novelbin: 'NovelBin',
  novelbuddy: 'NovelBuddy',
  readnovelfull: 'ReadNovelFull',
  novelplus: 'NovelPlus',
  lightnovelworld: 'LightNovelWorld',
  direct: 'Directo',
  other: 'Otro',
}

const PROVIDER_COLORS = {
  novelbin: 'text-blue-400 bg-blue-500/10',
  novelbuddy: 'text-green-400 bg-green-500/10',
  readnovelfull: 'text-purple-400 bg-purple-500/10',
  novelplus: 'text-orange-400 bg-orange-500/10',
  lightnovelworld: 'text-yellow-400 bg-yellow-500/10',
  direct: 'text-accent bg-accent/10',
  other: 'text-text-secondary bg-surface',
}

export function getNovelProviderLabel(provider) {
  return PROVIDER_NAMES[provider] || provider || 'Desconocido'
}

export function getNovelProviderColor(provider) {
  return PROVIDER_COLORS[provider] || PROVIDER_COLORS.other
}

function detectProvider(url) {
  if (!url) return 'other'
  const u = url.toLowerCase()
  if (u.includes('novelbin.net')) return 'novelbin'
  if (u.includes('novelbuddy.com')) return 'novelbuddy'
  if (u.includes('readnovelfull.com')) return 'readnovelfull'
  if (u.includes('novelplus.com')) return 'novelplus'
  if (u.includes('lightnovelworld.com')) return 'lightnovelworld'
  return 'other'
}

export function useCommunityNovelChapters(novelSlug, chapterNumber) {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchLinks = useCallback(async () => {
    if (!API_URL || !novelSlug) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ novel_slug: novelSlug })
      if (chapterNumber) params.set('chapter_number', chapterNumber)
      const res = await fetch(`${API_URL}?${params}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      setLinks(json.data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [novelSlug, chapterNumber])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  return { links, loading, error, refetch: fetchLinks }
}

export function useSubmitNovelChapter() {
  const [submitting, setSubmitting] = useState(false)

  const submit = useCallback(async ({ novel_slug, chapter_number, url, title }) => {
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
          novel_slug,
          chapter_number,
          url,
          provider_name,
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

export function useNovelChapterVote() {
  const [voting, setVoting] = useState({})

  const vote = useCallback(async (chapterId, value) => {
    if (!API_URL) throw new Error('API no configurada')
    setVoting((prev) => ({ ...prev, [chapterId]: true }))
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
          chapter_id: chapterId,
          vote: value,
        }),
      })
      if (!res.ok) throw new Error('Error al votar')
      return await res.json()
    } finally {
      setVoting((prev) => ({ ...prev, [chapterId]: false }))
    }
  }, [])

  return { vote, voting }
}
