import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useNovelHistory() {
  const { user } = useAuth()
  const [history, setHistory] = useState([])

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  }, [])

  const fetchHistory = useCallback(async () => {
    if (!user) return
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch('/api/novel/history', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setHistory(data || [])
    } catch { setHistory([]) }
  }, [user, getToken])

  useEffect(() => {
    if (!user) { setHistory([]); return }
    fetchHistory()
  }, [user, fetchHistory])

  async function saveProgress(novelSlug, chapterNumber, chapterTitle, novelTitle, cover, scrollPercent = 0) {
    if (!user) return
    const token = await getToken()
    if (!token) return
    try {
      await fetch('/api/novel/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ novel_slug: novelSlug, chapter_number: chapterNumber, chapter_title: chapterTitle, novel_title: novelTitle, cover, scroll_percent: scrollPercent }),
      })
      fetchHistory()
    } catch { /* silent */ }
  }

  function getLatestChapter(novelSlug) {
    return history.filter((h) => h.novel_slug === novelSlug).sort((a, b) => b.chapter_number - a.chapter_number)[0] || null
  }

  function getChapterProgress(novelSlug, chapterNumber) {
    return history.find((h) => h.novel_slug === novelSlug && h.chapter_number === chapterNumber)?.scroll_percent || 0
  }

  function isChapterRead(novelSlug, chapterNumber) {
    return history.some((h) => h.novel_slug === novelSlug && h.chapter_number === chapterNumber)
  }

  return { history, saveProgress, getLatestChapter, getChapterProgress, isChapterRead }
}
