import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getMangaChapterPages, getMangaChapters } from '../lib/manga'
import { useMangaHistory } from '../hooks/useMangaHistory'
import { useI18n } from '../hooks/useI18n'
import { addDownload, cacheUrls, getDownload } from '../utils/downloads'
import { useToast } from '../components/Toast'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'
import { useGamification } from '../hooks/useGamification'
import { XP_VALUES } from '../lib/achievements'
import CommunityMangaChapters from '../components/CommunityMangaChapters'

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
  const [failedPages, setFailedPages] = useState(new Set())
  const [scrollMode, setScrollMode] = useState('scroll')
  const [scrollProgress, setScrollProgress] = useState(0)
  const pagesContainerRef = useRef(null)
  const scrollSentinelRef = useRef(null)

  const [brightness, setBrightness] = useState(100)
  const [fitMode, setFitMode] = useState('width')
  const [rtl, setRtl] = useState(false)

  const { saveChapterProgress } = useMangaHistory()
  const { t } = useI18n()
  const toast = useToast()
  const { addXp } = useGamification()
  const awardedChRef = useRef(new Set())
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  useEffect(() => {
    if (!chapterId) return
    setDownloaded(!!getDownload(chapterId))
  }, [chapterId])

  async function handleDownload() {
    if (downloading || !chapterId || pages.length === 0) return
    setDownloading(true)
    try {
      const urls = pages.map((p) => p.url)
      const results = await cacheUrls(urls)
      const ok = results.filter((r) => r.ok).length
      addDownload({
        id: chapterId,
        type: 'manga',
        title: title || t('manga.reader.chapterX', { n: chapterNum }),
        chapter: chapterNum,
        chapterLabel: t('manga.reader.chapterX', { n: chapterNum }),
        anilistId: parseInt(id, 10),
        image,
        pages: urls,
        link: `/manga/${id}/read?chapterId=${chapterId}&chapter=${chapterNum}&title=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}`,
        size: 0,
      })
      setDownloaded(true)
      toast(t('manga.reader.downloaded', { ok, total: urls.length }), 'success', 3000)
    } catch (e) {
      toast(t('manga.reader.downloadError', { error: e.message }), 'error', 4000)
    }
    setDownloading(false)
  }

  useEffect(() => {
    if (pages.length === 0) return
    if (scrollMode === 'single') {
      const pageEls = pagesContainerRef.current?.querySelectorAll('[data-page-num]')
      if (!pageEls?.length) return
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const num = parseInt(entry.target.dataset.pageNum, 10)
              if (num > 0) setCurrentPage(num)
            }
          }
        },
        { threshold: 0.5, rootMargin: '0px 0px -100px 0px' },
      )
      pageEls.forEach((el) => observer.observe(el))
      return () => observer.disconnect()
    }
  }, [pages, scrollMode])

  useEffect(() => {
    if (scrollMode !== 'scroll' || pages.length === 0) return
    const container = pagesContainerRef.current
    if (!container) return
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const progress = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0
      setScrollProgress(Math.min(progress, 1))
      const pageIndex = Math.floor(progress * pages.length)
      const pageNum = pages[Math.min(pageIndex, pages.length - 1)]?.pageNumber || 1
      setCurrentPage(pageNum)
    }
    container.addEventListener('scroll', onScroll)
    return () => container.removeEventListener('scroll', onScroll)
  }, [scrollMode, pages])

  const lastSavedPage = useRef(0)
  useEffect(() => {
    if (!chapterId || currentPage === lastSavedPage.current) return
    lastSavedPage.current = currentPage
    saveChapterProgress(
      parseInt(id, 10),
      parseFloat(chapterNum || '0'),
      chapterId,
      title || t('manga.reader.chapterX', { n: chapterNum }),
      image,
      currentPage,
    )
    if (chapterId && !awardedChRef.current.has(chapterId)) {
      awardedChRef.current.add(chapterId)
      addXp(XP_VALUES.READ_MANGA_CHAPTER, 'manga')
    }
  }, [currentPage, chapterId, id, chapterNum, title, image, saveChapterProgress, addXp, t])

  useEffect(() => {
    if (!chapterId) {
      setError(t('manga.reader.noChapterSpecified'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setCurrentPage(1)
    setScrollProgress(0)
    setFailedPages(new Set())
    lastSavedPage.current = 0

    getMangaChapterPages(chapterId)
      .then((result) => {
        setPages(result)
        setLoading(false)
      })
      .catch(() => {
        setError(t('manga.reader.error'))
        setLoading(false)
      })
  }, [chapterId, t])

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
  const currentIndex = sortedChapters.findIndex((c) => c.chapterId === chapterId)
  const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null
  const nextChapter = currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null

  const displayedPages = rtl ? [...pages].reverse() : pages

  function formatChapterNum(n) {
    if (Number.isInteger(n)) return n.toString()
    return n.toFixed(1)
  }

  const buildChapterUrl = useCallback(
    (ch) => {
      return `/manga/${id}/read?chapterId=${ch.chapterId}&chapter=${ch.chapterNumber}&title=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}`
    },
    [id, title, image],
  )

  const goToNext = useCallback(() => {
    if (nextChapter) navigate(buildChapterUrl(nextChapter))
  }, [nextChapter, navigate, buildChapterUrl])

  const goToPrev = useCallback(() => {
    if (prevChapter) navigate(buildChapterUrl(prevChapter))
  }, [prevChapter, navigate, buildChapterUrl])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'ArrowRight') rtl ? goToPrev() : goToNext()
      if (e.key === 'ArrowLeft') rtl ? goToNext() : goToPrev()
      if (e.key === 'ArrowDown' && scrollMode === 'scroll') {
        e.preventDefault()
        const container = pagesContainerRef.current
        if (container) container.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' })
      }
      if (e.key === 'ArrowUp' && scrollMode === 'scroll') {
        e.preventDefault()
        const container = pagesContainerRef.current
        if (container) container.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' })
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [rtl, goToNext, goToPrev, scrollMode])

  useEffect(() => {
    if (scrollMode !== 'scroll' || !scrollSentinelRef.current || !nextChapter) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) goToNext()
      },
      { threshold: 0.1 },
    )
    observer.observe(scrollSentinelRef.current)
    return () => observer.disconnect()
  }, [scrollMode, nextChapter, goToNext])

  return (
    <>
      <SeoHead
        title={title ? `${title} — ${t('manga.reader.chapterX', { n: chapterNum || '' })}` : t('manga.reader.reader')}
        image={image}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={scrollMode === 'scroll' ? 'max-w-full' : 'max-w-4xl mx-auto'}>
        {/* Scroll progress bar */}
        {scrollMode === 'scroll' && pages.length > 0 && (
          <div className="fixed left-0 top-16 bottom-0 w-1 bg-white/5 z-40 hidden lg:block">
            <div className="w-full bg-neon-cyan transition-all duration-150" style={{ height: `${scrollProgress * 100}%` }} />
          </div>
        )}

        <div className={scrollMode === 'scroll' ? '' : 'max-w-4xl mx-auto'}>
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <Link to={`/manga/${id}`} className="text-sm text-text-secondary hover:text-text-primary transition-colors shrink-0">
              ← {t('manga.reader.back')}
            </Link>

            {!chaptersLoading && sortedChapters.length > 0 && (
              <div className="flex items-center gap-2">
                {prevChapter ? (
                  <Link
                    to={buildChapterUrl(prevChapter)}
                    className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
                    ← {t('manga.reader.chapterX', { n: formatChapterNum(prevChapter.chapterNumber) })}
                  </Link>
                ) : (
                  <div className="px-3 py-1.5 text-xs text-text-secondary/40">← {t('manga.reader.chapterX', { n: '—' })}</div>
                )}

                <select
                  value={chapterId || ''}
                  onChange={(e) => {
                    const ch = sortedChapters.find((c) => c.chapterId === e.target.value)
                    if (ch) navigate(buildChapterUrl(ch))
                  }}
                  className="bg-surface text-text-primary text-xs font-medium px-2 py-1.5 rounded-lg border border-white/10 cursor-pointer">
                  {sortedChapters.map((ch) => (
                    <option key={ch.chapterId} value={ch.chapterId}>
                      {t('manga.reader.chapterX', { n: formatChapterNum(ch.chapterNumber) })}
                    </option>
                  ))}
                </select>

                {nextChapter ? (
                  <Link
                    to={buildChapterUrl(nextChapter)}
                    className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
                    {t('manga.reader.chapterX', { n: formatChapterNum(nextChapter.chapterNumber) })} →
                  </Link>
                ) : (
                  <div className="px-3 py-1.5 text-xs text-text-secondary/40">{t('manga.reader.chapterX', { n: '—' })} →</div>
                )}
              </div>
            )}

            <h1 className="text-sm font-medium truncate mx-4 text-center hidden sm:block">
              {title || t('manga.reader.chapterX', { n: chapterNum })}
            </h1>

            <div className="shrink-0 w-20 hidden sm:block" />
          </div>

          {/* Reader controls */}
          <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-surface rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-secondary">{t('manga.reader.brightness')}</span>
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
                className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${fitMode === 'width' ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary'}`}>
                {t('manga.reader.fitWidth')}
              </button>
              <button
                onClick={() => setFitMode('height')}
                className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${fitMode === 'height' ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary'}`}>
                {t('manga.reader.fitHeight')}
              </button>
              <button
                onClick={() => setFitMode('original')}
                className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${fitMode === 'original' ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary'}`}>
                {t('manga.reader.fitOriginal')}
              </button>
            </div>

            <button
              onClick={() => setRtl(!rtl)}
              className={`px-3 py-1 rounded-lg text-[10px] font-medium transition-colors border border-white/10 ${
                rtl ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary'
              }`}>
              {rtl ? t('manga.reader.rtl') : t('manga.reader.ltr')}
            </button>

            <button
              onClick={() => setScrollMode((m) => (m === 'scroll' ? 'single' : 'scroll'))}
              className={`px-3 py-1 rounded-lg text-[10px] font-medium transition-colors border border-white/10 ${
                scrollMode === 'scroll' ? 'bg-accent text-white border-accent/30' : 'bg-surface-hover text-text-secondary'
              }`}>
              {scrollMode === 'scroll' ? t('manga.reader.scroll') : t('manga.reader.singlePage')}
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading || downloaded || pages.length === 0}
              className={`px-3 py-1 rounded-lg text-[10px] font-medium transition-colors border border-white/10 flex items-center gap-1 ${
                downloaded
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'bg-surface-hover text-text-secondary hover:text-text-primary'
              } disabled:opacity-40`}
              title={downloaded ? t('manga.reader.downloadedLabel') : t('manga.reader.downloadOffline')}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {downloading ? '...' : downloaded ? t('manga.reader.downloadedLabel') : t('manga.reader.downloadOffline')}
            </button>

            <span className="text-[10px] text-text-secondary ml-auto">
              {scrollMode === 'scroll'
                ? t('manga.reader.progress', { progress: Math.round(scrollProgress * 100) })
                : t('manga.reader.pageOf', { current: currentPage, total: pages.length })}
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-full aspect-[3/4] bg-surface rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <EmptyState message={error} action={{ label: t('manga.reader.goBack'), onClick: () => navigate(`/manga/${id}`) }} />
          ) : (
            <div
              ref={pagesContainerRef}
              className={scrollMode === 'scroll' ? 'space-y-0' : 'space-y-4'}
              style={scrollMode === 'scroll' ? { height: 'calc(100vh - 200px)', overflowY: 'auto' } : {}}>
              {displayedPages.map((page, i) => (
                <div
                  key={i}
                  data-page-num={page.pageNumber}
                  className={
                    scrollMode === 'scroll'
                      ? 'w-full flex justify-center'
                      : 'w-full rounded-2xl bg-surface overflow-hidden flex justify-center'
                  }
                  style={{
                    filter: `brightness(${brightness}%)`,
                    maxHeight: scrollMode === 'single' && fitMode === 'height' ? '95vh' : 'none',
                  }}>
                  {failedPages.has(page.pageNumber) ? (
                    <div className="flex items-center justify-center h-64 text-text-secondary text-sm">
                      {t('manga.reader.pageError', { n: page.pageNumber })}
                    </div>
                  ) : (
                    <img
                      src={page.url}
                      alt={t('manga.reader.pageX', { n: page.pageNumber })}
                      loading="lazy"
                      className={fitMode === 'width' ? 'w-full' : fitMode === 'height' ? 'h-full w-auto max-w-full' : ''}
                      onError={() => setFailedPages((prev) => new Set(prev).add(page.pageNumber))}
                    />
                  )}
                </div>
              ))}
              {scrollMode === 'scroll' && nextChapter && (
                <div ref={scrollSentinelRef} className="flex justify-center py-8">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-cosmic-spin" />
                    {t('manga.reader.autoLoadNext')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <CommunityMangaChapters anilistId={id} chapterNumber={chapterNum} title={title} />
      </motion.div>
    </>
  )
}
