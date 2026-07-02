import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DetailSkeleton } from '../components/Skeletons'
import AnimeCard from '../components/AnimeCard'
import CommentSection from '../components/CommentSection'
import SeoHead from '../components/SeoHead'
import { getNovelInfo, getNovelChapters } from '../lib/novels'
import { searchMangaByTitle, getMangaInfo } from '../lib/anilist'
import { useI18n } from '../hooks/useI18n'
import { useNovelHistory } from '../hooks/useNovelHistory'
import { useToast } from '../components/Toast'
import { useNovelFavorites } from '../hooks/useNovelFavorites'
import { useNovelLists } from '../hooks/useNovelLists'
import { useNovelRatings } from '../hooks/useNovelRatings'
import { useAuth } from '../hooks/useAuth'
import SafeImage from '../components/SafeImage'
import EmptyState from '../components/EmptyState'
import ShareButton from '../components/ShareButton'
import Breadcrumbs from '../components/Breadcrumbs'
import { useGamification } from '../hooks/useGamification'
import { XP_VALUES } from '../lib/achievements'

// Simple hash function to convert slug string to a numeric ID for DB
function slugHash(s) {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export default function NovelDetail() {
  const { t } = useI18n()
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const source = searchParams.get('source') || ''
  const [novel, setNovel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chapters, setChapters] = useState([])
  const [chaptersLoading, setChaptersLoading] = useState(true)
  const [chapterLimit, setChapterLimit] = useState(30)

  const { user } = useAuth()
  const { getLatestChapter, isChapterRead, getChapterProgress } = useNovelHistory()
  const { isFavorite, toggleFavorite } = useNovelFavorites()
  const { getListStatus, setListStatus: setNovelListStatus } = useNovelLists()
  const { ratings, fetchRating, setRating: saveNovelRating } = useNovelRatings()
  const [favLoading, setFavLoading] = useState(false)
  const [anilistData, setAnilistData] = useState(null)
  const toast = useToast()
  const { addXp, checkAchievements } = useGamification()

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    setChapters([])
    setAnilistData(null)
    getNovelInfo(slug, source)
      .then(async (data) => {
        if (ac.signal.aborted) return
        setNovel(data)
        setLoading(false)
        try {
          const chs = await getNovelChapters(slug, source)
          if (!ac.signal.aborted) setChapters(chs || [])
        } catch {
          /* no chapters */
        }
        setChaptersLoading(false)
      })
      .catch((err) => {
        if (!ac.signal.aborted) {
          setError(err.message)
          setLoading(false)
          setChaptersLoading(false)
        }
      })
    return () => ac.abort()
  }, [slug, source])

  useEffect(() => {
    if (!novel?.title) return
    const ac = new AbortController()
    searchMangaByTitle(novel.title)
      .then((match) => {
        if (ac.signal.aborted || !match) return
        return getMangaInfo(match.id)
      })
      .then((data) => {
        if (!ac.signal.aborted) setAnilistData(data || null)
      })
      .catch(() => {})
    return () => ac.abort()
  }, [novel?.title])

  useEffect(() => {
    if (slug) fetchRating(slug)
  }, [slug, fetchRating])

  async function handleRating(rating) {
    try {
      await saveNovelRating(slug, rating)
      toast(t('novel.rating.saved', { score: rating }), 'success')
    } catch {
      toast(t('novel.rating.error'), 'error')
    }
  }

  async function handleToggleFavorite() {
    if (!user) {
      toast(t('novel.favorites.loginRequired'), 'info')
      return
    }
    const wasFav = isFavorite(slug)
    setFavLoading(true)
    try {
      await toggleFavorite(slug, novel.title, novel.cover)
      toast(isFavorite(slug) ? t('novel.favorites.removed') : t('novel.favorites.added'), 'success')
      if (!wasFav) {
        addXp(XP_VALUES.ADD_FAVORITE, 'favorite')
        checkAchievements({ favorites: 1 })
      }
    } catch {
      toast(t('novel.favorites.error'), 'error')
    }
    setFavLoading(false)
  }

  async function handleListStatus(status) {
    if (!user) {
      toast(t('novel.listStatus.loginRequired'), 'info')
      return
    }
    try {
      await setNovelListStatus(slug, novel.title, novel.cover, status)
      const current = getListStatus(slug)
      if (current === status) toast(t('novel.listStatus.markedAs', { status }), 'success')
      else toast(t('novel.listStatus.updated'), 'success')
    } catch {
      toast(t('novel.listStatus.error'), 'error')
    }
  }

  const latestChapter = getLatestChapter(slug)
  const listStatus = getListStatus(slug)

  if (error) {
    const msg = error.includes('caído') ? t('novel.detail.downError') : error
    return <EmptyState message={msg} action={{ label: t('common.retry'), onClick: () => window.location.reload() }} />
  }

  if (loading) return <DetailSkeleton />

  const STATUS_KEYS = [
    { key: 'reading', label: t('novel.listStatus.reading') },
    { key: 'completed', label: t('novel.listStatus.completed') },
    { key: 'plan_to_read', label: t('novel.listStatus.plan_to_read') },
    { key: 'dropped', label: t('novel.listStatus.dropped') },
  ]

  return (
    <>
      <SeoHead title={novel?.title || t('novel.novel')} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="flex flex-col md:flex-row gap-6 mb-10">
          <div className="w-48 shrink-0 mx-auto md:mx-0">
            <SafeImage src={novel.cover} alt={novel.title} className="w-full rounded-2xl shadow-lg" fallbackText={novel.title} />
          </div>
          <div className="flex-1">
            <Breadcrumbs
              items={[
                { label: t('nav.home'), href: '/' },
                { label: t('novel.detail.breadcrumbs'), href: '/directorio' },
                { label: novel.title },
              ]}
            />
            <h1 className="text-2xl font-bold mb-2">{novel.title}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              {novel.author && <span className="text-sm text-text-secondary">{t('novel.author', { author: novel.author })}</span>}
              {novel.status && (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${novel.status === 'Ongoing' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {novel.status}
                </span>
              )}
            </div>
            {novel.genres?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {novel.genres.map((g) => (
                  <span key={g} className="text-xs px-2 py-1 rounded-full bg-surface text-text-secondary">
                    {g}
                  </span>
                ))}
              </div>
            )}
            {novel.description && <p className="text-sm text-text-secondary leading-relaxed mb-4 line-clamp-4">{novel.description}</p>}
            <div className="flex flex-wrap gap-2">
              {latestChapter && (
                <Link
                  to={`/novel/${slug}/read?chapter=${latestChapter.chapter_number}${source ? `&source=${source}` : ''}`}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                  {t('novel.continueChapter', { chapter: latestChapter.chapter_number })}
                </Link>
              )}
              <Link
                to={`/novel/${slug}/read?chapter=1${source ? `&source=${source}` : ''}`}
                className="px-4 py-2 bg-surface hover:bg-surface-hover text-text-primary rounded-xl text-sm font-medium transition-colors border border-white/10">
                {chapters.length > 0 ? t('novel.startReading') : `${t('novel.chapter')} 1`}
              </Link>
              <button
                onClick={handleToggleFavorite}
                disabled={favLoading}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${isFavorite(slug) ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-surface hover:bg-surface-hover text-text-secondary border-white/10'}`}>
                {isFavorite(slug) ? `♥ ${t('novel.favoritesLabel')}` : `♡ ${t('novel.favoritesLabel')}`}
              </button>
              <ShareButton title={novel?.title} />
            </div>
            {user && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {STATUS_KEYS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleListStatus(label)}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${listStatus === label ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {user && (
              <div className="mt-4">
                <p className="text-xs text-text-secondary mb-1.5">{t('novel.ratingLabel')}:</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => handleRating(n)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                        ratings[slug] === n ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:bg-surface-hover'
                      }`}>
                      {n}
                    </button>
                  ))}
                  {ratings[slug] && (
                    <button
                      onClick={() => handleRating(ratings[slug])}
                      className="ml-1 text-xs text-text-secondary hover:text-red-400 transition-colors"
                      title={t('anime.detail.removeRating')}>
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <h2 className="text-lg font-bold mb-4">
          {t('novel.chapterTitle')} ({chapters.length})
        </h2>
        {chaptersLoading ? (
          <div className="text-center py-8 text-text-secondary">{t('novel.loadingChapters')}</div>
        ) : chapters.length === 0 ? (
          <EmptyState message={t('novel.noChapters')} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {chapters.slice(0, chapterLimit).map((ch) => {
                const read = isChapterRead(slug, ch.number)
                const scrollPct = getChapterProgress(slug, ch.number)
                return (
                  <Link
                    key={ch.number}
                    to={`/novel/${slug}/read?chapter=${ch.number}${source ? `&source=${source}` : ''}`}
                    className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors overflow-hidden ${read ? 'bg-neon-cyan/5 text-text-secondary' : 'bg-surface/50 hover:bg-surface text-text-primary'}`}>
                    <span className="font-mono text-xs text-primary z-10">{ch.number}.</span>
                    <span className="truncate z-10">{ch.title}</span>
                    {scrollPct > 0 && <span className="ml-auto text-[10px] text-neon-cyan font-mono z-10">{scrollPct}%</span>}
                    {read && scrollPct > 0 && scrollPct < 100 && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                        <div className="h-full bg-neon-cyan transition-all" style={{ width: `${scrollPct}%` }} />
                      </div>
                    )}
                    {read && scrollPct >= 100 && <span className="ml-auto text-[10px] text-green-400 font-mono z-10">✓</span>}
                  </Link>
                )
              })}
            </div>
            {chapterLimit < chapters.length && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setChapterLimit((prev) => prev + 50)}
                  className="px-6 py-2.5 bg-surface hover:bg-surface-hover text-text-primary rounded-xl font-medium text-sm transition-colors border border-white/10">
                  {t('novel.showMore', { remaining: chapters.length - chapterLimit })}
                </button>
              </div>
            )}
          </>
        )}

        {anilistData?.characters?.edges?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold mb-4">{t('manga.detail.characters')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {anilistData.characters.edges.slice(0, 12).map((edge) => (
                <Link
                  key={edge.node.id}
                  to={`/character/${edge.node.id}`}
                  className="group rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all">
                  <div className="aspect-[3/4] overflow-hidden">
                    <SafeImage
                      src={edge.node.image?.large}
                      alt={edge.node.name.full}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      fallbackText={edge.node.name.full}
                    />
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-xs font-medium truncate">{edge.node.name.full}</p>
                    <p className="text-[10px] text-text-secondary">{edge.role}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {anilistData?.relations?.edges?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold mb-4">🔗 {t('manga.detail.related')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {anilistData.relations.edges.slice(0, 6).map((edge, i) => {
                const rel = edge.node
                const relType = edge.relationType
                if (rel.type === 'ANIME') {
                  return <AnimeCard key={rel.id} anime={{ ...rel, anilistId: rel.id }} index={i} />
                }
                return (
                  <Link
                    key={rel.id}
                    to={`/manga/${rel.id}`}
                    className="group relative rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all">
                    <div className="aspect-[3/4] overflow-hidden">
                      <SafeImage src={rel.coverImage?.large} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{rel.title?.romaji || rel.title?.english}</p>
                      <p className="text-[10px] text-text-secondary">{relType}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {anilistData?.recommendations?.nodes?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold mb-4">💡 {t('manga.detail.recommended')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {anilistData.recommendations.nodes.slice(0, 6).map((rec, i) => {
                const media = rec.mediaRecommendation
                if (media.type === 'ANIME') {
                  return <AnimeCard key={media.id} anime={{ ...media, anilistId: media.id }} index={i} />
                }
                return (
                  <Link
                    key={media.id}
                    to={`/manga/${media.id}`}
                    className="group relative rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all">
                    <div className="aspect-[3/4] overflow-hidden">
                      <SafeImage src={media.coverImage?.large} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{media.title?.romaji || media.title?.english}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        <div className="mt-12">
          <CommentSection anilistId={slugHash(slug)} mediaType="novel" />
        </div>
      </motion.div>
    </>
  )
}
