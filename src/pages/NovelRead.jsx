import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getChapterContent, getNovelChapters } from '../lib/novels'
import { useNovelHistory } from '../hooks/useNovelHistory'
import SeoHead from '../components/SeoHead'

export default function NovelRead() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const chapterNum = parseInt(searchParams.get('chapter') || '1', 10)
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chapters, setChapters] = useState([])
  const [settings, setSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('novelSettings') || '{}')
    } catch {
      return {}
    }
  })

  const contentRef = useRef(null)
  const { saveProgress } = useNovelHistory()
  const currentCh = chapters.find((c) => c.number === chapterNum)
  const prevCh = chapters.find((c) => c.number === chapterNum - 1)
  const nextCh = chapters.find((c) => c.number === chapterNum + 1)

  const fontSize = settings.fontSize || 18
  const fontFamily = settings.fontFamily || 'Georgia, serif'
  const lineHeight = settings.lineHeight || 1.8
  const sepia = settings.theme === 'sepia'

  useEffect(() => {
    localStorage.setItem('novelSettings', JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    Promise.all([getChapterContent(`${slug}/chapter-${chapterNum}`), getNovelChapters(slug)])
      .then(([data, chs]) => {
        if (ac.signal.aborted) return
        setContent(data)
        setChapters(chs || [])
        setLoading(false)
        saveProgress(slug, chapterNum, data.title || `Chapter ${chapterNum}`, null, null)
      })
      .catch((err) => {
        if (!ac.signal.aborted) {
          setError(err.message)
          setLoading(false)
        }
      })
    return () => ac.abort()
  }, [slug, chapterNum, saveProgress])

  useEffect(() => {
    if (contentRef.current) window.scrollTo(0, 0)
  }, [chapterNum])

  function updateSetting(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const theme = sepia ? 'bg-amber-50 text-amber-950' : 'bg-[#1a1a2e] text-gray-200'

  return (
    <>
      <SeoHead title={`Capítulo ${chapterNum} — ${slug}`} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Link to={`/novel/${slug}`} className="text-sm text-primary hover:underline">
              &larr; Volver
            </Link>
            <span className="text-text-secondary text-sm">/</span>
            <span className="text-sm text-text-secondary">{currentCh?.title || `Capítulo ${chapterNum}`}</span>
          </div>
          <div className="flex items-center gap-2">
            {prevCh && (
              <Link
                to={`/novel/${slug}/read?chapter=${chapterNum - 1}`}
                className="px-3 py-1.5 bg-surface hover:bg-surface-hover text-text-primary rounded-lg text-sm transition-colors border border-white/10">
                &larr; Anterior
              </Link>
            )}
            {nextCh && (
              <Link
                to={`/novel/${slug}/read?chapter=${chapterNum + 1}`}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors">
                Siguiente &rarr;
              </Link>
            )}
          </div>
        </div>

        <div className={`rounded-2xl p-6 md:p-10 ${theme} transition-colors`}>
          {loading ? (
            <div className="text-center py-20 text-text-secondary">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              Cargando capítulo...
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-400 mb-4">Error al cargar: {error}</p>
              <Link to={`/novel/${slug}/read?chapter=${chapterNum}`} className="text-primary hover:underline">
                Reintentar
              </Link>
            </div>
          ) : (
            <article
              ref={contentRef}
              className="novel-content leading-relaxed"
              style={{ fontSize: `${fontSize}px`, fontFamily, lineHeight }}
              dangerouslySetInnerHTML={{ __html: content?.content || '' }}
            />
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          {prevCh && (
            <Link
              to={`/novel/${slug}/read?chapter=${chapterNum - 1}`}
              className="px-4 py-2 bg-surface hover:bg-surface-hover text-text-primary rounded-xl text-sm transition-colors border border-white/10">
              &larr; Capítulo {chapterNum - 1}
            </Link>
          )}
          {nextCh && (
            <Link
              to={`/novel/${slug}/read?chapter=${chapterNum + 1}`}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary/90 transition-colors">
              Capítulo {chapterNum + 1} &rarr;
            </Link>
          )}
        </div>

        <div className="fixed bottom-4 right-4 flex flex-col gap-1.5 z-50">
          <button
            onClick={() => updateSetting('theme', sepia ? 'dark' : 'sepia')}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-sm hover:bg-white/20 transition-colors"
            title="Cambiar tema">
            {sepia ? '🌙' : '📖'}
          </button>
          <button
            onClick={() => updateSetting('fontSize', Math.max(12, fontSize - 2))}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-sm hover:bg-white/20 transition-colors"
            title="Reducir fuente">
            A-
          </button>
          <button
            onClick={() => updateSetting('fontSize', Math.min(32, fontSize + 2))}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-sm hover:bg-white/20 transition-colors"
            title="Aumentar fuente">
            A+
          </button>
        </div>
      </motion.div>
    </>
  )
}
