import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { getDirectory } from '../lib/anilist'
import { enrichAnimeBatch } from '../lib/api'
import AnimeCard from '../components/AnimeCard'
import { GridSkeleton } from '../components/Skeletons'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { useI18n } from '../hooks/useI18n'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => currentYear - i)

const PER_PAGE = 30

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

export default function Directory() {
  const { t } = useI18n()

  const GENRES = useMemo(
    () => [
      { label: t('anime.genre.Action'), value: 'Action' },
      { label: t('anime.genre.Adventure'), value: 'Adventure' },
      { label: t('anime.genre.Cars'), value: 'Cars' },
      { label: t('anime.genre.Comedy'), value: 'Comedy' },
      { label: t('anime.genre.Dementia'), value: 'Dementia' },
      { label: t('anime.genre.Demons'), value: 'Demons' },
      { label: t('anime.genre.Mystery'), value: 'Mystery' },
      { label: t('anime.genre.Drama'), value: 'Drama' },
      { label: t('anime.genre.Ecchi'), value: 'Ecchi' },
      { label: t('anime.genre.Fantasy'), value: 'Fantasy' },
      { label: t('anime.genre.Game'), value: 'Game' },
      { label: t('anime.genre.Hentai'), value: 'Hentai' },
      { label: t('anime.genre.Historical'), value: 'Historical' },
      { label: t('anime.genre.Horror'), value: 'Horror' },
      { label: t('anime.genre.Kids'), value: 'Kids' },
      { label: t('anime.genre.Magic'), value: 'Magic' },
      { label: t('anime.genre.MartialArts'), value: 'Martial Arts' },
      { label: t('anime.genre.Mecha'), value: 'Mecha' },
      { label: t('anime.genre.Music'), value: 'Music' },
      { label: t('anime.genre.Parody'), value: 'Parody' },
      { label: t('anime.genre.Samurai'), value: 'Samurai' },
      { label: t('anime.genre.Romance'), value: 'Romance' },
      { label: t('anime.genre.SciFi'), value: 'Sci-Fi' },
      { label: t('anime.genre.Shoujo'), value: 'Shoujo' },
      { label: t('anime.genre.ShoujoAi'), value: 'Shoujo Ai' },
      { label: t('anime.genre.Shounen'), value: 'Shounen' },
      { label: t('anime.genre.ShounenAi'), value: 'Shounen Ai' },
      { label: t('anime.genre.Space'), value: 'Space' },
      { label: t('anime.genre.Sports'), value: 'Sports' },
      { label: t('anime.genre.SuperPower'), value: 'Super Power' },
      { label: t('anime.genre.Vampire'), value: 'Vampire' },
      { label: t('anime.genre.Yaoi'), value: 'Yaoi' },
      { label: t('anime.genre.Yuri'), value: 'Yuri' },
      { label: t('anime.genre.Harem'), value: 'Harem' },
      { label: t('anime.genre.SliceOfLife'), value: 'Slice of Life' },
      { label: t('anime.genre.Supernatural'), value: 'Supernatural' },
      { label: t('anime.genre.Military'), value: 'Military' },
      { label: t('anime.genre.Police'), value: 'Police' },
      { label: t('anime.genre.Psychological'), value: 'Psychological' },
      { label: t('anime.genre.Thriller'), value: 'Thriller' },
      { label: t('anime.genre.Seinen'), value: 'Seinen' },
      { label: t('anime.genre.Josei'), value: 'Josei' },
    ],
    [t],
  )

  const FORMATS = useMemo(
    () => [
      { value: 'TV', label: t('anime.format.TV') },
      { value: 'MOVIE', label: t('anime.format.MOVIE') },
      { value: 'OVA', label: t('anime.format.OVA') },
      { value: 'ONA', label: t('anime.format.ONA') },
      { value: 'SPECIAL', label: t('anime.format.SPECIAL') },
      { value: 'TV_SHORT', label: t('anime.format.TV_SHORT') },
    ],
    [t],
  )

  const STATUSES = useMemo(
    () => [
      { value: 'RELEASING', label: t('anime.status.RELEASING') },
      { value: 'FINISHED', label: t('anime.status.FINISHED') },
      { value: 'NOT_YET_RELEASED', label: t('anime.status.NOT_YET_RELEASED') },
      { value: 'CANCELLED', label: t('anime.status.CANCELLED') },
      { value: 'HIATUS', label: t('anime.status.HIATUS') },
    ],
    [t],
  )

  const SEASONS = useMemo(
    () => [
      { value: 'WINTER', label: t('anime.season.WINTER') },
      { value: 'SPRING', label: t('anime.season.SPRING') },
      { value: 'SUMMER', label: t('anime.season.SUMMER') },
      { value: 'FALL', label: t('anime.season.FALL') },
    ],
    [t],
  )

  const SORTS = useMemo(
    () => [
      { value: 'TRENDING_DESC', label: t('anime.sort.TRENDING_DESC') },
      { value: 'POPULARITY_DESC', label: t('anime.sort.POPULARITY_DESC') },
      { value: 'SCORE_DESC', label: t('anime.sort.SCORE_DESC') },
      { value: 'START_DATE_DESC', label: t('anime.sort.START_DATE_DESC') },
      { value: 'EPISODES_DESC', label: t('anime.sort.EPISODES_DESC') },
      { value: 'TITLE_ROMAJI', label: t('anime.sort.TITLE_ROMAJI') },
    ],
    [t],
  )

  const filtersState = useState({})
  const [_filters, _setFilters] = filtersState

  const [animeList, setAnimeList] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [spanishOnly, setSpanishOnly] = useState(false)
  const [enriched, setEnriched] = useState(false)
  const toast = useToast()
  const acRef = useRef(null)

  const filters = useMemo(() => {
    const f = {}
    if (_filters.genre) f.genre_in = [_filters.genre]
    if (_filters.year) f.year = parseInt(_filters.year, 10)
    if (_filters.format) f.format = _filters.format
    if (_filters.status) f.status = _filters.status
    if (_filters.season) f.season = _filters.season
    if (_filters.sort) f.sort = [_filters.sort]
    if (_filters.letter) {
      f.search = _filters.letter
      f.sort = ['TITLE_ROMAJI']
    }
    return f
  }, [_filters])

  useEffect(() => {
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac
    setLoading(true)
    getDirectory(page, PER_PAGE, filters)
      .then((res) => {
        if (ac.signal.aborted) return
        const list = res.data || []
        setAnimeList(list)
        setTotal(res.total)
        setLoading(false)
        enrichAnimeBatch(list)
          .then((enrichedList) => {
            setAnimeList(enrichedList)
            setEnriched(true)
          })
          .catch(() => {})
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          setLoading(false)
          toast(t('directory.filter.error'), 'error')
        }
      })
  }, [page, filters, toast, t])

  function setFilter(key, value) {
    _setFilters((prev) => ({ ...prev, [key]: value || undefined }))
    setPage(1)
  }

  function clearFilters() {
    _setFilters({})
    setSearchText('')
    setPage(1)
  }

  const hasFilters = Object.keys(filters).length > 0 || Object.keys(_filters).length > 0
  const displayList = spanishOnly && enriched ? animeList.filter((a) => a.title_es) : animeList
  const totalPages = Math.ceil(total / PER_PAGE)

  function randomAnime() {
    const randomPage = Math.floor(Math.random() * Math.max(1, totalPages)) + 1
    getDirectory(randomPage, 1, { sort: ['POPULARITY_DESC'] })
      .then((res) => {
        if (res.data?.[0]?.id) {
          window.open(`/anime/${res.data[0].id}`, '_self')
        }
      })
      .catch(() => {
        toast(t('directory.randomError'), 'error')
      })
  }

  return (
    <>
      <SeoHead title={t('directory.title')} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t('directory.title')}</h1>
          <div className="flex gap-2">
            <button
              onClick={randomAnime}
              className="px-3 py-1.5 rounded-lg bg-surface text-text-secondary hover:text-neon-cyan hover:bg-surface-hover text-xs font-medium border border-white/10 transition-colors">
              {t('directory.random')}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                showFilters || hasFilters
                  ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30'
                  : 'bg-surface text-text-secondary border-white/10 hover:bg-surface-hover'
              }`}>
              {t('directory.filters')} {hasFilters ? `(${Object.keys(_filters).length})` : ''}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex gap-2">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setFilter('search', searchText.trim() || undefined)
                  setFilter('letter', undefined)
                }
              }}
              placeholder={t('directory.filter.search')}
              className="flex-1 px-4 py-2 rounded-xl bg-surface border border-white/10 text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-neon-cyan/70 transition-colors"
            />
            <button
              onClick={() => {
                setFilter('search', searchText.trim() || undefined)
                setFilter('letter', undefined)
              }}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity">
              {t('directory.filter.search')}
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
                <FilterBtn
                  key={g.value}
                  active={_filters.genre === g.value}
                  onClick={() => setFilter('genre', _filters.genre === g.value ? undefined : g.value)}>
                  {g.label}
                </FilterBtn>
              ))}
            </FilterSection>

            <FilterSection label={t('directory.filter.format')}>
              {FORMATS.map((f) => (
                <FilterBtn
                  key={f.value}
                  active={_filters.format === f.value}
                  onClick={() => setFilter('format', _filters.format === f.value ? undefined : f.value)}>
                  {f.label}
                </FilterBtn>
              ))}
            </FilterSection>

            <FilterSection label={t('directory.filter.status')}>
              {STATUSES.map((s) => (
                <FilterBtn
                  key={s.value}
                  active={_filters.status === s.value}
                  onClick={() => setFilter('status', _filters.status === s.value ? undefined : s.value)}>
                  {s.label}
                </FilterBtn>
              ))}
            </FilterSection>

            <FilterSection label={t('directory.filter.season')}>
              {SEASONS.map((s) => (
                <FilterBtn
                  key={s.value}
                  active={_filters.season === s.value}
                  onClick={() => setFilter('season', _filters.season === s.value ? undefined : s.value)}>
                  {s.label}
                </FilterBtn>
              ))}
            </FilterSection>

            <FilterSection label={t('directory.filter.year')}>
              <select
                value={_filters.year || ''}
                onChange={(e) => setFilter('year', e.target.value || undefined)}
                className="bg-surface text-text-primary text-[11px] px-2 py-1 rounded-lg border border-white/10">
                <option value="">{t('directory.filter.anyYear')}</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </FilterSection>

            <FilterSection label={t('directory.filter.language')}>
              <FilterBtn
                active={spanishOnly}
                onClick={() => {
                  setSpanishOnly(!spanishOnly)
                  setPage(1)
                }}>
                {t('directory.filter.spanish')}
              </FilterBtn>
            </FilterSection>

            <FilterSection label={t('directory.filter.letter')}>
              <div className="flex flex-wrap gap-1">
                {LETTERS.map((l) => (
                  <FilterBtn
                    key={l}
                    active={_filters.letter === l}
                    onClick={() => {
                      setFilter('letter', _filters.letter === l ? undefined : l)
                      setSearchText('')
                    }}>
                    {l}
                  </FilterBtn>
                ))}
              </div>
            </FilterSection>

            <FilterSection label={t('directory.filter.sort')}>
              {SORTS.map((s) => (
                <FilterBtn key={s.value} active={(_filters.sort || 'TRENDING_DESC') === s.value} onClick={() => setFilter('sort', s.value)}>
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

        {total > 0 && (
          <p className="text-xs text-text-secondary mb-4">
            {t('directory.filter.results', { count: spanishOnly ? displayList.length : total })}
            {spanishOnly && displayList.length !== total && ` ${t('directory.filter.filtered', { total })}`}
          </p>
        )}

        {loading ? (
          <GridSkeleton count={12} />
        ) : displayList.length === 0 ? (
          <EmptyState message={t('directory.filter.noResults')} action={{ label: t('directory.filter.clear'), onClick: clearFilters }} />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {displayList.map((anime, i) => (
                <AnimeCard key={anime.id} anime={anime} index={i} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-surface text-text-secondary text-xs font-medium disabled:opacity-30 hover:bg-surface-hover transition-colors">
                  {t('common.previous')}
                </button>
                <span className="text-xs text-text-secondary px-3">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-surface text-text-secondary text-xs font-medium disabled:opacity-30 hover:bg-surface-hover transition-colors">
                  {t('common.next')}
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </>
  )
}
