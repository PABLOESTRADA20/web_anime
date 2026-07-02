import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getSeasonalAnime } from '../lib/anilist'
import { enrichAnimeBatch } from '../lib/api'
import { GridSkeleton } from '../components/Skeletons'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'
import SafeImage from '../components/SafeImage'
import { useI18n } from '../hooks/useI18n'

function AnimeCardSmall({ anime, index = 0 }) {
  const { t } = useI18n()
  const title = anime.title?.romaji || anime.title?.english || t('common.untitled')
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
      <Link
        to={`/anime/${anime.id}`}
        className="group relative rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all duration-300 border border-transparent hover:border-neon-cyan/30 block">
        <div className="aspect-[3/4] overflow-hidden">
          <SafeImage
            src={anime.coverImage?.large}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            fallbackText={title}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {anime.averageScore && (
          <span
            className="absolute top-2 right-2 bg-neon-cyan/20 text-neon-cyan font-mono text-xs font-bold px-2 py-1 rounded-lg"
            style={{ boxShadow: '0 0 8px rgba(0,240,255,0.3)' }}>
            {anime.averageScore}
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-heading font-medium text-white line-clamp-2 leading-tight">{title}</h3>
          {anime.episodes && (
            <p className="text-xs text-white/60 mt-1">
              {anime.episodes} {t('anime.episodes')}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL']

export default function Seasonal() {
  const { t } = useI18n()
  const [animeList, setAnimeList] = useState([])
  const [loading, setLoading] = useState(true)
  const [season, setSeason] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setPage(1)
    getSeasonalAnime(season, year)
      .then((res) => {
        if (ac.signal.aborted) return
        const list = res.data || []
        setAnimeList(list)
        setHasNext(res.hasNextPage || false)
        setLoading(false)
        enrichAnimeBatch(list)
          .then((enriched) => {
            if (!ac.signal.aborted) setAnimeList(enriched)
          })
          .catch(() => {})
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          setLoading(false)
          toast(t('seasonal.loadError'), 'error')
        }
      })
    return () => ac.abort()
  }, [season, year, toast, t])

  async function loadMore() {
    const next = page + 1
    setLoading(true)
    try {
      const res = await getSeasonalAnime(season, year, next)
      setAnimeList((prev) => [...prev, ...(res.data || [])])
      setHasNext(res.hasNextPage || false)
      setPage(next)
    } catch {
      toast(t('common.loadMoreError'), 'error')
    }
    setLoading(false)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  function getCurrentSeasonLabel() {
    const month = new Date().getMonth() + 1
    if (month <= 3) return t('seasonal.seasons.WINTER')
    if (month <= 6) return t('seasonal.seasons.SPRING')
    if (month <= 9) return t('seasonal.seasons.SUMMER')
    return t('seasonal.seasons.FALL')
  }

  const seasonLabel = season ? t(`seasonal.seasons.${season}`) : getCurrentSeasonLabel()

  return (
    <>
      <SeoHead title={t('seasonal.pageTitle', { season: seasonLabel, year })} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-bold mb-6">{t('seasonal.pageTitle', { season: seasonLabel, year })}</h1>

        <div className="flex flex-wrap gap-2 mb-4">
          {SEASONS.map((s) => (
            <button
              key={s}
              onClick={() => setSeason(s)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                season === s ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
              }`}>
              {t(`seasonal.seasons.${s}`)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                year === y ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
              }`}>
              {y}
            </button>
          ))}
        </div>

        {loading && animeList.length === 0 ? (
          <GridSkeleton count={12} />
        ) : animeList.length === 0 ? (
          <EmptyState message={t('seasonal.noResults')} />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {animeList.map((a, i) => (
                <AnimeCardSmall key={a.id} anime={a} index={i} />
              ))}
            </div>
            {hasNext && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-2.5 bg-surface hover:bg-surface-hover text-text-primary rounded-xl font-medium text-sm transition-colors border border-white/10 disabled:opacity-50">
                  {loading ? t('common.loading') : t('seasonal.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </>
  )
}
