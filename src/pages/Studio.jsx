import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getStudioInfo } from '../lib/anilist'
import AnimeCard from '../components/AnimeCard'
import { GridSkeleton } from '../components/Skeletons'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'

export default function Studio() {
  const { id } = useParams()
  const [studio, setStudio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [allMedia, setAllMedia] = useState([])
  const [hasNext, setHasNext] = useState(false)

  useEffect(() => {
    setLoading(true)
    getStudioInfo(id, page).then((data) => {
      setStudio(data)
      setAllMedia(page === 1 ? data.media.nodes : prev => [...prev, ...data.media.nodes])
      setHasNext(data.media.pageInfo.hasNextPage)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id, page])

  if (loading && !studio) return <div className="pt-10"><GridSkeleton count={12} /></div>
  if (!studio) return <EmptyState message="Estudio no encontrado" />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <SeoHead title={studio.name} />
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-2xl font-bold">{studio.name}</h1>
          {studio.favourites > 0 && (
            <span className="text-xs text-text-secondary font-mono">{studio.favourites} favoritos</span>
          )}
        </div>
        {studio.isAnimationStudio && (
          <span className="text-[10px] text-primary font-mono uppercase tracking-wider">Estudio de animación</span>
        )}
        <p className="text-xs text-text-secondary mt-2">{allMedia.length} anime{allMedia.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {allMedia.map((m, i) => (
          <AnimeCard key={m.id} anime={{ ...m, anilistId: m.id }} index={i} />
        ))}
      </div>

      {hasNext && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={loading}
            className="px-6 py-2.5 bg-surface hover:bg-surface-hover hover:text-neon-cyan rounded-xl font-medium text-sm transition-colors border border-white/10 disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Cargar más'}
          </button>
        </div>
      )}

      <div className="mt-8">
        <Link to="/directorio" className="text-sm text-text-secondary hover:text-text-primary transition-colors">← Volver al directorio</Link>
      </div>
    </motion.div>
  )
}
