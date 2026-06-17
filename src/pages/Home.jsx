import { useState, useEffect, useMemo } from 'react'
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

  const recentHistory = useMemo(() => history.slice(0, 8), [history])

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
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-lg font-heading font-bold">Continuar viendo</h2>
                </div>
                <Link to="/search" className="text-xs text-neon-cyan hover:text-primary transition-colors">Ver más</Link>
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
                      <Link to={`/anime/${item.anilist_id}`} className="text-sm font-medium truncate group-hover:text-neon-cyan transition-colors block">
                        {item.title}
                      </Link>
                      <Link
                        to={`/watch?anilistId=${item.anilist_id}&ep=${item.episode_number}&title=${encodeURIComponent(item.title || '')}&image=${encodeURIComponent(item.image || '')}`}
                        className="text-xs text-text-secondary hover:text-neon-cyan transition-colors"
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
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h2 className="text-lg font-heading font-bold">Continuar leyendo</h2>
                </div>
                <Link to="/manga" className="text-xs text-neon-cyan hover:text-primary transition-colors">Ver todos</Link>
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
                      <Link to={`/manga/${item.anilist_id}`} className="text-sm font-medium truncate group-hover:text-neon-cyan transition-colors block">
                        {item.title}
                      </Link>
                      <Link
                        to={`/manga/${item.anilist_id}/read?chapterId=${item.chapter_id}&chapter=${item.chapter_number}&title=${encodeURIComponent(item.title || '')}&image=${encodeURIComponent(item.image || '')}`}
                        className="text-xs text-text-secondary hover:text-neon-cyan transition-colors"
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
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 23c-1.5 0-3.1-.8-4.2-2.1-1.9-2.3-1.5-5.7.9-7.5.1-.1.3.1.2.2-1.3 2.1-.5 5 1.7 6.2.2.1.3-.1.2-.3-1.3-2.2-.6-4.7 1.2-6 .1-.1.3 0 .2.2-1 2.2-.4 5.1 1.5 6.4.2.1.3-.1.2-.3-1.1-2.1-.6-4.5.8-6.1.1-.1.3 0 .2.2-1.1 2.3-.5 4.9 1.2 6.4 1.4 1.2 2.2 2.9 2.2 4.7 0 3.9-3.4 6.9-7.4 6.5-.4 0-.8-.1-1.1-.2 1-1.5 1.7-3.2 1.8-5.1 0-.2-.2-.3-.3-.2-1.2 1.6-3 2.7-5 2.7-1.8 0-3.5-.8-4.7-2.1-1.4-1.5-2.1-3.5-2.1-5.5 0-4.9 3.9-8.7 7.2-11.1.3-.2.7 0 .7.4v.4c0 1.6.5 3.1 1.4 4.4.2.3.6.2.6-.1-.1-2 .2-4.1 1.3-6 .3-.5.8-.9 1.3-1.2.3-.2.7 0 .7.3 0 1.1.4 2.1 1 3 .1.1.2.2.3.3 1.1-1.3 2.3-2.6 3.7-3.7.3-.2.7 0 .6.4-.2 1.5.1 2.9.7 4.2.8 1.7 2.1 3.1 3.6 4.2 1.3 1 2.1 2.5 2.1 4.2 0 3.5-2.8 6.5-6.3 6.7z"/>
            </svg>
            <h2 className="text-xl font-heading font-bold">En tendencia</h2>
          </div>
          <Link to="/search" className="text-xs text-neon-cyan hover:text-primary transition-colors">Ver más</Link>
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
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-neon-cyan" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <h2 className="text-xl font-heading font-bold">Más populares</h2>
          </div>
          <Link to="/search" className="text-xs text-neon-cyan hover:text-primary transition-colors">Ver más</Link>
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
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl font-heading font-bold">Emitiendo ahora</h2>
          </div>
          <Link to="/schedule" className="text-xs text-neon-cyan hover:text-primary transition-colors">Ver horario</Link>
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
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h2 className="text-xl font-heading font-bold">Últimos capítulos</h2>
          </div>
          <Link to="/manga" className="text-xs text-neon-cyan hover:text-primary transition-colors">Ver todos</Link>
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
                  className="group relative rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all duration-300 border border-transparent hover:border-neon-cyan/30 block"
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
                    <span className="absolute top-2 left-2 bg-primary/20 text-primary text-xs font-mono font-medium px-2 py-1 rounded-lg tracking-wider">
                      {ch.format}
                    </span>
                  )}

                  <span className="absolute top-2 right-2 bg-neon-cyan/20 text-neon-cyan font-mono text-xs font-bold px-2 py-1 rounded-lg" style={{boxShadow: '0 0 8px rgba(0,240,255,0.3)'}}>
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
