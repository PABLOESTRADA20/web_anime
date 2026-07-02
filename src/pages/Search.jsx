import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import AnimeCard from '../components/AnimeCard'
import { GridSkeleton } from '../components/Skeletons'
import { searchAnime, enrichAnimeBatch } from '../lib/api'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'
import { useI18n } from '../hooks/useI18n'

const RECENT_SEARCHES_KEY = 'anime_recent_searches'
const MAX_RECENT = 8

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]')
  } catch {
    return []
  }
}

function addRecentSearch(query) {
  if (!query?.trim()) return
  const searches = getRecentSearches().filter((s) => s !== query)
  searches.unshift(query.trim())
  if (searches.length > MAX_RECENT) searches.length = MAX_RECENT
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches))
  } catch {
    /* noop */
  }
}

const GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mecha',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
]
const FORMATS = ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC']
const CURRENT_YEAR = new Date().getFullYear()

function useFilters(initial) {
  const [filters, setFilters] = useState(initial)
  const set = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }))
  const clear = () => setFilters({})
  const hasAny = Object.values(filters).some((v) => v !== undefined && v !== '' && v !== null)
  return { filters, set, clear, hasAny }
}

export default function Search() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const { filters, set: setFilter, clear: clearFilters, hasAny } = useFilters({})
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (!query && !hasAny) {
      setResults([])
      setHasSearched(false)
      return
    }
    if (query) addRecentSearch(query)
    const ac = new AbortController()
    setLoading(true)
    setPage(1)
    setHasSearched(true)
    searchAnime(query, 1, filters, ac.signal)
      .then((res) => {
        const items = res?.data || []
        setResults(items)
        setHasNext(res?.hasNextPage || false)
        setLoading(false)
        enrichAnimeBatch(items)
          .then((enriched) => {
            if (!ac.signal.aborted) setResults([...enriched])
          })
          .catch(() => {})
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setLoading(false)
      })
    return () => ac.abort()
  }, [query, filters, hasAny])

  async function loadMore() {
    const next = page + 1
    setLoading(true)
    try {
      const res = await searchAnime(query, next, filters)
      setResults((prev) => [...prev, ...(res?.data || [])])
      setHasNext(res?.hasNextPage || false)
      setPage(next)
    } catch {
      // keep current results on error
    }
    setLoading(false)
  }

  const filterCount = [filters.genre, filters.format, filters.year, filters.minScore].filter(Boolean).length
  const [recentSearches, setRecentSearches] = useState(getRecentSearches)

  const removeRecent = useCallback((q) => {
    const updated = getRecentSearches().filter((s) => s !== q)
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch {
      /* noop */
    }
    setRecentSearches(updated)
  }, [])

  if (!hasSearched) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">{t('search.explore')}</h1>
          <p className="text-text-secondary text-sm">{t('search.exploreHint')}</p>
        </div>

        {recentSearches.length > 0 && (
          <div className="mb-8">
            <p className="text-xs text-text-secondary mb-3 uppercase tracking-wider font-medium">{t('search.recentSearches')}</p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((q) => (
                <span
                  key={q}
                  className="group inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-sm transition-colors border border-white/5">
                  <Link to={`/search?q=${encodeURIComponent(q)}`} className="text-text-secondary hover:text-neon-cyan transition-colors">
                    {q}
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      removeRecent(q)
                    }}
                    className="text-text-secondary/40 hover:text-red-400 transition-colors text-xs">
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <p className="text-xs text-text-secondary mb-3 uppercase tracking-wider font-medium">{t('search.exploreGenre')}</p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/search?q=popular"
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors">
              🌟 {t('search.mostPopular')}
            </Link>
            <Link
              to="/search?q=trending"
              className="px-4 py-2 rounded-xl bg-accent/20 text-accent text-sm font-medium hover:bg-accent/30 transition-colors">
              🔥 {t('search.trending')}
            </Link>
            {GENRES.map((g) => (
              <Link
                key={g}
                to={`/search?q=${g.toLowerCase()}`}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-hover text-text-secondary hover:text-neon-cyan text-sm font-medium transition-colors">
                {g}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-text-secondary mb-3 uppercase tracking-wider font-medium">{t('search.filters')}</p>
          <button
            onClick={() => {
              setShowFilters(true)
              setHasSearched(true)
            }}
            className="px-4 py-2 bg-surface hover:bg-surface-hover text-text-secondary rounded-xl text-sm font-medium transition-colors border border-white/10">
            {t('search.openFilters')}
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <>
      <SeoHead title={query ? t('search.titleWithQuery', { query }) : t('search.title')} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">
            {query ? (
              <>
                {t('search.resultsFor')} <span className="text-primary">"{query}"</span>
              </>
            ) : (
              <>
                {t('search.explore')} {filterCount > 0 ? `(${t('search.filterCount', { count: filterCount })})` : ''}
              </>
            )}
          </h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              hasAny ? 'bg-primary text-white border-primary' : 'bg-surface text-text-secondary border-white/10 hover:text-neon-cyan'
            }`}>
            {t('search.filters')}
            {hasAny ? ` (${filterCount})` : ''}
          </button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-surface rounded-2xl space-y-4 overflow-hidden">
            <div>
              <p className="text-xs text-text-secondary mb-2">{t('search.genre')}</p>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => setFilter('genre', filters.genre === g ? undefined : g)}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${
                      filters.genre === g ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:text-text-primary'
                    }`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-text-secondary mb-2">{t('anime.detail.format')}</p>
              <div className="flex flex-wrap gap-1.5">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter('format', filters.format === f ? undefined : f)}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${
                      filters.format === f ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:text-text-primary'
                    }`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs text-text-secondary mb-1.5">{t('common.year')}</p>
                <select
                  value={filters.year ?? ''}
                  onChange={(e) => setFilter('year', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  className="bg-surface-hover text-text-primary text-xs px-3 py-1.5 rounded-lg border border-white/10">
                  <option value="">{t('common.all')}</option>
                  {Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1.5">{t('search.minScore')}</p>
                <select
                  value={filters.minScore ?? ''}
                  onChange={(e) => setFilter('minScore', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  className="bg-surface-hover text-text-primary text-xs px-3 py-1.5 rounded-lg border border-white/10">
                  <option value="">{t('search.any')}</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                    <option key={s} value={s}>
                      {s}&#9733;+
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {hasAny && (
              <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                {t('search.clearFilters')}
              </button>
            )}
          </motion.div>
        )}

        {loading && results.length === 0 ? (
          <GridSkeleton count={12} />
        ) : results.length === 0 ? (
          <EmptyState
            message={t('search.noResults')}
            action={hasAny ? { label: t('search.clearFilters'), onClick: clearFilters } : undefined}
          />
        ) : (
          <>
            <p className="text-xs text-text-secondary mb-4">{t('search.resultCount', { count: results.length })}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {results.map((a, i) => (
                <AnimeCard key={a.anilistId || a.id || i} anime={a} index={i} />
              ))}
            </div>

            {hasNext && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-2.5 bg-surface hover:bg-surface-hover hover:text-neon-cyan
                           rounded-xl font-medium text-sm transition-colors border border-white/10
                           disabled:opacity-50">
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
