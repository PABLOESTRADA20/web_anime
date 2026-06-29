import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { searchNovels } from '../lib/novels'
import { GridSkeleton } from '../components/Skeletons'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'
import SafeImage from '../components/SafeImage'

function sourceBadge(source) {
  const colors = {
    novelbin: 'bg-red-500/20 text-red-400',
    readnovelfull: 'bg-blue-500/20 text-blue-400',
    novelbuddy: 'bg-purple-500/20 text-purple-400',
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors[source] || 'bg-gray-500/20 text-gray-400'}`}>
      {source === 'novelbin' ? 'NB' : source === 'readnovelfull' ? 'RNF' : source === 'novelbuddy' ? 'NBD' : source || '??'}
    </span>
  )
}

function NovelCard({ novel, index = 0 }) {
  const isNovelBin = !novel._source || novel._source === 'novelbin'
  const coverUrl = isNovelBin ? `https://images.novelbin.com/novel_200_89/${novel.slug}.jpg` : novel.cover || null

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
      <Link
        to={`/novel/${novel.slug}${novel._source ? `?source=${novel._source}` : ''}`}
        className="group relative rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all duration-300 border border-transparent hover:border-neon-cyan/30 block">
        <div className="aspect-[3/4] overflow-hidden">
          <SafeImage
            src={coverUrl}
            alt={novel.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            fallbackText={novel.title}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-1 mb-1">{sourceBadge(novel._source)}</div>
          <h3 className="text-sm font-heading font-medium text-white line-clamp-2 leading-tight">{novel.title}</h3>
        </div>
      </Link>
    </motion.div>
  )
}

export default function Novels() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    if (query) {
      searchNovels(query)
        .then((res) => {
          if (!ac.signal.aborted) setList(res || [])
        })
        .catch((err) => {
          if (!ac.signal.aborted) setError(err.message)
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false)
        })
    } else {
      setLoading(false)
    }
    return () => ac.abort()
  }, [query])

  return (
    <>
      <SeoHead title={query ? `"${query}" — Novelas` : 'Novelas'} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-bold mb-6">
          {query ? (
            <>
              Novelas: <span className="text-primary">&quot;{query}&quot;</span>
            </>
          ) : (
            'Novelas'
          )}
        </h1>
        {loading ? (
          <GridSkeleton count={12} />
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-2">No se pudo conectar con el proveedor de novelas.</p>
            <p className="text-sm text-text-muted mb-4">
              {error.includes('caído') ? 'NovelBin está temporalmente caído. Intenta de nuevo más tarde.' : error}
            </p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-white rounded-xl text-sm">
              Reintentar
            </button>
          </div>
        ) : list.length === 0 && query ? (
          <EmptyState message="No se encontraron novelas." />
        ) : list.length === 0 && !query ? (
          <EmptyState message="Busca novelas usando el buscador arriba." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {list.map((n, i) => (
              <NovelCard key={`${n._source || 'novelbin'}-${n.slug}`} novel={n} index={i} />
            ))}
          </div>
        )}
      </motion.div>
    </>
  )
}
