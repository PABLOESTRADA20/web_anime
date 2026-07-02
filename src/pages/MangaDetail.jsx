import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DetailSkeleton } from '../components/Skeletons'
import AnimeCard from '../components/AnimeCard'
import CommentSection from '../components/CommentSection'
import SeoHead from '../components/SeoHead'
import { getMangaInfo } from '../lib/anilist'
import { getMangaChapters } from '../lib/manga'
import { useMangaHistory } from '../hooks/useMangaHistory'
import { useToast } from '../components/Toast'
import { useMangaFavorites } from '../hooks/useMangaFavorites'
import { useMangaLists } from '../hooks/useMangaLists'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import SafeImage from '../components/SafeImage'
import EmptyState from '../components/EmptyState'
import ShareButton from '../components/ShareButton'
import Breadcrumbs from '../components/Breadcrumbs'
import { useGamification } from '../hooks/useGamification'
import { XP_VALUES } from '../lib/achievements'

function formatChapterNum(n) {
  if (Number.isInteger(n)) return n.toString()
  return n.toFixed(1)
}

export default function MangaDetail() {
  const { id } = useParams()
  const [manga, setManga] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chapters, setChapters] = useState([])
  const [chaptersLoading, setChaptersLoading] = useState(true)
  const [chapterLimit, setChapterLimit] = useState(30)
  const [expandedVolumes, setExpandedVolumes] = useState({})

  const visibleChapters = useMemo(() => chapters.slice(0, chapterLimit), [chapters, chapterLimit])
  const volumeGroups = useMemo(() => {
    const grouped = {}
    for (const ch of visibleChapters) {
      const v = ch.volume || 0
      if (!grouped[v]) grouped[v] = []
      grouped[v].push(ch)
    }
    return Object.entries(grouped).sort(([a], [b]) => Number(b) - Number(a))
  }, [visibleChapters])

  useEffect(() => {
    if (Object.keys(expandedVolumes).length === 0 && volumeGroups.length > 0) {
      const initial = {}
      for (const [v] of volumeGroups) initial[v] = true
      setExpandedVolumes(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volumeGroups])

  function toggleVolume(v) {
    setExpandedVolumes((prev) => ({ ...prev, [v]: !prev[v] }))
  }

  const { user } = useAuth()
  const { getLatestChapter, isChapterRead } = useMangaHistory()
  const { isFavorite, toggleFavorite } = useMangaFavorites()
  const { getListStatus, setListStatus: setMangaListStatus } = useMangaLists()
  const [favLoading, setFavLoading] = useState(false)
  const toast = useToast()
  const { t } = useI18n()
  const { addXp, checkAchievements } = useGamification()

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setChapters([])
    getMangaInfo(id)
      .then(async (data) => {
        if (ac.signal.aborted) return
        setManga(data)
        setLoading(false)
        try {
          const chs = await getMangaChapters(id, data)
          if (!ac.signal.aborted) setChapters(chs || [])
        } catch {
          /* no chapters */
        }
        if (!ac.signal.aborted) setChaptersLoading(false)
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          setLoading(false)
          setChaptersLoading(false)
          toast(t('errors.loadManga'), 'error')
        }
      })
    return () => ac.abort()
  }, [id, toast, t])

  if (loading)
    return (
      <>
        <SeoHead title={t('common.loading')} />
        <DetailSkeleton />
      </>
    )
  if (!manga)
    return (
      <>
        <SeoHead title={t('errors.notFound')} />
        <div className="text-center py-20 text-text-secondary">{t('errors.notFound')}</div>
      </>
    )

  const title = manga.title?.romaji || manga.title?.english || manga.title?.native || ''
  const image = manga.coverImage?.large
  const banner = manga.bannerImage

  const firstChapter = chapters.length > 0 ? chapters[chapters.length - 1] : null
  const latestFromHistory = getLatestChapter(id)
  const readChapter = latestFromHistory
    ? { chapterId: latestFromHistory.chapter_id, chapterNumber: latestFromHistory.chapter_number }
    : firstChapter

  return (
    <>
      <SeoHead
        title={title}
        description={manga.description?.replace(/<[^>]*>/g, '').slice(0, 160)}
        image={image || banner}
        url={`/manga/${id}`}
      />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        {banner && (
          <div className="relative h-[200px] sm:h-[300px] rounded-3xl overflow-hidden mb-6">
            <SafeImage src={banner} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-6 mb-10">
          <div className="shrink-0 w-[200px] mx-auto sm:mx-0">
            <SafeImage src={image} alt={title} className="w-full rounded-2xl shadow-lg" fallbackText={title} />
          </div>
          <div className="flex-1 min-w-0">
            <Breadcrumbs
              items={[{ label: t('nav.home'), href: '/' }, { label: t('manga.detail.breadcrumbs'), href: '/directorio' }, { label: title }]}
            />
            <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
            {manga.title?.native && <p className="text-text-secondary text-sm mt-1">{manga.title.native}</p>}

            <div className="flex flex-wrap gap-2 mt-3">
              {manga.genres?.map((g) => (
                <span key={g} className="text-xs bg-surface px-3 py-1 rounded-full text-text-secondary">
                  {g}
                </span>
              ))}
              {manga.averageScore && (
                <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-medium">★ {manga.averageScore}</span>
              )}
              {manga.format && <span className="text-xs bg-accent/20 text-accent px-3 py-1 rounded-full">{manga.format}</span>}
              {manga.chapters && (
                <span className="text-xs bg-surface px-3 py-1 rounded-full text-text-secondary">
                  {manga.chapters} {t('manga.chapters')}
                </span>
              )}
              {manga.volumes && (
                <span className="text-xs bg-surface px-3 py-1 rounded-full text-text-secondary">
                  {manga.volumes} {t('manga.volumes')}
                </span>
              )}
              {manga.status && (
                <span className="text-xs bg-surface px-3 py-1 rounded-full text-text-secondary">
                  {manga.status === 'RELEASING'
                    ? t('manga.status.publishing')
                    : manga.status === 'FINISHED'
                      ? t('manga.status.finished')
                      : manga.status === 'NOT_YET_RELEASED'
                        ? t('manga.status.upcoming')
                        : manga.status}
                </span>
              )}
            </div>

            {manga.synonyms?.length > 0 && (
              <p className="text-xs text-text-secondary mt-3">
                {t('manga.detail.synonyms')}: {manga.synonyms.join(', ')}
              </p>
            )}

            {manga.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {manga.tags.slice(0, 8).map((t) => (
                  <span key={t.name} className="text-[10px] bg-surface px-2 py-0.5 rounded text-text-secondary">
                    {t.name}
                  </span>
                ))}
              </div>
            )}

            {manga.description && (
              <p className="text-sm text-text-secondary mt-4 leading-relaxed line-clamp-4">{manga.description.replace(/<[^>]*>/g, '')}</p>
            )}

            {manga.staff?.edges?.length > 0 && (
              <p className="text-sm text-text-secondary mt-3">
                {t('manga.detail.staff')}:{' '}
                {manga.staff.edges
                  .slice(0, 3)
                  .map((s) => s.node.name.full)
                  .join(', ')}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <Link
                to={
                  readChapter
                    ? `/manga/${id}/read?chapterId=${readChapter.chapterId}&chapter=${readChapter.chapterNumber}&title=${encodeURIComponent(title)}&image=${encodeURIComponent(image || '')}`
                    : '#'
                }
                className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-colors ${readChapter ? 'bg-primary hover:bg-primary-hover text-white' : 'bg-surface text-text-secondary cursor-not-allowed'}`}
                onClick={(e) => {
                  if (!readChapter) e.preventDefault()
                }}>
                ▶ {latestFromHistory ? t('manga.continue') : t('manga.read')}
              </Link>
              <ShareButton title={manga?.title?.romaji || manga?.title?.english || title} />
              {user && (
                <button
                  onClick={async () => {
                    const wasFav = isFavorite(parseInt(id, 10))
                    setFavLoading(true)
                    try {
                      await toggleFavorite(parseInt(id, 10), title, image)
                      if (!wasFav) {
                        addXp(XP_VALUES.ADD_FAVORITE, 'favorite')
                        checkAchievements({ favorites: 1 })
                      }
                    } catch {
                      /* ignore */
                    }
                    setFavLoading(false)
                  }}
                  disabled={favLoading}
                  className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-colors border ${
                    isFavorite(parseInt(id, 10))
                      ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                      : 'bg-surface text-text-secondary border-white/10 hover:text-neon-cyan hover:bg-surface-hover'
                  }`}>
                  {isFavorite(parseInt(id, 10)) ? `❤️ ${t('manga.favorites.remove')}` : `🤍 ${t('manga.favorites.add')}`}
                </button>
              )}
              {user && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {[
                    { key: 'reading', label: t('manga.listStatus.reading') },
                    { key: 'completed', label: t('manga.listStatus.completed') },
                    { key: 'plan_to_read', label: t('manga.listStatus.plan_to_read') },
                  ].map((s) => (
                    <button
                      key={s.key}
                      onClick={async () => {
                        try {
                          await setMangaListStatus(
                            parseInt(id, 10),
                            manga.title?.romaji || manga.title?.english || '',
                            manga.image || manga.coverImage?.large,
                            s.key,
                          )
                          toast(
                            getListStatus(parseInt(id, 10)) === s.key
                              ? t('manga.listStatus.removed')
                              : t('manga.listStatus.marked', { status: s.label }),
                            'success',
                          )
                        } catch {
                          toast(t('errors.updateList'), 'error')
                        }
                      }}
                      className={`px-3 py-2 rounded-xl font-medium text-xs transition-colors border ${
                        getListStatus(parseInt(id, 10)) === s.key
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface text-text-secondary border-white/10 hover:text-neon-cyan hover:bg-surface-hover'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {manga.characters?.edges?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold mb-4">{t('manga.detail.characters')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {manga.characters.edges.slice(0, 12).map((edge) => (
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

        {manga.relations?.edges?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold mb-4">🔗 {t('manga.detail.related')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {manga.relations.edges.slice(0, 6).map((edge, i) => {
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

        {manga.recommendations?.nodes?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold mb-4">💡 {t('manga.detail.recommended')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {manga.recommendations.nodes.slice(0, 6).map((rec, i) => {
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

        <CommentSection anilistId={id} mediaType="manga" />

        {/* Chapters */}
        <section className="mt-10">
          <h2 className="text-lg font-bold mb-4">
            {t('manga.detail.chapters')} ({chapters.length})
          </h2>

          {chaptersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 bg-surface rounded-xl animate-pulse" />
              ))}
            </div>
          ) : chapters.length === 0 ? (
            <EmptyState message={t('manga.noChapters')} />
          ) : (
            <>
              <div className="space-y-4">
                {volumeGroups.map(([vol, chs]) => {
                  const isOpen = expandedVolumes[vol]
                  const volLabel = vol === '0' ? t('manga.detail.noVolume') : `${t('manga.detail.volume')} ${vol}`

                  return (
                    <div key={vol} className="rounded-2xl bg-surface/30 border border-white/5 overflow-hidden">
                      <button
                        onClick={() => toggleVolume(vol)}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-surface-hover/50 transition-colors text-left">
                        <span className="text-sm font-semibold text-text-primary">{volLabel}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-text-secondary font-mono">
                            {chs.length} {t('manga.chapters')}
                          </span>
                          <svg
                            className={`w-4 h-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-3 space-y-1.5">
                          {chs.map((ch) => {
                            const read = isChapterRead(id, ch.chapterNumber)
                            const latest = getLatestChapter(id)
                            const isCurrent = latest?.chapter_number === ch.chapterNumber

                            return (
                              <Link
                                key={ch.chapterId}
                                to={`/manga/${id}/read?chapterId=${ch.chapterId}&chapter=${ch.chapterNumber}&title=${encodeURIComponent(manga?.title?.romaji || manga?.title?.english || '')}&image=${encodeURIComponent(manga?.coverImage?.large || '')}`}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-colors group ${
                                  read ? 'bg-surface/50' : 'bg-surface hover:bg-surface-hover'
                                }`}>
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                    read ? 'bg-primary/20 text-primary' : 'bg-surface-hover text-text-secondary'
                                  }`}>
                                  {read ? '✓' : formatChapterNum(ch.chapterNumber)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium group-hover:text-primary transition-colors">
                                    {t('manga.chapter')} {formatChapterNum(ch.chapterNumber)}
                                    {isCurrent && <span className="ml-2 text-[10px] text-accent">{t('manga.reader.reading')}</span>}
                                  </p>
                                  {ch.title && <p className="text-xs text-text-secondary truncate">{ch.title}</p>}
                                </div>
                                {read && <span className="text-[10px] text-text-secondary shrink-0">{t('manga.reader.read')}</span>}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {chapterLimit < chapters.length && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setChapterLimit((prev) => prev + 30)}
                    className="px-6 py-2.5 bg-surface hover:bg-surface-hover text-text-primary rounded-xl font-medium text-sm transition-colors border border-white/10">
                    {t('manga.loadMore')} ({chapters.length - chapterLimit} {t('manga.remaining')})
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </motion.div>
    </>
  )
}
