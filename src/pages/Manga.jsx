import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getTopManga, searchManga } from '../lib/anilist'
import { GridSkeleton } from '../components/Skeletons'
import SeoHead from '../components/SeoHead'

function MangaCard({ manga, index = 0 }) {
  const title = manga.title?.romaji || manga.title?.english || 'Sin título'
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link
        to={`/manga/${manga.id}`}
        className="group relative rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all duration-300 border border-transparent hover:border-neon-cyan/30 block"
      >
        <div className="aspect-[3/4] overflow-hidden">
          <img src={manga.coverImage?.large} alt={title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {manga.averageScore && (
          <span className="absolute top-2 right-2 bg-neon-cyan/20 text-neon-cyan font-mono text-xs font-bold px-2 py-1 rounded-lg" style={{boxShadow: '0 0 8px rgba(0,240,255,0.3)'}}>{manga.averageScore}</span>
        )}
        {manga.format && (
          <span className="absolute top-2 left-2 bg-primary/20 text-primary text-xs font-mono font-medium px-2 py-1 rounded-lg tracking-wider">{manga.format}</span>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-heading font-medium text-white line-clamp-2 leading-tight">{title}</h3>
          {manga.chapters && <p className="text-xs text-white/60 mt-1">{manga.chapters} capítulos</p>}
        </div>
      </Link>
    </motion.div>
  )
}

export default function Manga() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [mangaList, setMangaList] = useState([])
  const [category, setCategory] = useState('trending')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)

  const categories = [
    { id: 'trending', label: 'Tendencia' },
    { id: 'popular', label: 'Popular' },
    { id: 'top', label: 'Mejor puntuados' },
    { id: 'releasing', label: 'Publicándose' },
    { id: 'upcoming', label: 'Próximamente' },
  ]

  useEffect(() => {
    setLoading(true)
    setPage(1)
    if (query) {
      searchManga(query).then((res) => {
        setMangaList(res.data || [])
        setHasNext(res.hasNextPage || false)
        setLoading(false)
      }).catch(() => setLoading(false))
    } else {
      getTopManga(category).then((res) => {
        setMangaList(res.data || [])
        setHasNext(res.hasNextPage || false)
        setLoading(false)
      }).catch(() => setLoading(false))
    }
  }, [query, category])

  async function loadMore() {
    const next = page + 1
    setLoading(true)
    try {
      const res = query
        ? await searchManga(query, next)
        : await getTopManga(category, next)
      setMangaList((prev) => [...prev, ...(res.data || [])])
      setHasNext(res.hasNextPage || false)
      setPage(next)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <>
      <SeoHead title={query ? `"${query}" — Manga` : 'Manga'} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {!query && (
        <>
          <h1 className="text-xl font-bold mb-6">📚 Manga</h1>
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  category === cat.id ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </>
      )}

      {query && (
        <h1 className="text-xl font-bold mb-6">Manga: <span className="text-primary">"{query}"</span></h1>
      )}

      {loading && mangaList.length === 0 ? (
        <GridSkeleton count={12} />
      ) : mangaList.length === 0 ? (
        <p className="text-text-secondary">No se encontraron resultados.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {mangaList.map((m, i) => (
              <MangaCard key={m.id} manga={m} index={i} />
            ))}
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
    </>
  )
}
