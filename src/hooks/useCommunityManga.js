import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/community-manga-chapters` : null

const PROVIDER_NAMES = {
  mangadex: 'MangaDex',
  mangafire: 'MangaFire',
  mangakakalot: 'MangaKakalot',
  mangabat: 'MangaBat',
  mangasee: 'MangaSee',
  mangapanda: 'MangaPanda',
  mangareader: 'MangaReader',
  direct: 'Directo',
  other: 'Otro',
}

const PROVIDER_COLORS = {
  mangadex: 'text-blue-400 bg-blue-500/10',
  mangafire: 'text-orange-400 bg-orange-500/10',
  mangakakalot: 'text-green-400 bg-green-500/10',
  mangabat: 'text-yellow-400 bg-yellow-500/10',
  mangasee: 'text-purple-400 bg-purple-500/10',
  direct: 'text-accent bg-accent/10',
  other: 'text-text-secondary bg-surface',
}

export function getMangaProviderLabel(provider) {
  return PROVIDER_NAMES[provider] || provider || 'Desconocido'
}

export function getMangaProviderColor(provider) {
  return PROVIDER_COLORS[provider] || PROVIDER_COLORS.other
}

function detectProvider(url) {
  if (!url) return 'other'
  const u = url.toLowerCase()
  if (u.includes('mangadex.org')) return 'mangadex'
  if (u.includes('mangafire.to')) return 'mangafire'
  if (u.includes('mangakakalot.com')) return 'mangakakalot'
  if (u.includes('mangabat.com')) return 'mangabat'
  if (u.includes('mangasee123.com')) return 'mangasee'
  if (u.includes('mangapanda.com')) return 'mangapanda'
  if (u.includes('mangareader.to')) return 'mangareader'
  return 'other'
}

export function useCommunityMangaChapters(anilistId, chapterNumber) {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchLinks = useCallback(async () => {
    if (!API_URL || !anilistId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ anilist_id: anilistId })
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
  }, [anilistId, chapterNumber])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  return { links, loading, error, refetch: fetchLinks }
}

export function useSubmitMangaChapter() {
  const [submitting, setSubmitting] = useState(false)

  const submit = useCallback(async ({ anilist_id, chapter_number, url, title }) => {
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

export function useMangaChapterVote() {
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
