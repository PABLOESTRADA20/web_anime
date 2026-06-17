import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import AnimeCard from '../components/AnimeCard'
import { GridSkeleton } from '../components/Skeletons'
import { searchAnime } from '../lib/api'

const GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mecha', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller']
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
    const ac = new AbortController()
    setLoading(true)
    setPage(1)
    setHasSearched(true)
    searchAnime(query, 1, filters, ac.signal).then((res) => {
      setResults(res?.data || [])
      setHasNext(res?.hasNextPage || false)
      setLoading(false)
    }).catch((e) => {
      if (e.name !== 'AbortError') setLoading(false)
    })
    return () => ac.abort()
  }, [query, filters])

  async function loadMore() {
    const next = page + 1
    setLoading(true)
    const res = await searchAnime(query, next, filters)
    setResults((prev) => [...prev, ...(res?.data || [])])
    setHasNext(res?.hasNextPage || false)
    setPage(next)
    setLoading(false)
  }

  const filterCount = [filters.genre, filters.format, filters.year, filters.minScore].filter(Boolean).length

  if (!hasSearched) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Explorar anime</h1>
          <p className="text-text-secondary text-sm">Selecciona un género o usa los filtros para descubrir anime</p>
        </div>

        <div className="mb-8">
          <p className="text-xs text-text-secondary mb-3 uppercase tracking-wider font-medium">Explorar por género</p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/search?q=popular"
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              🌟 Más populares
            </Link>
            <Link
              to="/search?q=trending"
              className="px-4 py-2 rounded-xl bg-accent/20 text-accent text-sm font-medium hover:bg-accent/30 transition-colors"
            >
              🔥 En tendencia
            </Link>
            {GENRES.map((g) => (
              <Link
                key={g}
                to={`/search?q=${g.toLowerCase()}`}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary text-sm font-medium transition-colors"
              >
                {g}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-text-secondary mb-3 uppercase tracking-wider font-medium">Filtrar</p>
          <button
            onClick={() => { setShowFilters(true); setHasSearched(true) }}
            className="px-4 py-2 bg-surface hover:bg-surface-hover text-text-secondary rounded-xl text-sm font-medium transition-colors border border-white/10"
          >
            Abrir filtros
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">
          {query ? (
            <>Resultados para: <span className="text-primary">"{query}"</span></>
          ) : (
            <>Explorar {filterCount > 0 ? `(${filterCount} filtros)` : ''}</>
          )}
        </h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            hasAny ? 'bg-primary text-white border-primary' : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary'
          }`}
        >
          Filtros {hasAny ? `(${filterCount})` : ''}
        </button>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 p-4 bg-surface rounded-2xl space-y-4 overflow-hidden"
        >
          <div>
            <p className="text-xs text-text-secondary mb-2">Género</p>
            <div className="flex flex-wrap gap-1.5">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setFilter('genre', filters.genre === g ? undefined : g)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    filters.genre === g ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-text-secondary mb-2">Formato</p>
            <div className="flex flex-wrap gap-1.5">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter('format', filters.format === f ? undefined : f)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    filters.format === f ? 'bg-primary text-white' : 'bg-surface-hover text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-xs text-text-secondary mb-1.5">Año</p>
              <select
                value={filters.year ?? ''}
                onChange={(e) => setFilter('year', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="bg-surface-hover text-text-primary text-xs px-3 py-1.5 rounded-lg border border-white/10"
              >
                <option value="">Todos</option>
                {Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1.5">Puntaje mínimo</p>
              <select
                value={filters.minScore ?? ''}
                onChange={(e) => setFilter('minScore', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="bg-surface-hover text-text-primary text-xs px-3 py-1.5 rounded-lg border border-white/10"
              >
                <option value="">Cualquiera</option>
                {[1,2,3,4,5,6,7,8,9,10].map((s) => (
                  <option key={s} value={s}>{s}&#9733;+</option>
                ))}
              </select>
            </div>
          </div>

          {hasAny && (
            <button
              onClick={clearFilters}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </motion.div>
      )}

      {loading && results.length === 0 ? (
        <GridSkeleton count={12} />
      ) : results.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary">No se encontraron resultados.</p>
          <button
            onClick={clearFilters}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs text-text-secondary mb-4">{results.length} resultado{results.length !== 1 ? 's' : ''}</p>
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
                className="px-6 py-2.5 bg-surface hover:bg-surface-hover text-text-primary
                           rounded-xl font-medium text-sm transition-colors border border-white/10
                           disabled:opacity-50"
              >
                {loading ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
