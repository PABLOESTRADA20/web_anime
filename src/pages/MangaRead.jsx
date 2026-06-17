import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getMangaChapterPages, getMangaChapters } from '../lib/manga'
import { useMangaHistory } from '../hooks/useMangaHistory'

export default function MangaRead() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const chapterId = searchParams.get('chapterId')
  const chapterNum = searchParams.get('chapter')
  const title = searchParams.get('title') || ''
  const image = searchParams.get('image') || ''

  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chapters, setChapters] = useState([])
  const [chaptersLoading, setChaptersLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pagesContainerRef = useRef(null)

  const [brightness, setBrightness] = useState(100)
  const [fitMode, setFitMode] = useState('width')
  const [rtl, setRtl] = useState(false)

  const { saveChapterProgress } = useMangaHistory()

  // Track visible page via IntersectionObserver
  useEffect(() => {
    if (pages.length === 0) return
    const pageEls = pagesContainerRef.current?.querySelectorAll('[data-page-num]')
    if (!pageEls?.length) return

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const num = parseInt(entry.target.dataset.pageNum, 10)
          if (num > 0) setCurrentPage(num)
        }
      }
    }, { threshold: 0.5, rootMargin: '0px 0px -100px 0px' })

    pageEls.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [pages])

  // Save progress when currentPage changes
  const lastSavedPage = useRef(0)
  useEffect(() => {
    if (!chapterId || currentPage === lastSavedPage.current) return
    lastSavedPage.current = currentPage
    saveChapterProgress(
      parseInt(id, 10),
      parseFloat(chapterNum || '0'),
      chapterId,
      title || `Capítulo ${chapterNum}`,
      image,
      currentPage
    )
  }, [currentPage, chapterId, id, chapterNum, title, image, saveChapterProgress])

  useEffect(() => {
    if (!chapterId) {
      setError('No se especificó el capítulo.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setCurrentPage(1)
    lastSavedPage.current = 0

    getMangaChapterPages(chapterId)
      .then((result) => {
        setPages(result)
        setLoading(false)
      })
      .catch(() => {
        setError('Error al cargar las páginas del capítulo.')
        setLoading(false)
      })
  }, [chapterId])

  useEffect(() => {
    getMangaChapters(id)
      .then((res) => {
        const sorted = (res || []).sort((a, b) => a.chapterNumber - b.chapterNumber)
        setChapters(sorted)
        setChaptersLoading(false)
      })
      .catch(() => setChaptersLoading(false))
  }, [id])

  const sortedChapters = chapters
  const currentIndex = sortedChapters.findIndex(c => c.chapterId === chapterId)
  const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null
  const nextChapter = currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null

  const displayedPages = rtl ? [...pages].reverse() : pages

  function formatChapterNum(n) {
    if (Number.isInteger(n)) return n.toString()
    return n.toFixed(1)
  }

  function buildChapterUrl(ch) {
    return `/manga/${id}/read?chapterId=${ch.chapterId}&chapter=${ch.chapterNumber}&title=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}`
  }

  const goToNext = useCallback(() => {
    if (nextChapter) navigate(buildChapterUrl(nextChapter))
  }, [nextChapter, navigate])

  const goToPrev = useCallback(() => {
    if (prevChapter) navigate(buildChapterUrl(prevChapter))
  }, [prevChapter, navigate])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'ArrowRight') rtl ? goToPrev() : goToNext()
      if (e.key === 'ArrowLeft') rtl ? goToNext() : goToPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [rtl, goToNext, goToPrev])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <Link
          to={`/manga/${id}`}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors shrink-0"
        >
          ← Volver
        </Link>

        {!chaptersLoading && sortedChapters.length > 0 && (
          <div className="flex items-center gap-2">
            {prevChapter ? (
              <Link
                to={buildChapterUrl(prevChapter)}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                ← Cap. {formatChapterNum(prevChapter.chapterNumber)}
              </Link>
            ) : (
              <div className="px-3 py-1.5 text-xs text-text-secondary/40">← Cap. —</div>
            )}

            <select
              value={chapterId || ''}
              onChange={(e) => {
                const ch = sortedChapters.find(c => c.chapterId === e.target.value)
                if (ch) navigate(buildChapterUrl(ch))
              }}
              className="bg-surface text-text-primary text-xs font-medium px-2 py-1.5 rounded-lg border border-white/10 cursor-pointer"
            >
              {sortedChapters.map((ch) => (
                <option key={ch.chapterId} value={ch.chapterId}>
                  Cap. {formatChapterNum(ch.chapterNumber)}
                </option>
              ))}
            </select>

            {nextChapter ? (
              <Link
                to={buildChapterUrl(nextChapter)}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Cap. {formatChapterNum(nextChapter.chapterNumber)} →
              </Link>
            ) : (
              <div className="px-3 py-1.5 text-xs text-text-secondary/40">Cap. — →</div>
            )}
          </div>
        )}

        <h1 className="text-sm font-medium truncate mx-4 text-center hidden sm:block">
          {title || `Capítulo ${chapterNum}`}
        </h1>

        <div className="shrink-0 w-20 hidden sm:block" />
      </div>

      {/* Reader controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-surface rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-secondary">Brillo</span>
          <input
            type="range"
            min="50"
            max="150"
            value={brightness}
            onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
            className="w-20 accent-primary"
          />
        </div>

        <div className="flex rounded-lg overflow-hidden border border-white/10">
          <button
            onClick={() => setFitMode('width')}
            className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${fitMode === 'width' ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary'}`}
          >
            Ancho
          </button>
          <button
            onClick={() => setFitMode('height')}
            className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${fitMode === 'height' ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary'}`}
          >
            Alto
          </button>
          <button
            onClick={() => setFitMode('original')}
            className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${fitMode === 'original' ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary'}`}
          >
            Original
          </button>
        </div>

        <button
          onClick={() => setRtl(!rtl)}
          className={`px-3 py-1 rounded-lg text-[10px] font-medium transition-colors border border-white/10 ${
            rtl ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary'
          }`}
        >
          {rtl ? 'RTL' : 'LTR'}
        </button>

        <span className="text-[10px] text-text-secondary ml-auto">
          {pages.length > 0 && `${currentPage} / ${pages.length}`}
        </span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-full aspect-[3/4] bg-surface rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-text-secondary mb-4">{error}</p>
          <Link
            to={`/manga/${id}`}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm transition-colors"
          >
            Volver al manga
          </Link>
        </div>
      ) : (
        <div ref={pagesContainerRef} className="space-y-4">
          {displayedPages.map((page, i) => (
            <div
              key={i}
              data-page-num={page.pageNumber}
              className="w-full rounded-2xl bg-surface overflow-hidden flex justify-center"
              style={{
                filter: `brightness(${brightness}%)`,
                maxHeight: fitMode === 'height' ? '95vh' : 'none',
              }}
            >
              <img
                src={page.url}
                alt={`Página ${page.pageNumber}`}
                loading="lazy"
                className={fitMode === 'width' ? 'w-full' : fitMode === 'height' ? 'h-full w-auto max-w-full' : ''}
                onError={(e) => {
                  const parent = e.target.parentElement
                  if (parent) {
                    parent.innerHTML = `<div class="flex items-center justify-center h-64 text-text-secondary text-sm">Error al cargar página ${page.pageNumber}</div>`
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
