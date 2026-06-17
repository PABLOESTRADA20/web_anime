import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useMangaHistory() {
  const { user } = useAuth()
  const [mangaHistory, setMangaHistory] = useState([])

  const fetchMangaHistory = useCallback(async () => {
    if (!user || !isSupabaseReady()) return
    const { data } = await supabase
      .from('manga_history')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50)
    setMangaHistory(data || [])
  }, [user])

  useEffect(() => {
    if (!user) { setMangaHistory([]); return }
    fetchMangaHistory()
  }, [user, fetchMangaHistory])

  async function saveChapterProgress(anilistId, chapterNumber, chapterId, title, image, page = 1) {
    if (!user || !isSupabaseReady()) return
    const { data: existing } = await supabase
      .from('manga_history')
      .select('id')
      .eq('user_id', user.id)
      .eq('anilist_id', anilistId)
      .eq('chapter_number', chapterNumber)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('manga_history')
        .update({ updated_at: new Date().toISOString(), page })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('manga_history')
        .insert({
          user_id: user.id,
          anilist_id: anilistId,
          chapter_number: chapterNumber,
          chapter_id: chapterId,
          title,
          image,
          page,
        })
    }
    fetchMangaHistory()
  }

  function getLatestChapter(anilistId) {
    return mangaHistory
      .filter((h) => h.anilist_id === parseInt(anilistId, 10))
      .sort((a, b) => b.chapter_number - a.chapter_number)[0] || null
  }

  function isChapterRead(anilistId, chapterNumber) {
    return mangaHistory.some(
      (h) => h.anilist_id === parseInt(anilistId, 10) && h.chapter_number === chapterNumber
    )
  }

  return { mangaHistory, saveChapterProgress, getLatestChapter, isChapterRead }
}
