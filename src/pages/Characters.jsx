import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { searchCharacter } from '../lib/anilist'
import { GridSkeleton } from '../components/Skeletons'

export default function Characters() {
  const [searchParams] = useSearchParams()
  const queryFromUrl = searchParams.get('q') || ''
  const [query, setQuery] = useState(queryFromUrl)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e) {
    e?.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    setPage(1)
    try {
      const res = await searchCharacter(query)
      setResults(res.data || [])
      setHasNext(res.hasNextPage || false)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function loadMore() {
    const next = page + 1
    setLoading(true)
    try {
      const res = await searchCharacter(query, next)
      setResults((prev) => [...prev, ...(res.data || [])])
      setHasNext(res.hasNextPage || false)
      setPage(next)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <h1 className="text-xl font-bold mb-6">🔍 Personajes</h1>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar personaje..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-surface border border-white/10 text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-neon-cyan/70 transition-colors"
          />
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium text-sm transition-colors"
          >
            Buscar
          </button>
        </div>
      </form>

      {loading && results.length === 0 ? (
        <GridSkeleton count={12} />
      ) : !searched ? (
        <p className="text-text-secondary text-sm">Busca un personaje por nombre.</p>
      ) : results.length === 0 ? (
        <p className="text-text-secondary">No se encontraron personajes.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map((char, i) => {
              const name = char.name?.full || 'Sin nombre'
              return (
                <motion.div
                  key={char.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Link
                    to={`/character/${char.id}`}
                    className="group rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all block"
                  >
                    <div className="aspect-[3/4] overflow-hidden">
                      <img src={char.image?.large} alt={name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="p-2 text-center">
                      <p className="text-xs font-medium truncate">{name}</p>
                      {char.favourites > 0 && (
                        <p className="text-[10px] text-primary mt-0.5">★ {char.favourites}</p>
                      )}
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
          {hasNext && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2.5 bg-surface hover:bg-surface-hover text-text-primary rounded-xl font-medium text-sm transition-colors border border-white/10 disabled:opacity-50"
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
