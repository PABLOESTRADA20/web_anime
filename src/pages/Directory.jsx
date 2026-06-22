import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { getDirectory } from '../lib/anilist'
import AnimeCard from '../components/AnimeCard'
import { GridSkeleton } from '../components/Skeletons'
import SeoHead from '../components/SeoHead'

const GENRES = [
  'Accion', 'Aventura', 'Autos', 'Comedia', 'Dementia', 'Demonios', 'Misterio', 'Drama',
  'Ecchi', 'Fantasia', 'Juegos', 'Hentai', 'Historico', 'Terror', 'Infantil', 'Magia',
  'Artes Marciales', 'Mecha', 'Musica', 'Parodia', 'Samurai', 'Romance', 'Ciencia Ficcion',
  'Shoujo', 'Shoujo Ai', 'Shounen', 'Shounen Ai', 'Espacial', 'Deportes', 'Super Poderes',
  'Vampiros', 'Yaoi', 'Yuri', 'Harem', 'Recuentos de la vida', 'Sobrenatural', 'Militar',
  'Policial', 'Psicologico', 'Thriller', 'Seinen', 'Josei',
]

const FORMATS = [
  { value: 'TV', label: 'Serie' },
  { value: 'MOVIE', label: 'Pelicula' },
  { value: 'OVA', label: 'OVA' },
  { value: 'ONA', label: 'ONA' },
  { value: 'SPECIAL', label: 'Especial' },
  { value: 'TV_SHORT', label: 'Cortometraje' },
]

const STATUSES = [
  { value: 'RELEASING', label: 'En emision' },
  { value: 'FINISHED', label: 'Finalizado' },
  { value: 'NOT_YET_RELEASED', label: 'Por estrenar' },
  { value: 'CANCELLED', label: 'Cancelado' },
  { value: 'HIATUS', label: 'En pausa' },
]

const SEASONS = [
  { value: 'WINTER', label: 'Invierno' },
  { value: 'SPRING', label: 'Primavera' },
  { value: 'SUMMER', label: 'Verano' },
  { value: 'FALL', label: 'Otono' },
]

const SORTS = [
  { value: 'TRENDING_DESC', label: 'Tendencia' },
  { value: 'POPULARITY_DESC', label: 'Popularidad' },
  { value: 'SCORE_DESC', label: 'Puntuacion' },
  { value: 'START_DATE_DESC', label: 'Fecha de estreno' },
  { value: 'EPISODES_DESC', label: 'Mas episodios' },
  { value: 'TITLE_ROMAJI', label: 'Nombre A-Z' },
]

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => currentYear - i)

const PER_PAGE = 30

function FilterSection({ label, children }) {
  return (
    <div>
      <p className="text-[10px] text-text-secondary/50 uppercase tracking-wider mb-1.5 font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {children}
      </div>
    </div>
  )
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
        active
          ? 'bg-primary text-white'
          : 'bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  )
}

export default function Directory() {
  const filtersState = useState({})
  const [_filters, _setFilters] = filtersState

  const [animeList, setAnimeList] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [showFilters, setShowFilters] = useState(false)

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
    setLoading(true)
    getDirectory(page, PER_PAGE, filters)
      .then((res) => {
        setAnimeList(res.data)
        setTotal(res.total)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [page, filters])

  function setFilter(key, value) {
    _setFilters(prev => ({ ...prev, [key]: value || undefined }))
    setPage(1)
  }

  function clearFilters() {
    _setFilters({})
    setSearchText('')
    setPage(1)
  }

  const hasFilters = Object.keys(filters).length > 0 || Object.keys(_filters).length > 0
  const totalPages = Math.ceil(total / PER_PAGE)

  function randomAnime() {
    const randomPage = Math.floor(Math.random() * Math.max(1, totalPages)) + 1
    getDirectory(randomPage, 1, { sort: ['POPULARITY_DESC'] })
      .then((res) => {
        if (res.data?.[0]?.id) {
          window.open(`/anime/${res.data[0].id}`, '_self')
        }
      })
      .catch(() => {})
  }

  return (
    <>
      <SeoHead title="Directorio de anime" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Directorio</h1>
        <div className="flex gap-2">
          <button
            onClick={randomAnime}
            className="px-3 py-1.5 rounded-lg bg-surface text-text-secondary hover:text-neon-cyan hover:bg-surface-hover text-xs font-medium border border-white/10 transition-colors"
          >
            Aleatorio
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showFilters || hasFilters
                ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30'
                : 'bg-surface text-text-secondary border-white/10 hover:bg-surface-hover'
            }`}
          >
            Filtros {hasFilters ? `(${Object.keys(_filters).length})` : ''}
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
            placeholder="Buscar por nombre..."
            className="flex-1 px-4 py-2 rounded-xl bg-surface border border-white/10 text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-neon-cyan/70 transition-colors"
          />
          <button
            onClick={() => {
              setFilter('search', searchText.trim() || undefined)
              setFilter('letter', undefined)
            }}
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Buscar
          </button>
        </div>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 space-y-4 p-4 rounded-2xl bg-surface/50 border border-white/5"
        >
          <FilterSection label="Genero">
            {GENRES.map((g) => (
              <FilterBtn
                key={g}
                active={_filters.genre === g}
                onClick={() => setFilter('genre', _filters.genre === g ? undefined : g)}
              >
                {g}
              </FilterBtn>
            ))}
          </FilterSection>

          <FilterSection label="Tipo">
            {FORMATS.map((f) => (
              <FilterBtn
                key={f.value}
                active={_filters.format === f.value}
                onClick={() => setFilter('format', _filters.format === f.value ? undefined : f.value)}
              >
                {f.label}
              </FilterBtn>
            ))}
          </FilterSection>

          <FilterSection label="Estado">
            {STATUSES.map((s) => (
              <FilterBtn
                key={s.value}
                active={_filters.status === s.value}
                onClick={() => setFilter('status', _filters.status === s.value ? undefined : s.value)}
              >
                {s.label}
              </FilterBtn>
            ))}
          </FilterSection>

          <FilterSection label="Temporada">
            {SEASONS.map((s) => (
              <FilterBtn
                key={s.value}
                active={_filters.season === s.value}
                onClick={() => setFilter('season', _filters.season === s.value ? undefined : s.value)}
              >
                {s.label}
              </FilterBtn>
            ))}
          </FilterSection>

          <FilterSection label="Ano">
            <select
              value={_filters.year || ''}
              onChange={(e) => setFilter('year', e.target.value || undefined)}
              className="bg-surface text-text-primary text-[11px] px-2 py-1 rounded-lg border border-white/10"
            >
              <option value="">Cualquier ano</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </FilterSection>

          <FilterSection label="Letra">
            <div className="flex flex-wrap gap-1">
              {LETTERS.map((l) => (
                <FilterBtn
                  key={l}
                  active={_filters.letter === l}
                  onClick={() => {
                    setFilter('letter', _filters.letter === l ? undefined : l)
                    setSearchText('')
                  }}
                >
                  {l}
                </FilterBtn>
              ))}
            </div>
          </FilterSection>

          <FilterSection label="Ordenar por">
            {SORTS.map((s) => (
              <FilterBtn
                key={s.value}
                active={(_filters.sort || 'TRENDING_DESC') === s.value}
                onClick={() => setFilter('sort', s.value)}
              >
                {s.label}
              </FilterBtn>
            ))}
          </FilterSection>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </motion.div>
      )}

      {total > 0 && (
        <p className="text-xs text-text-secondary mb-4">
          {total} animes encontrados
        </p>
      )}

      {loading ? (
        <GridSkeleton count={12} />
      ) : animeList.length === 0 ? (
        <div className="text-center py-20 text-text-secondary">
          <p>No se encontraron animes con esos filtros.</p>
          <button
            onClick={clearFilters}
            className="mt-3 text-primary hover:text-neon-cyan text-sm transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {animeList.map((anime, i) => (
              <AnimeCard key={anime.id} anime={anime} index={i} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-surface text-text-secondary text-xs font-medium disabled:opacity-30 hover:bg-surface-hover transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-xs text-text-secondary px-3">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-surface text-text-secondary text-xs font-medium disabled:opacity-30 hover:bg-surface-hover transition-colors"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
    </>
  )
}
