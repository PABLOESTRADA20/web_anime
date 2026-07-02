import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getMangaDirectory } from '../lib/anilist'
import { GridSkeleton } from '../components/Skeletons'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'
import SafeImage from '../components/SafeImage'
import { useI18n } from '../hooks/useI18n'
import { useMangaHistory } from '../hooks/useMangaHistory'

const PER_PAGE = 30
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => currentYear - i)

function MangaCard({ manga, index = 0, progressCount = 0 }) {
  const { t } = useI18n()
  const title = manga.title?.romaji || manga.title?.english || 'Sin título'
  const chapters = manga.chapters || manga.volumes
  const hasProgress = progressCount > 0
  const progressPercent = chapters && chapters > 0 ? Math.min(100, Math.round((progressCount / chapters) * 100)) : 0

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
      <Link
        to={`/manga/${manga.id}`}
        className="group relative rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all duration-300 border border-transparent hover:border-neon-cyan/30 block">
        <div className="aspect-[3/4] overflow-hidden">
          <SafeImage
            src={manga.coverImage?.large}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            fallbackText={title}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {manga.averageScore && (
          <span
            className="absolute top-2 right-2 bg-neon-cyan/20 text-neon-cyan font-mono text-xs font-bold px-2 py-1 rounded-lg"
            style={{ boxShadow: '0 0 8px rgba(0,240,255,0.3)' }}>
            {manga.averageScore}
          </span>
        )}
        {manga.format && (
          <span className="absolute top-2 left-2 bg-primary/20 text-primary text-xs font-mono font-medium px-2 py-1 rounded-lg tracking-wider">
            {manga.format}
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-heading font-medium text-white line-clamp-2 leading-tight">{title}</h3>
          <div className="flex items-center gap-2 mt-1">
            {chapters && (
              <p className="text-xs text-white/60">
                {chapters} {t('manga.chapters')}
              </p>
            )}
            {hasProgress && (
              <span className="text-[10px] text-neon-cyan font-medium">
                {progressCount}/{chapters}
              </span>
            )}
          </div>
        </div>
        {hasProgress && (
          <div className="absolute bottom-0 left-0 right-0" style={{ bottom: '-2px' }}>
            <div className="h-1.5 bg-white/10 rounded-full mx-1 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </Link>
    </motion.div>
  )
}

function FilterSection({ label, children }) {
  return (
    <div>
      <p className="text-[10px] text-text-secondary/50 uppercase tracking-wider mb-1.5 font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
        active ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary'
      }`}>
      {children}
    </button>
  )
}

export default function Manga() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const toast = useToast()

  const [searchText, setSearchText] = useState(initialQuery)
  const [appliedSearch, setAppliedSearch] = useState(initialQuery)
  const [selectedGenres, setSelectedGenres] = useState([])
  const [format, setFormat] = useState('')
  const [status, setStatus] = useState('')
  const [year, setYear] = useState('')
  const [sort, setSort] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [mangaList, setMangaList] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)

  const { mangaHistory } = useMangaHistory()

  const filters = useMemo(() => {
    const f = {}
    if (appliedSearch.trim()) f.search = appliedSearch.trim()
    if (selectedGenres.length > 0) f.genre_in = selectedGenres
    if (format) f.format = format
    if (status) f.status = status
    if (year) f.year = parseInt(year, 10)
    if (sort) f.sort = [sort]
    return f
  }, [appliedSearch, selectedGenres, format, status, year, sort])

  const hasFilters = Object.keys(filters).length > 0

  const acRef = useRef(null)
  useEffect(() => {
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac
    setLoading(true)

    getMangaDirectory(page, PER_PAGE, filters, ac.signal)
      .then((res) => {
        if (ac.signal.aborted) return
        if (page === 1) {
          setMangaList(res.data || [])
        } else {
          setMangaList((prev) => [...prev, ...(res.data || [])])
        }
        setTotal(res.total || 0)
        setHasNext(res.hasNextPage || false)
        setLoading(false)
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          setLoading(false)
          toast(t('directory.filter.error'), 'error')
        }
      })

    return () => ac.abort()
  }, [page, filters, toast, t])

  function applySearch(value) {
    setAppliedSearch(value)
    setPage(1)
    if (value.trim()) {
      setSearchParams({ q: value.trim() })
    } else {
      setSearchParams({})
    }
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Enter') {
      applySearch(searchText)
    }
  }

  function handleSearchClick() {
    applySearch(searchText)
  }

  function toggleGenre(genre) {
    setSelectedGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]))
    setPage(1)
  }

  function setFilter(key, value) {
    if (key === 'format') setFormat(value || '')
    else if (key === 'status') setStatus(value || '')
    else if (key === 'year') setYear(value || '')
    else if (key === 'sort') setSort(value || '')
    setPage(1)
  }

  function clearFilters() {
    setSearchText('')
    setAppliedSearch('')
    setSelectedGenres([])
    setFormat('')
    setStatus('')
    setYear('')
    setSort('')
    setPage(1)
    setSearchParams({})
  }

  function loadMore() {
    setPage((p) => p + 1)
  }

  function getMangaProgress(mangaId) {
    if (!mangaHistory || mangaHistory.length === 0) return 0
    return mangaHistory.filter((h) => h.anilist_id === mangaId).length
  }

  const GENRES = useMemo(
    () => [
      { value: 'Action', label: t('genres.Action') },
      { value: 'Adventure', label: t('genres.Adventure') },
      { value: 'Cars', label: t('genres.Cars') },
      { value: 'Comedy', label: t('genres.Comedy') },
      { value: 'Dementia', label: t('genres.Dementia') },
      { value: 'Demons', label: t('genres.Demons') },
      { value: 'Mystery', label: t('genres.Mystery') },
      { value: 'Drama', label: t('genres.Drama') },
      { value: 'Ecchi', label: t('genres.Ecchi') },
      { value: 'Fantasy', label: t('genres.Fantasy') },
      { value: 'Game', label: t('genres.Game') },
      { value: 'Hentai', label: t('genres.Hentai') },
      { value: 'Historical', label: t('genres.Historical') },
      { value: 'Horror', label: t('genres.Horror') },
      { value: 'Kids', label: t('genres.Kids') },
      { value: 'Magic', label: t('genres.Magic') },
      { value: 'Martial Arts', label: t('genres.MartialArts') },
      { value: 'Mecha', label: t('genres.Mecha') },
      { value: 'Music', label: t('genres.Music') },
      { value: 'Parody', label: t('genres.Parody') },
      { value: 'Samurai', label: t('genres.Samurai') },
      { value: 'Romance', label: t('genres.Romance') },
      { value: 'Sci-Fi', label: t('genres.SciFi') },
      { value: 'Shoujo', label: t('genres.Shoujo') },
      { value: 'Shoujo Ai', label: t('genres.ShoujoAi') },
      { value: 'Shounen', label: t('genres.Shounen') },
      { value: 'Shounen Ai', label: t('genres.ShounenAi') },
      { value: 'Space', label: t('genres.Space') },
      { value: 'Sports', label: t('genres.Sports') },
      { value: 'Super Power', label: t('genres.SuperPower') },
      { value: 'Vampire', label: t('genres.Vampire') },
      { value: 'Yaoi', label: t('genres.Yaoi') },
      { value: 'Yuri', label: t('genres.Yuri') },
      { value: 'Harem', label: t('genres.Harem') },
      { value: 'Slice of Life', label: t('genres.SliceOfLife') },
      { value: 'Supernatural', label: t('genres.Supernatural') },
      { value: 'Military', label: t('genres.Military') },
      { value: 'Police', label: t('genres.Police') },
      { value: 'Psychological', label: t('genres.Psychological') },
      { value: 'Thriller', label: t('genres.Thriller') },
      { value: 'Seinen', label: t('genres.Seinen') },
      { value: 'Josei', label: t('genres.Josei') },
    ],
    [t],
  )

  const FORMATS = useMemo(
    () => [
      { value: 'MANGA', label: 'MANGA' },
      { value: 'NOVEL', label: 'NOVEL' },
      { value: 'ONE_SHOT', label: 'ONE_SHOT' },
    ],
    [],
  )

  const STATUSES = useMemo(
    () => [
      { value: 'RELEASING', label: t('manga.status.publishing') },
      { value: 'FINISHED', label: t('manga.status.finished') },
      { value: 'NOT_YET_RELEASED', label: t('manga.status.upcoming') },
      { value: 'CANCELLED', label: t('manga.status.cancelled') },
      { value: 'HIATUS', label: t('manga.status.hiatus') },
    ],
    [t],
  )

  const SORTS = useMemo(
    () => [
      { value: 'TRENDING_DESC', label: t('manga.sort.trending') },
      { value: 'POPULARITY_DESC', label: t('manga.sort.popular') },
      { value: 'SCORE_DESC', label: t('manga.sort.score') },
      { value: 'START_DATE_DESC', label: t('manga.sort.date') },
      { value: 'TITLE_ROMAJI', label: t('manga.sort.title') },
    ],
    [t],
  )

  return (
    <>
      <SeoHead title={appliedSearch ? `"${appliedSearch}" — ${t('manga.title')}` : t('manga.title')} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">{t('manga.title')}</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showFilters || hasFilters
                ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30'
                : 'bg-surface text-text-secondary border-white/10 hover:bg-surface-hover'
            }`}>
            {t('nav.directory')} {hasFilters ? `(${Object.keys(filters).length})` : ''}
          </button>
        </div>

        <div className="mb-4">
          <div className="flex gap-2">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('directory.filter.search')}
              className="flex-1 px-4 py-2 rounded-xl bg-surface border border-white/10 text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-neon-cyan/70 transition-colors"
            />
            <button
              onClick={handleSearchClick}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity">
              {t('directory.filter.apply')}
            </button>
          </div>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 space-y-4 p-4 rounded-2xl bg-surface/50 border border-white/5">
            <FilterSection label={t('directory.filter.genres')}>
              {GENRES.map((g) => (
                <FilterBtn key={g.value} active={selectedGenres.includes(g.value)} onClick={() => toggleGenre(g.value)}>
                  {g.label}
                </FilterBtn>
              ))}
            </FilterSection>

            <FilterSection label={t('directory.filter.format')}>
              {FORMATS.map((f) => (
                <FilterBtn
                  key={f.value}
                  active={format === f.value}
                  onClick={() => setFilter('format', format === f.value ? undefined : f.value)}>
                  {f.label}
                </FilterBtn>
              ))}
            </FilterSection>

            <FilterSection label={t('directory.filter.status')}>
              {STATUSES.map((s) => (
                <FilterBtn
                  key={s.value}
                  active={status === s.value}
                  onClick={() => setFilter('status', status === s.value ? undefined : s.value)}>
                  {s.label}
                </FilterBtn>
              ))}
            </FilterSection>

            <FilterSection label={t('directory.filter.year')}>
              <select
                value={year}
                onChange={(e) => setFilter('year', e.target.value || undefined)}
                className="bg-surface text-text-primary text-[11px] px-2 py-1 rounded-lg border border-white/10">
                <option value="">{t('directory.filter.year')}</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </FilterSection>

            <FilterSection label={t('directory.filter.sort')}>
              {SORTS.map((s) => (
                <FilterBtn key={s.value} active={(sort || 'TRENDING_DESC') === s.value} onClick={() => setFilter('sort', s.value)}>
                  {s.label}
                </FilterBtn>
              ))}
            </FilterSection>

            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                {t('directory.filter.clear')}
              </button>
            )}
          </motion.div>
        )}

        {total > 0 && <p className="text-xs text-text-secondary mb-4">{t('directory.filter.results', { count: total })}</p>}

        {loading && mangaList.length === 0 ? (
          <GridSkeleton count={12} />
        ) : mangaList.length === 0 ? (
          <EmptyState
            message={t('directory.filter.noResults')}
            action={hasFilters ? { label: t('directory.filter.clear'), onClick: clearFilters } : undefined}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {mangaList.map((m, i) => (
                <MangaCard key={m.id} manga={m} index={i} progressCount={getMangaProgress(m.id)} />
              ))}
            </div>
            {hasNext && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-2.5 bg-surface hover:bg-surface-hover text-text-primary rounded-xl font-medium text-sm transition-colors border border-white/10 disabled:opacity-50">
                  {loading ? t('common.loading') : t('common.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </>
  )
}
