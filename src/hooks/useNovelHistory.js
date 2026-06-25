import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useNovelHistory() {
  const { user } = useAuth()
  const [history, setHistory] = useState([])

  const fetchHistory = useCallback(async () => {
    if (!user || !isSupabaseReady()) return
    const { data } = await supabase
      .from('novel_history')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50)
    setHistory(data || [])
  }, [user])

  useEffect(() => {
    if (!user) {
      setHistory([])
      return
    }
    fetchHistory()
  }, [user, fetchHistory])

  async function saveProgress(novelSlug, chapterNumber, chapterTitle, novelTitle, cover) {
    if (!user || !isSupabaseReady()) return
    const { data: existing } = await supabase
      .from('novel_history')
      .select('id')
      .eq('user_id', user.id)
      .eq('novel_slug', novelSlug)
      .eq('chapter_number', chapterNumber)
      .maybeSingle()
    if (existing) {
      await supabase.from('novel_history').update({ updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('novel_history').insert({
        user_id: user.id,
        novel_slug: novelSlug,
        chapter_number: chapterNumber,
        chapter_title: chapterTitle,
        novel_title: novelTitle,
        cover,
      })
    }
    fetchHistory()
  }

  function getLatestChapter(novelSlug) {
    return history.filter((h) => h.novel_slug === novelSlug).sort((a, b) => b.chapter_number - a.chapter_number)[0] || null
  }

  function isChapterRead(novelSlug, chapterNumber) {
    return history.some((h) => h.novel_slug === novelSlug && h.chapter_number === chapterNumber)
  }

  return { history, saveProgress, getLatestChapter, isChapterRead }
}
