import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getChapterContent, getNovelChapters } from '../lib/novels'
import { useNovelHistory } from '../hooks/useNovelHistory'
import { useI18n } from '../hooks/useI18n'
import { useToast } from '../components/Toast'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'
import DOMPurify from 'dompurify'
import { addDownload, isNovelCached, cacheNovelContent } from '../utils/downloads'
import { useGamification } from '../hooks/useGamification'
import { XP_VALUES } from '../lib/achievements'

const THEMES = {
  dark: { bg: 'bg-[#1a1a2e]', text: 'text-gray-200', label: 'themeDark', icon: '🌙' },
  sepia: { bg: 'bg-amber-50', text: 'text-amber-950', label: 'themeSepia', icon: '📖' },
  light: { bg: 'bg-white', text: 'text-gray-900', label: 'themeLight', icon: '☀️' },
  parchment: { bg: 'bg-[#f5e6c8]', text: 'text-[#3e2723]', label: 'themeParchment', icon: '📜' },
  midnight: { bg: 'bg-[#0d1117]', text: 'text-[#8b949e]', label: 'themeMidnight', icon: '🌃' },
}

export default function NovelRead() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const chapterNum = parseInt(searchParams.get('chapter') || '1', 10)
  const source = searchParams.get('source') || ''
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chapters, setChapters] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const [bookmarkMsg, setBookmarkMsg] = useState('')
  const [settings, setSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('novelSettings') || '{}')
    } catch {
      return {}
    }
  })

  const contentRef = useRef(null)
  const scrollTimerRef = useRef(null)
  const { saveProgress, getChapterProgress } = useNovelHistory()
  const toast = useToast()
  const { t } = useI18n()
  const { addXp } = useGamification()
  const awardedChRef = useRef(new Set())
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  useEffect(() => {
    const path = `${slug}/chapter-${chapterNum}`
    isNovelCached(path).then(setDownloaded)
  }, [slug, chapterNum])
  const currentCh = chapters.find((c) => c.number === chapterNum)
  const prevCh = chapters.find((c) => c.number === chapterNum - 1)
  const nextCh = chapters.find((c) => c.number === chapterNum + 1)

  const theme = THEMES[settings.theme] || THEMES.dark
  const fontSize = settings.fontSize || 18
  const fontFamily = settings.fontFamily || 'Georgia, serif'
  const lineHeight = settings.lineHeight || 1.8

  useEffect(() => {
    localStorage.setItem('novelSettings', JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    setContent(null)
    Promise.all([getChapterContent(`${slug}/chapter-${chapterNum}`, source), getNovelChapters(slug, source)])
      .then(([data, chs]) => {
        if (ac.signal.aborted) return
        setContent(data)
        setChapters(chs || [])
        setLoading(false)
        saveProgress(slug, chapterNum, data.title || t('novel.reader.chapterX', { n: chapterNum }), slug, null, 0)
        const chKey = `${slug}:${chapterNum}`
        if (!awardedChRef.current.has(chKey)) {
          awardedChRef.current.add(chKey)
          addXp(XP_VALUES.READ_NOVEL_CHAPTER, 'novel')
        }
      })
      .catch((err) => {
        if (!ac.signal.aborted) {
          setError(err.message)
          setLoading(false)
        }
      })
    return () => ac.abort()
  }, [slug, chapterNum, source, saveProgress, addXp, t])

  useEffect(() => {
    const savedPct = getChapterProgress(slug, chapterNum)
    if (savedPct > 0) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo(0, Math.round((savedPct / 100) * maxScroll))
    } else {
      window.scrollTo(0, 0)
    }
  }, [chapterNum, slug, getChapterProgress, content])

  useEffect(() => {
    function handleScroll() {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = setTimeout(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight
        const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0
        saveProgress(slug, chapterNum, currentCh?.title || '', slug, null, pct)
      }, 2000)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
      const max = document.documentElement.scrollHeight - window.innerHeight
      const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0
      saveProgress(slug, chapterNum, currentCh?.title || '', slug, null, pct)
    }
  }, [slug, chapterNum, saveProgress, currentCh])

  function updateSetting(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  function cycleTheme() {
    const keys = Object.keys(THEMES)
    const idx = keys.indexOf(settings.theme || 'dark')
    updateSetting('theme', keys[(idx + 1) % keys.length])
  }

  function saveBookmark() {
    const pos = window.scrollY
    const max = document.documentElement.scrollHeight - window.innerHeight
    const pct = max > 0 ? Math.round((pos / max) * 100) : 0
    const key = `novel_bookmark_${slug}_${chapterNum}`
    localStorage.setItem(key, String(pos))
    setBookmarkMsg(t('novel.reader.bookmarkSaved', { pct }))
    setTimeout(() => setBookmarkMsg(''), 2500)
  }

  function goToBookmark() {
    const key = `novel_bookmark_${slug}_${chapterNum}`
    const pos = localStorage.getItem(key)
    if (pos) {
      window.scrollTo(0, parseInt(pos, 10))
      setBookmarkMsg(t('novel.reader.bookmarkRestored'))
      setTimeout(() => setBookmarkMsg(''), 2500)
    } else {
      setBookmarkMsg(t('novel.reader.noBookmark'))
      setTimeout(() => setBookmarkMsg(''), 2500)
    }
  }

  async function handleDownload() {
    if (downloading || downloaded || !content) return
    const path = `${slug}/chapter-${chapterNum}`
    setDownloading(true)
    try {
      await cacheNovelContent(path, content.content || '')
      addDownload({
        id: path,
        type: 'novel',
        title: currentCh?.title || t('novel.reader.chapterX', { n: chapterNum }),
        chapter: chapterNum,
        chapterLabel: t('novel.reader.chapterX', { n: chapterNum }),
        slug,
        source,
        link: `/novel/${slug}/read?chapter=${chapterNum}${source ? `&source=${source}` : ''}`,
        size: new Blob([content.content || '']).size,
      })
      setDownloaded(true)
      toast(t('manga.reader.downloaded', { ok: 1, total: 1 }), 'success', 3000)
    } catch (e) {
      toast(t('manga.reader.downloadError', { error: e.message }), 'error', 4000)
    }
    setDownloading(false)
  }

  return (
    <>
      <SeoHead title={`${t('novel.reader.chapterX', { n: chapterNum })} — ${slug}`} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Link to={`/novel/${slug}${source ? `?source=${source}` : ''}`} className="text-sm text-primary hover:underline">
              &larr; {t('novel.reader.goBack')}
            </Link>
            <span className="text-text-secondary text-sm">/</span>
            <span className="text-sm text-text-secondary">{currentCh?.title || t('novel.reader.chapterX', { n: chapterNum })}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading || downloaded || !content}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-white/10 flex items-center gap-1 ${
                downloaded
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'bg-surface-hover text-text-secondary hover:text-text-primary'
              } disabled:opacity-40`}
              title={downloaded ? t('manga.reader.downloadedLabel') : t('manga.reader.downloadOffline')}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {downloading ? '...' : downloaded ? t('manga.reader.downloadedLabel') : t('manga.reader.downloadOffline')}
            </button>
            {prevCh && (
              <Link
                to={`/novel/${slug}/read?chapter=${chapterNum - 1}${source ? `&source=${source}` : ''}`}
                className="px-3 py-1.5 bg-surface hover:bg-surface-hover text-text-primary rounded-lg text-sm transition-colors border border-white/10">
                &larr; {t('novel.reader.prevChapter')}
              </Link>
            )}
            {nextCh && (
              <Link
                to={`/novel/${slug}/read?chapter=${chapterNum + 1}${source ? `&source=${source}` : ''}`}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors">
                {t('novel.reader.nextChapter')} &rarr;
              </Link>
            )}
          </div>
        </div>

        {bookmarkMsg && <div className="text-center text-sm text-primary mb-2 transition-opacity">{bookmarkMsg}</div>}

        <div className={`rounded-2xl p-6 md:p-10 ${theme.bg} ${theme.text} transition-colors`}>
          {loading ? (
            <div className="text-center py-20 text-text-secondary">
              <div className="animate-cosmic-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              {t('novel.reader.loading')}
            </div>
          ) : error ? (
            <EmptyState
              message={error.includes('caído') ? t('novel.reader.novelbinDown') : error}
              action={{
                label: t('common.retry'),
                onClick: () => navigate(`/novel/${slug}/read?chapter=${chapterNum}${source ? `&source=${source}` : ''}`),
              }}
            />
          ) : (
            <article
              ref={contentRef}
              className="novel-content leading-relaxed max-w-3xl mx-auto"
              style={{ fontSize: `${fontSize}px`, fontFamily, lineHeight }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content?.content || '') }}
            />
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          {prevCh && (
            <Link
              to={`/novel/${slug}/read?chapter=${chapterNum - 1}${source ? `&source=${source}` : ''}`}
              className="px-4 py-2 bg-surface hover:bg-surface-hover text-text-primary rounded-xl text-sm transition-colors border border-white/10">
              &larr; {t('novel.reader.chapterX', { n: chapterNum - 1 })}
            </Link>
          )}
          {nextCh && (
            <Link
              to={`/novel/${slug}/read?chapter=${chapterNum + 1}${source ? `&source=${source}` : ''}`}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary/90 transition-colors">
              {t('novel.reader.chapterX', { n: chapterNum + 1 })} &rarr;
            </Link>
          )}
        </div>

        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSettings(false)}>
            <div className="bg-surface rounded-2xl p-6 w-80 max-w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold mb-4">{t('novel.reader.settings')}</h3>

              <div className="mb-3">
                <label className="text-xs text-text-secondary block mb-1">{t('novel.reader.theme')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(THEMES).map(([key, th]) => (
                    <button
                      key={key}
                      onClick={() => updateSetting('theme', key)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors ${settings.theme === key || (!settings.theme && key === 'dark') ? 'bg-primary text-white' : 'bg-white/10 text-text-secondary hover:text-text-primary'}`}>
                      {th.icon} {t(`novel.reader.${th.label}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="text-xs text-text-secondary block mb-1">{t('novel.reader.fontSize', { size: fontSize })}</label>
                <input
                  type="range"
                  min="12"
                  max="32"
                  value={fontSize}
                  onChange={(e) => updateSetting('fontSize', parseInt(e.target.value, 10))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="mb-3">
                <label className="text-xs text-text-secondary block mb-1">{t('novel.reader.lineHeight')}</label>
                <select
                  value={lineHeight}
                  onChange={(e) => updateSetting('lineHeight', parseFloat(e.target.value))}
                  className="w-full bg-white/10 rounded-lg px-2 py-1.5 text-sm text-text-primary border border-white/10">
                  {[1.2, 1.4, 1.6, 1.8, 2.0, 2.2].map((v) => (
                    <option key={v} value={v} className="bg-surface">
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="text-xs text-text-secondary block mb-1">{t('novel.reader.fontFamily')}</label>
                <select
                  value={fontFamily}
                  onChange={(e) => updateSetting('fontFamily', e.target.value)}
                  className="w-full bg-white/10 rounded-lg px-2 py-1.5 text-sm text-text-primary border border-white/10">
                  {[
                    'Georgia, serif',
                    'Palatino Linotype, serif',
                    'Times New Roman, serif',
                    'Arial, sans-serif',
                    'Verdana, sans-serif',
                    'Roboto, sans-serif',
                  ].map((f) => (
                    <option key={f} value={f} className="bg-surface">
                      {f.split(',')[0]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-4 right-4 flex flex-col gap-1.5 z-40">
          <button
            onClick={saveBookmark}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-sm hover:bg-white/20 transition-colors"
            title={t('novel.reader.saveBookmark')}>
            🔖
          </button>
          <button
            onClick={goToBookmark}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-sm hover:bg-white/20 transition-colors"
            title={t('novel.reader.goToBookmark')}>
            📍
          </button>
          <button
            onClick={cycleTheme}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-sm hover:bg-white/20 transition-colors"
            title={t('novel.reader.cycleTheme')}>
            {theme.icon}
          </button>
          <button
            onClick={() => updateSetting('fontSize', Math.max(12, fontSize - 2))}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-sm hover:bg-white/20 transition-colors"
            title={t('novel.reader.decreaseFont')}>
            A-
          </button>
          <button
            onClick={() => updateSetting('fontSize', Math.min(32, fontSize + 2))}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-sm hover:bg-white/20 transition-colors"
            title={t('novel.reader.increaseFont')}>
            A+
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-sm hover:bg-white/20 transition-colors"
            title={t('novel.reader.moreSettings')}>
            ⚙️
          </button>
        </div>
      </motion.div>
    </>
  )
}
