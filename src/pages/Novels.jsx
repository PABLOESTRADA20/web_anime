import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { searchNovels } from '../lib/novels'
import { GridSkeleton } from '../components/Skeletons'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'
import SafeImage from '../components/SafeImage'

function NovelCard({ novel, index = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
      <Link
        to={`/novel/${novel.slug}`}
        className="group relative rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all duration-300 border border-transparent hover:border-neon-cyan/30 block">
        <div className="aspect-[3/4] overflow-hidden">
          <SafeImage
            src={`https://images.novelbin.com/novel_200_89/${novel.slug}.jpg`}
            alt={novel.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            fallbackText={novel.title}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
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

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    if (query) {
      searchNovels(query)
        .then((res) => {
          if (!ac.signal.aborted) setList(res || [])
        })
        .catch(() => {
          /* empty */
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
        ) : list.length === 0 && query ? (
          <EmptyState message="No se encontraron novelas." />
        ) : list.length === 0 && !query ? (
          <EmptyState message="Busca novelas usando el buscador arriba." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {list.map((n, i) => (
              <NovelCard key={n.slug} novel={n} index={i} />
            ))}
          </div>
        )}
      </motion.div>
    </>
  )
}
