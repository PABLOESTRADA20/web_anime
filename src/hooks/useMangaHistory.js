import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useMangaHistory() {
  const { user } = useAuth()
  const [mangaHistory, setMangaHistory] = useState([])

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  }, [])

  const fetchMangaHistory = useCallback(async () => {
    if (!user) return
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/manga/history', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const { data } = await res.json()
      setMangaHistory(data || [])
    } catch {
      setMangaHistory([])
    }
  }, [user, getToken])

  useEffect(() => {
    if (!user) {
      setMangaHistory([])
      return
    }
    fetchMangaHistory()
  }, [user, fetchMangaHistory])

  async function saveChapterProgress(anilistId, chapterNumber, chapterId, title, image, page = 1) {
    if (!user) return
    const token = await getToken()
    if (!token) return
    try {
      await fetch('/api/manga/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          anilist_id: anilistId,
          chapter_number: chapterNumber,
          chapter_id: chapterId,
          title,
          image,
          page,
        }),
      })
      fetchMangaHistory()
    } catch {
      /* silent */
    }
  }

  function getLatestChapter(anilistId) {
    return (
      mangaHistory.filter((h) => h.anilist_id === parseInt(anilistId, 10)).sort((a, b) => b.chapter_number - a.chapter_number)[0] || null
    )
  }

  function isChapterRead(anilistId, chapterNumber) {
    return mangaHistory.some((h) => h.anilist_id === parseInt(anilistId, 10) && h.chapter_number === chapterNumber)
  }

  return { mangaHistory, saveChapterProgress, getLatestChapter, isChapterRead }
}
