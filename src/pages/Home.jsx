import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Hero from '../components/Hero'
import AnimeCard from '../components/AnimeCard'
import { GridSkeleton } from '../components/Skeletons'
import { getTopAnime } from '../lib/api'
import { getRecentChapters } from '../lib/manga'
import { useAuth } from '../hooks/useAuth'
import { useHistory } from '../hooks/useHistory'
import { useMangaHistory } from '../hooks/useMangaHistory'

export default function Home() {
  const { user } = useAuth()
  const { history } = useHistory()
  const { mangaHistory } = useMangaHistory()
  const [trending, setTrending] = useState([])
  const [popular, setPopular] = useState([])
  const [airing, setAiring] = useState([])
  const [loading, setLoading] = useState(true)
  const [recentChapters, setRecentChapters] = useState([])
  const [recentLoading, setRecentLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getTopAnime('trending'),
      getTopAnime('popular'),
      getTopAnime('airing'),
    ]).then(([trendRes, popRes, airRes]) => {
      setTrending(trendRes?.data || [])
      setPopular(popRes?.data || [])
      setAiring(airRes?.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    getRecentChapters(12)
      .then((data) => {
        setRecentChapters(data || [])
        setRecentLoading(false)
      })
      .catch(() => setRecentLoading(false))
  }, [])

  const recentHistory = history.slice(0, 8)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Hero />

      {user && (recentHistory.length > 0 || mangaHistory.length > 0) && (
        <section className="mb-10 space-y-6">
          {recentHistory.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">⏳ Continuar viendo</h2>
                <Link to="/search" className="text-xs text-primary hover:underline">Ver más</Link>
              </div>
              <div className="space-y-2">
                {recentHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface hover:bg-surface-hover transition-colors group"
                  >
                    <Link to={`/anime/${item.anilist_id}`} className="shrink-0">
                      <div className="w-20 aspect-video rounded-lg overflow-hidden bg-surface-hover">
                        {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/anime/${item.anilist_id}`} className="text-sm font-medium truncate group-hover:text-primary transition-colors block">
                        {item.title}
                      </Link>
                      <Link
                        to={`/watch?anilistId=${item.anilist_id}&ep=${item.episode_number}&title=${encodeURIComponent(item.title || '')}&image=${encodeURIComponent(item.image || '')}`}
                        className="text-xs text-text-secondary hover:text-primary transition-colors"
                      >
                        Episodio {item.episode_number} → Seguir viendo
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mangaHistory.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">📖 Continuar leyendo</h2>
                <Link to="/manga" className="text-xs text-primary hover:underline">Ver todos</Link>
              </div>
              <div className="space-y-2">
                {mangaHistory.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface hover:bg-surface-hover transition-colors group"
                  >
                    <Link
                      to={`/manga/${item.anilist_id}`}
                      className="shrink-0"
                    >
                      <div className="w-14 h-20 rounded-lg overflow-hidden bg-surface-hover">
                        {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/manga/${item.anilist_id}`} className="text-sm font-medium truncate group-hover:text-primary transition-colors block">
                        {item.title}
                      </Link>
                      <Link
                        to={`/manga/${item.anilist_id}/read?chapterId=${item.chapter_id}&chapter=${item.chapter_number}&title=${encodeURIComponent(item.title || '')}&image=${encodeURIComponent(item.image || '')}`}
                        className="text-xs text-text-secondary hover:text-primary transition-colors"
                      >
                        Capítulo {item.chapter_number} → Seguir leyendo
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">🔥 En tendencia</h2>
          <Link to="/search" className="text-xs text-primary hover:underline">Ver más</Link>
        </div>
        {loading ? <GridSkeleton count={6} /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {trending.slice(0, 12).map((a, i) => (
              <AnimeCard key={a.anilistId} anime={a} index={i} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">⭐ Más populares</h2>
          <Link to="/search" className="text-xs text-primary hover:underline">Ver más</Link>
        </div>
        {loading ? <GridSkeleton count={6} /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {popular.slice(0, 12).map((a, i) => (
              <AnimeCard key={a.anilistId} anime={a} index={i} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">📺 Emitiendo ahora</h2>
          <Link to="/schedule" className="text-xs text-primary hover:underline">Ver horario</Link>
        </div>
        {loading ? <GridSkeleton count={6} /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {airing.slice(0, 12).map((a, i) => (
              <AnimeCard key={a.anilistId} anime={a} index={i} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">🆕 Últimos capítulos</h2>
          <Link to="/manga" className="text-xs text-primary hover:underline">Ver todos</Link>
        </div>
        {recentLoading ? <GridSkeleton count={6} /> : recentChapters.length === 0 ? null : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recentChapters.map((ch, i) => (
              <motion.div
                key={`${ch.mangaId}-${ch.chapterNumber}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link
                  to={`/manga/${ch.anilistId}`}
                  className="group relative rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 block"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    {ch.coverUrl ? (
                      <img
                        src={ch.coverUrl}
                        alt={ch.mangaTitle}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-hover flex items-center justify-center text-text-secondary text-xs">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {ch.format && (
                    <span className="absolute top-2 left-2 bg-accent/80 text-white text-xs font-medium px-2 py-1 rounded-lg">
                      {ch.format}
                    </span>
                  )}

                  <span className="absolute top-2 right-2 bg-primary/90 text-white text-xs font-bold px-2 py-1 rounded-lg">
                    Cap. {ch.chapterNumber}
                  </span>

                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-sm font-medium text-white line-clamp-2 leading-tight">
                      {ch.mangaTitle}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </motion.div>
  )
}
