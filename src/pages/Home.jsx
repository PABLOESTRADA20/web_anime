import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Hero from '../components/Hero'
import AnimeCard from '../components/AnimeCard'
import { GridSkeleton } from '../components/Skeletons'
import { FadeIn, FadeInStagger } from '../components/FadeIn'
import GradientHeading from '../components/GradientHeading'
import SeoHead from '../components/SeoHead'
import { getTopAnime, enrichAnimeBatch } from '../lib/api'
import { getRecentChapters } from '../lib/manga'
import { useAuth } from '../hooks/useAuth'
import { useHistory } from '../hooks/useHistory'
import { useMangaHistory } from '../hooks/useMangaHistory'
import { useToast } from '../components/Toast'
import SafeImage from '../components/SafeImage'
import { getRecommendations, getUserGenreProfile, getUserInteractionIds } from '../lib/recommendations'

function SectionHeader({ icon, title, link, linkText }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">{icon}</div>
        <GradientHeading variant="pink" size="sm">
          {title}
        </GradientHeading>
      </div>
      <Link to={link} className="text-xs text-neon-cyan hover:text-primary transition-colors font-medium">
        {linkText}
      </Link>
    </div>
  )
}

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
  const [recommendations, setRecommendations] = useState([])
  const [recsLoading, setRecsLoading] = useState(false)
  const toast = useToast()
  const acRef = useRef(null)

  useEffect(() => {
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac

    const signal = ac.signal
    Promise.all([getTopAnime('trending'), getTopAnime('popular'), getTopAnime('airing')])
      .then(([trendRes, popRes, airRes]) => {
        if (signal.aborted) return
        const t = trendRes?.data || []
        const p = popRes?.data || []
        const a = airRes?.data || []
        setTrending(t)
        setPopular(p)
        setAiring(a)
        setLoading(false)
        Promise.all([enrichAnimeBatch(t), enrichAnimeBatch(p), enrichAnimeBatch(a)])
          .then(([te, pe, ae]) => {
            if (!signal.aborted) {
              setTrending(te)
              setPopular(pe)
              setAiring(ae)
            }
          })
          .catch(() => {})
      })
      .catch(() => {
        if (!signal.aborted) {
          setLoading(false)
          toast('Error al cargar el inicio', 'error')
        }
      })

    return () => ac.abort()
  }, [toast])

  useEffect(() => {
    const ac = new AbortController()
    getRecentChapters(12)
      .then((data) => {
        if (!ac.signal.aborted) {
          setRecentChapters(data || [])
          setRecentLoading(false)
        }
      })
      .catch(() => {
        if (!ac.signal.aborted) setRecentLoading(false)
      })
    return () => ac.abort()
  }, [])

  useEffect(() => {
    if (!user) {
      setRecommendations([])
      return
    }
    const ac = new AbortController()
    setRecsLoading(true)
    ;(async () => {
      try {
        const genres = await getUserGenreProfile(user.id)
        if (ac.signal.aborted || genres.length === 0) {
          setRecsLoading(false)
          return
        }
        const interactedIds = await getUserInteractionIds(user.id)
        const result = await getRecommendations(genres)
        if (!ac.signal.aborted) {
          const filtered = (result.data || []).filter((a) => !interactedIds.has(a.id)).slice(0, 12)
          setRecommendations(filtered)
          enrichAnimeBatch(filtered)
            .then((enriched) => {
              if (!ac.signal.aborted) setRecommendations(enriched)
            })
            .catch(() => {})
        }
      } catch {
        /* ignore */
      }
      setRecsLoading(false)
    })()
    return () => ac.abort()
  }, [user])

  const recentHistory = useMemo(() => history.slice(0, 8), [history])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <SeoHead />
      <Hero />

      {user && (recentHistory.length > 0 || mangaHistory.length > 0) && (
        <section className="mb-12 space-y-8">
          {recentHistory.length > 0 && (
            <FadeIn>
              <div>
                <SectionHeader
                  icon={
                    <svg className="w-4 h-4 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  title="Continuar viendo"
                  link="/search"
                  linkText="Ver más"
                />
                <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
                  {recentHistory.map((item) => (
                    <Link
                      key={item.id}
                      to={`/watch?anilistId=${item.anilist_id}&ep=${item.episode_number}&title=${encodeURIComponent(item.title || '')}&image=${encodeURIComponent(item.image || '')}`}
                      className="snap-start shrink-0 w-40 group relative rounded-2xl overflow-hidden bg-surface card-hover block">
                      <div className="aspect-[3/4] overflow-hidden relative">
                        {item.image ? (
                          <SafeImage
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            fallbackText={item.title}
                          />
                        ) : (
                          <div className="w-full h-full bg-surface-hover flex items-center justify-center text-text-secondary/40 text-xs p-4 text-center">
                            {item.title}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                      </div>
                      <span className="absolute top-2 right-2 bg-primary/90 backdrop-blur-sm text-white text-[10px] font-mono font-semibold px-2 py-1 rounded-lg border border-primary/40">
                        Ep. {item.episode_number}
                      </span>
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="text-xs font-heading font-semibold text-white line-clamp-2 leading-tight drop-shadow-lg">
                          {item.title}
                        </h3>
                      </div>

                      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/0 group-hover:ring-primary/30 transition-all duration-300" />
                    </Link>
                  ))}
                </div>
              </div>
            </FadeIn>
          )}

          {mangaHistory.length > 0 && (
            <FadeIn>
              <div>
                <SectionHeader
                  icon={
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  }
                  title="Continuar leyendo"
                  link="/manga"
                  linkText="Ver todos"
                />
                <div className="space-y-2">
                  {mangaHistory.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 rounded-xl bg-surface hover:bg-surface-hover transition-all duration-300 group border border-transparent hover:border-primary/20 card-hover">
                      <Link to={`/manga/${item.anilist_id}`} className="shrink-0">
                        <div className="w-14 h-20 rounded-lg overflow-hidden bg-surface-hover ring-1 ring-white/10 group-hover:ring-primary/30 transition-all">
                          <SafeImage src={item.image} alt="" className="w-full h-full object-cover" />
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/manga/${item.anilist_id}`}
                          className="text-sm font-medium truncate group-hover:text-neon-cyan transition-colors block">
                          {item.title}
                        </Link>
                        <Link
                          to={`/manga/${item.anilist_id}/read?chapterId=${item.chapter_id}&chapter=${item.chapter_number}&title=${encodeURIComponent(item.title || '')}&image=${encodeURIComponent(item.image || '')}`}
                          className="inline-flex items-center gap-1 mt-1 text-xs text-text-secondary hover:text-neon-cyan transition-colors">
                          Capítulo {item.chapter_number}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          )}
        </section>
      )}

      {user && (recommendations.length > 0 || recsLoading) && (
        <section className="mb-12">
          <FadeIn>
            <SectionHeader
              icon={
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              title="Recomendado para ti"
              link="/search"
              linkText="Ver más"
            />
          </FadeIn>
          {recsLoading ? (
            <GridSkeleton count={6} />
          ) : (
            <FadeInStagger>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {recommendations.map((a, i) => (
                  <FadeIn key={a.anilistId || a.id}>
                    <AnimeCard anime={a} index={i} />
                  </FadeIn>
                ))}
              </div>
            </FadeInStagger>
          )}
        </section>
      )}

      <section className="mb-12">
        <FadeIn>
          <SectionHeader
            icon={
              <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 23c-1.5 0-3.1-.8-4.2-2.1-1.9-2.3-1.5-5.7.9-7.5.1-.1.3.1.2.2-1.3 2.1-.5 5 1.7 6.2.2.1.3-.1.2-.3-1.3-2.2-.6-4.7 1.2-6 .1-.1.3 0 .2.2-1 2.2-.4 5.1 1.5 6.4.2.1.3-.1.2-.3-1.1-2.1-.6-4.5.8-6.1.1-.1.3 0 .2.2-1.1 2.3-.5 4.9 1.2 6.4 1.4 1.2 2.2 2.9 2.2 4.7 0 3.9-3.4 6.9-7.4 6.5-.4 0-.8-.1-1.1-.2 1-1.5 1.7-3.2 1.8-5.1 0-.2-.2-.3-.3-.2-1.2 1.6-3 2.7-5 2.7-1.8 0-3.5-.8-4.7-2.1-1.4-1.5-2.1-3.5-2.1-5.5 0-4.9 3.9-8.7 7.2-11.1.3-.2.7 0 .7.4v.4c0 1.6.5 3.1 1.4 4.4.2.3.6.2.6-.1-.1-2 .2-4.1 1.3-6 .3-.5.8-.9 1.3-1.2.3-.2.7 0 .7.3 0 1.1.4 2.1 1 3 .1.1.2.2.3.3 1.1-1.3 2.3-2.6 3.7-3.7.3-.2.7 0 .6.4-.2 1.5.1 2.9.7 4.2.8 1.7 2.1 3.1 3.6 4.2 1.3 1 2.1 2.5 2.1 4.2 0 3.5-2.8 6.5-6.3 6.7z" />
              </svg>
            }
            title="En tendencia"
            link="/search"
            linkText="Ver más"
          />
        </FadeIn>
        {loading ? (
          <GridSkeleton count={6} />
        ) : (
          <FadeInStagger>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {trending.slice(0, 12).map((a, i) => (
                <FadeIn key={a.anilistId}>
                  <AnimeCard anime={a} index={i} />
                </FadeIn>
              ))}
            </div>
          </FadeInStagger>
        )}
      </section>

      <section className="mb-12">
        <FadeIn>
          <SectionHeader
            icon={
              <svg className="w-4 h-4 text-neon-cyan" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            }
            title="Más populares"
            link="/search"
            linkText="Ver más"
          />
        </FadeIn>
        {loading ? (
          <GridSkeleton count={6} />
        ) : (
          <FadeInStagger>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {popular.slice(0, 12).map((a, i) => (
                <FadeIn key={a.anilistId}>
                  <AnimeCard anime={a} index={i} />
                </FadeIn>
              ))}
            </div>
          </FadeInStagger>
        )}
      </section>

      <section className="mb-12">
        <FadeIn>
          <SectionHeader
            icon={
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            }
            title="Emitiendo ahora"
            link="/schedule"
            linkText="Ver horario"
          />
        </FadeIn>
        {loading ? (
          <GridSkeleton count={6} />
        ) : (
          <FadeInStagger>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {airing.slice(0, 12).map((a, i) => (
                <FadeIn key={a.anilistId}>
                  <AnimeCard anime={a} index={i} />
                </FadeIn>
              ))}
            </div>
          </FadeInStagger>
        )}
      </section>

      <section className="mb-12">
        <FadeIn>
          <SectionHeader
            icon={
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            }
            title="Últimos capítulos"
            link="/manga"
            linkText="Ver todos"
          />
        </FadeIn>
        {recentLoading ? (
          <GridSkeleton count={6} />
        ) : recentChapters.length === 0 ? null : (
          <FadeInStagger>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {recentChapters.map((ch) => (
                <FadeIn key={`${ch.mangaId}-${ch.chapterNumber}`}>
                  <Link to={`/manga/${ch.anilistId}`} className="group relative rounded-2xl overflow-hidden bg-surface card-hover block">
                    <div className="aspect-[3/4] overflow-hidden">
                      {ch.coverUrl ? (
                        <SafeImage
                          src={ch.coverUrl}
                          alt={ch.mangaTitle}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          fallbackText={ch.mangaTitle}
                        />
                      ) : (
                        <div className="w-full h-full bg-surface-hover flex items-center justify-center text-text-secondary text-xs">
                          Sin imagen
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    {ch.format && (
                      <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-primary text-[10px] font-mono font-semibold px-2 py-1 rounded-lg border border-primary/20 tracking-wider uppercase">
                        {ch.format}
                      </span>
                    )}
                    <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-neon-cyan font-mono text-xs font-bold px-2 py-1 rounded-lg border border-neon-cyan/20 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      Cap. {ch.chapterNumber}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-sm font-heading font-semibold text-white line-clamp-2 leading-tight drop-shadow-lg">
                        {ch.mangaTitle}
                      </h3>
                    </div>
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/0 group-hover:ring-primary/30 transition-all duration-300" />
                  </Link>
                </FadeIn>
              ))}
            </div>
          </FadeInStagger>
        )}
      </section>
    </motion.div>
  )
}
