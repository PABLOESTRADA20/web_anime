import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DetailSkeleton } from '../components/Skeletons'
import AnimeCard from '../components/AnimeCard'
import { FadeIn, FadeInStagger } from '../components/FadeIn'
import GradientHeading from '../components/GradientHeading'
import CommentSection from '../components/CommentSection'
import SeoHead from '../components/SeoHead'
import { getAnimeInfo, getAnimeEpisodes } from '../lib/api'
import { getAnimeCharacters } from '../lib/anilist'
import { useAuth } from '../hooks/useAuth'
import { useWatchlist } from '../hooks/useWatchlist'
import { useAnimeFavorites } from '../hooks/useAnimeFavorites'
import { useAnimeRatings } from '../hooks/useAnimeRatings'
import { useHistory } from '../hooks/useHistory'
import { useAnimeLists } from '../hooks/useAnimeLists'
import { useToast } from '../components/Toast'

export default function AnimeDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { isInWatchlist, toggleWatchlist } = useWatchlist()
  const { isFavorite, toggleFavorite } = useAnimeFavorites()
  const { ratings, fetchRating, setRating } = useAnimeRatings()
  const { history } = useHistory()
  const { getListStatus, setListStatus } = useAnimeLists()
  const toast = useToast()

  const [anime, setAnime] = useState(null)
  const [episodes, setEpisodes] = useState([])
  const [dubEpisodes, setDubEpisodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [wlLoading, setWlLoading] = useState(false)
  const [episodeLimit, setEpisodeLimit] = useState(30)
  const [characters, setCharacters] = useState([])
  const [currentProvider, setCurrentProvider] = useState(null)
  const [episodeAudio, setEpisodeAudio] = useState('sub')
  const [showTrailer, setShowTrailer] = useState(false)
  const [seasons, setSeasons] = useState([])
  const [activeSeason, setActiveSeason] = useState(0)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSeasons([])
    setActiveSeason(0)
    Promise.all([
      getAnimeInfo(id),
      getAnimeEpisodes(id).catch(() => ({ providerEpisodes: [], dubEpisodes: [], provider: null })),
      getAnimeCharacters(id).catch(() => ({ data: [] })),
    ]).then(([infoRes, epRes, charRes]) => {
      if (cancelled) return
      const data = infoRes?.data || infoRes
      setAnime(data)
      setEpisodes(epRes?.providerEpisodes || [])
      setDubEpisodes(epRes?.dubEpisodes || [])
      setCurrentProvider(epRes?.provider || null)
      setCharacters(charRes?.data || [])
      setLoading(false)

      const title = data?.title?.romaji || data?.title?.english || data?.title?.native || ''
      const currentId = parseInt(id, 10)

      const prequels = (data?.relations || []).filter(r => r.relationType === 'PREQUEL')
      const sequels = (data?.relations || []).filter(r => r.relationType === 'SEQUEL')

      const hasRelated = prequels.length > 0 || sequels.length > 0
      if (!hasRelated) return

      const seasonMeta = [
        ...prequels.map(r => ({ id: r.anilistId, title: r.title?.romaji || r.title?.english || '' })),
        { id: currentId, title },
        ...sequels.map(r => ({ id: r.anilistId, title: r.title?.romaji || r.title?.english || '' })),
      ]

      Promise.all(seasonMeta.map(s =>
        getAnimeEpisodes(s.id)
          .then(r => ({ providerEpisodes: r.providerEpisodes || [], dubEpisodes: r.dubEpisodes || [] }))
          .catch(() => ({ providerEpisodes: [], dubEpisodes: [] }))
      )).then(results => {
        if (cancelled) return
        const seasonData = seasonMeta.map((meta, i) => ({
          id: meta.id,
          title: meta.title,
          episodes: results[i].providerEpisodes,
          dubEpisodes: results[i].dubEpisodes,
        }))
        setSeasons(seasonData)
      }).catch(() => {})
    }).catch(() => { if (!cancelled) setLoading(false) })

    if (user) fetchRating(parseInt(id, 10))
    return () => { cancelled = true }
  }, [id, user])

  async function handleWatchlist() {
    if (!anime) return
    setWlLoading(true)
    try {
      const title = anime.title?.romaji || anime.title?.english || ''
      const image = anime.image
      await toggleWatchlist(parseInt(id, 10), title, image)
      toast(isInWatchlist(parseInt(id, 10)) ? 'Eliminado de tu lista' : 'Agregado a tu lista', 'success')
    } catch {
      toast('Error al actualizar la lista', 'error')
    }
    setWlLoading(false)
  }

  async function handleFavorite() {
    if (!anime || !user) return
    try {
      const title = anime.title?.romaji || anime.title?.english || ''
      const image = anime.image
      await toggleFavorite(parseInt(id, 10), title, image)
      toast(isFavorite(parseInt(id, 10)) ? 'Eliminado de favoritos' : 'Agregado a favoritos', 'success')
    } catch {
      toast('Error al actualizar favoritos', 'error')
    }
  }

  async function handleRating(rating) {
    try {
      await setRating(parseInt(id, 10), rating)
      toast(`Calificaste con ${rating}/10`, 'success')
    } catch {
      toast('Error al guardar la calificación', 'error')
    }
  }

  if (loading) return <><SeoHead title="Cargando..." /><DetailSkeleton /></>

  if (!anime) return (
    <>
      <SeoHead title="Anime no encontrado" />
      <div className="text-center py-20 text-text-secondary">No se encontró el anime.</div>
    </>
  )

  const title = anime.title_es || anime.title?.romaji || anime.title?.english || anime.title?.native || ''
  const image = anime.image || anime.posterImage
  const banner = anime.bannerImage
  const inList = isInWatchlist(parseInt(id, 10))
  const inFav = isFavorite(parseInt(id, 10))
  const listStatus = getListStatus(parseInt(id, 10))
  const userRating = ratings[parseInt(id, 10)]
  const currentEps = episodeAudio === 'sub'
    ? (seasons[activeSeason]?.episodes || episodes)
    : (seasons[activeSeason]?.dubEpisodes || dubEpisodes)
  const hasDub = dubEpisodes.length > 0
  const watchedEpisodes = new Set(
    history.filter((h) => h.anilist_id === parseInt(id, 10)).map((h) => h.episode_number)
  )

  const trailer = anime.trailer?.site === 'youtube' ? anime.trailer.id : null

  return (
    <>
      <SeoHead title={title} description={anime.description?.replace(/<[^>]*>/g, '').slice(0, 160)} image={image || banner} url={`/anime/${id}`} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
      {banner && (
        <div className="relative h-[200px] sm:h-[300px] rounded-3xl overflow-hidden mb-6">
          <img src={banner} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-6 mb-10">
        <div className="shrink-0 w-[200px] mx-auto sm:mx-0">
          <img src={image} alt={title} className="w-full rounded-2xl shadow-lg" />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>

          {anime.title?.native && (
            <p className="text-text-secondary text-sm mt-1">{anime.title.native}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            {anime.genres?.map((g) => (
              <span key={g} className="text-xs bg-surface px-3 py-1 rounded-full text-text-secondary">{g}</span>
            ))}
            {anime.averageScore && (
              <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-medium">★ {anime.averageScore}</span>
            )}
            {anime.meanScore && (
              <span className="text-xs bg-accent/20 text-accent px-3 py-1 rounded-full">AniList: {anime.meanScore}</span>
            )}
            {anime.format && (
              <span className="text-xs bg-accent/20 text-accent px-3 py-1 rounded-full">{anime.format}</span>
            )}
            {anime.episodes && (
              <span className="text-xs bg-surface px-3 py-1 rounded-full text-text-secondary">{anime.episodes} episodios</span>
            )}
            {anime.status && (
              <span className="text-xs bg-surface px-3 py-1 rounded-full text-text-secondary">
                {anime.status === 'RELEASING' ? 'Emitiendo' : anime.status === 'FINISHED' ? 'Finalizado' : anime.status}
              </span>
            )}
            {anime.nextAiringEpisode && (
              <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                Ep. {anime.nextAiringEpisode.episode} - {new Date(anime.nextAiringEpisode.airingAt * 1000).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            )}
            {hasDub && (
              <span className="text-xs bg-accent/20 text-accent px-3 py-1 rounded-full" title="Disponible en doblaje (audio alternativo)">
                🎤 Doblaje disponible
              </span>
            )}
          </div>

          {anime.studio && (
            <p className="text-sm text-text-secondary mt-3">Estudio: <span className="text-text-primary">{anime.studio}</span></p>
          )}

          {(anime.synopsis_es || anime.synopsis) && (
            <p className="text-sm text-text-secondary mt-4 leading-relaxed line-clamp-4">
              {(anime.synopsis_es || anime.synopsis).replace(/<[^>]*>/g, '')}
            </p>
          )}
          {anime.synopsis_es && anime.synopsis && anime.synopsis_es !== anime.synopsis && (
            <p className="text-[10px] text-accent mt-1">Sinopsis en español vía AnimeFLV</p>
          )}

          {/* User rating */}
          {user && (
            <div className="mt-4">
              <p className="text-xs text-text-secondary mb-1.5">Tu calificación:</p>
              <div className="flex gap-1">
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleRating(n)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                      userRating === n
                        ? 'bg-primary text-white'
                        : 'bg-surface text-text-secondary hover:bg-surface-hover'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                {userRating && (
                  <button
                    onClick={() => handleRating(userRating)}
                    className="ml-1 text-xs text-text-secondary hover:text-red-400 transition-colors"
                    title="Quitar calificación"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Watchlist + Favorites + Watch buttons */}
          <div className="flex flex-wrap gap-3 mt-6">
            {currentEps.length > 0 && (
              <Link
                to={`/watch?anilistId=${seasons[activeSeason]?.id || id}&ep=${currentEps[0].episodeNumber || currentEps[0].number}&provider=${currentProvider}&audio=${episodeAudio}&title=${encodeURIComponent(seasons[activeSeason]?.title || title)}&image=${encodeURIComponent(image || '')}`}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium text-sm transition-colors"
              >
                ▶ Reproducir
              </Link>
            )}
            {trailer && (
              <button
                onClick={() => setShowTrailer(true)}
                className="px-4 py-2.5 rounded-xl font-medium text-sm transition-colors border border-white/10 bg-surface text-text-secondary hover:text-neon-cyan hover:bg-surface-hover"
              >
                ▶ Tráiler
              </button>
            )}
            {user && (
              <>
                <button
                  onClick={handleWatchlist}
                  disabled={wlLoading}
                  className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-colors border ${
                    inList
                      ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                      : 'bg-surface text-text-secondary border-white/10 hover:text-neon-cyan hover:bg-surface-hover'
                  }`}
                >
                  {inList ? '❤️ En lista' : '🤍 Agregar'}
                </button>
                <button
                  onClick={handleFavorite}
                  className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-colors border ${
                    inFav
                      ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20'
                      : 'bg-surface text-text-secondary border-white/10 hover:text-neon-cyan hover:bg-surface-hover'
                  }`}
                >
                  {inFav ? '⭐ Favorito' : '☆ Favorito'}
                </button>
                {/* List status buttons */}
                <div className="flex gap-1">
                  {[
                    { key: 'watching', label: 'Mirando' },
                    { key: 'completed', label: 'Visto' },
                    { key: 'plan_to_watch', label: 'Por ver' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      onClick={async () => {
                        try {
                          const title = anime.title?.romaji || anime.title?.english || ''
                          await setListStatus(parseInt(id, 10), title, anime.image, s.key)
                          toast(listStatus === s.key ? 'Estado eliminado' : `Estado: ${s.label}`, 'success')
                        } catch {
                          toast('Error al actualizar estado', 'error')
                        }
                      }}
                      className={`px-3 py-2.5 rounded-xl font-medium text-xs transition-colors border ${
                        listStatus === s.key
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface text-text-secondary border-white/10 hover:text-neon-cyan hover:bg-surface-hover'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showTrailer && trailer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowTrailer(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.3 }}
            className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://www.youtube.com/embed/${trailer}?autoplay=1`}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute top-3 right-3 w-10 h-10 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-primary/60 transition-colors border border-white/10"
              aria-label="Cerrar trailer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Characters */}
      {characters.length > 0 && (
        <section className="mb-12">
          <FadeIn>
            <GradientHeading variant="pink" size="sm" className="mb-5">Personajes</GradientHeading>
          </FadeIn>
          <FadeInStagger>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {characters.slice(0, 12).map((edge) => (
                <FadeIn key={edge.node.id}>
                  <Link
                    to={`/character/${edge.node.id}`}
                    className="group rounded-2xl overflow-hidden bg-surface card-hover block"
                  >
                    <div className="aspect-[3/4] overflow-hidden">
                      <img src={edge.node.image?.large} alt={edge.node.name.full} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="p-2.5 text-center">
                      <p className="text-xs font-medium truncate">{edge.node.name.full}</p>
                      <p className="text-[10px] text-text-secondary truncate">{edge.role}</p>
                      {edge.voiceActors?.length > 0 && (
                        <p className="text-[10px] text-accent truncate mt-0.5">{edge.voiceActors[0].name?.full}</p>
                      )}
                    </div>
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/0 group-hover:ring-primary/30 transition-all duration-300" />
                  </Link>
                </FadeIn>
              ))}
            </div>
          </FadeInStagger>
        </section>
      )}

      {anime.relations?.length > 0 && (
        <section className="mb-12">
          <FadeIn>
            <GradientHeading variant="cyan" size="sm" className="mb-5">Relacionados</GradientHeading>
          </FadeIn>
          <FadeInStagger>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {anime.relations.slice(0, 6).map((rel, i) => (
                <FadeIn key={rel.anilistId || rel.id || i} className="relative">
                  {rel.relationType && (
                    <span className="absolute top-2 left-2 z-10 text-[10px] bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-full border border-white/10">
                      {rel.relationType}
                    </span>
                  )}
                  <AnimeCard anime={rel} index={i} />
                </FadeIn>
              ))}
            </div>
          </FadeInStagger>
        </section>
      )}

      {anime.recommendations?.length > 0 && (
        <section className="mb-12">
          <FadeIn>
            <GradientHeading variant="pink" size="sm" className="mb-5">Recomendados</GradientHeading>
          </FadeIn>
          <FadeInStagger>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {anime.recommendations.slice(0, 6).map((rec, i) => (
                <FadeIn key={rec.anilistId || rec.id || i}>
                  <AnimeCard anime={rec} index={i} />
                </FadeIn>
              ))}
            </div>
          </FadeInStagger>
        </section>
      )}

      {/* Comments */}
      <CommentSection anilistId={id} mediaType="anime" />

      <section className="mb-12">
        <FadeIn>
          <div className="flex items-center justify-between mb-5">
            <GradientHeading variant="pink" size="sm">
              Episodios ({currentEps.length})
              {currentProvider && <span className="text-xs font-normal text-text-secondary ml-2">via {currentProvider}</span>}
            </GradientHeading>
            {hasDub && (
              <div className="flex rounded-xl overflow-hidden border border-white/10 p-0.5 bg-surface">
                <button
                  onClick={() => setEpisodeAudio('sub')}
                  className={`relative px-4 py-1.5 text-xs font-medium transition-colors rounded-lg ${
                    episodeAudio === 'sub' ? 'text-white' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {episodeAudio === 'sub' && (
                    <motion.span layoutId="audio-tab" className="absolute inset-0 bg-primary rounded-lg" />
                  )}
                  <span className="relative z-10">SUB</span>
                </button>
                <button
                  onClick={() => setEpisodeAudio('dub')}
                  className={`relative px-4 py-1.5 text-xs font-medium transition-colors rounded-lg ${
                    episodeAudio === 'dub' ? 'text-white' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {episodeAudio === 'dub' && (
                    <motion.span layoutId="audio-tab" className="absolute inset-0 bg-primary rounded-lg" />
                  )}
                  <span className="relative z-10">DUB</span>
                </button>
              </div>
            )}
          </div>
        </FadeIn>

        {seasons.length > 1 && (
          <FadeIn>
            <div className="flex flex-wrap gap-2 mb-5">
              {seasons.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => { setActiveSeason(i); setEpisodeLimit(30) }}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeSeason === i ? 'text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/30' : 'bg-surface text-text-secondary border border-white/10 hover:text-neon-cyan'
                  }`}
                >
                  {s.title || `Temporada ${i + 1}`}
                  <span className="ml-1 text-[10px] opacity-60">({s.episodes.length})</span>
                </button>
              ))}
            </div>
          </FadeIn>
        )}

        {currentEps.length === 0 ? (
          <div className="text-center py-12 text-text-secondary text-sm bg-surface rounded-2xl border border-white/5">No hay episodios disponibles.</div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {currentEps.slice(0, episodeLimit).map((ep, idx) => {
                const epNum = ep.number || ep.episodeNumber
                const watched = watchedEpisodes.has(epNum)
                return (
                  <Link
                    key={epNum ?? `ep-${idx}`}
                    to={`/watch?anilistId=${seasons[activeSeason]?.id || id}&ep=${epNum}&provider=${currentProvider}&audio=${episodeAudio}&title=${encodeURIComponent(seasons[activeSeason]?.title || title)}&image=${encodeURIComponent(ep.image || image || '')}`}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group border ${
                      watched ? 'bg-surface/50 border-transparent' : 'bg-surface border-transparent hover:border-primary/20 card-hover'
                    }`}
                  >
                    <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                      watched ? 'bg-primary/20 text-primary' : 'bg-surface-hover text-text-secondary group-hover:bg-primary/10 group-hover:text-primary'
                    }`}>
                      {watched ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                      ) : epNum}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">Episodio {epNum}</p>
                      {ep.title && <p className="text-xs text-text-secondary truncate mt-0.5">{ep.title}</p>}
                    </div>
                    {watched && (
                      <span className="text-[10px] text-primary/60 shrink-0 font-medium">Visto</span>
                    )}
                    <svg className="w-4 h-4 text-text-secondary/30 group-hover:text-primary/50 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  </Link>
                )
              })}
            </div>
            {episodeLimit < currentEps.length && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setEpisodeLimit((prev) => prev + 30)}
                  className="group/btn relative inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all overflow-hidden border border-white/10 bg-surface hover:border-primary/30"
                >
                  <span className="relative z-10 text-text-primary group-hover/btn:text-primary transition-colors">Cargar más episodios ({currentEps.length - episodeLimit} restantes)</span>
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </motion.div>
    </>
  )
}
