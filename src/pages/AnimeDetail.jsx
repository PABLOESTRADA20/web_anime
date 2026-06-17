import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DetailSkeleton } from '../components/Skeletons'
import AnimeCard from '../components/AnimeCard'
import CommentSection from '../components/CommentSection'
import { getAnimeInfo, getAnimeEpisodes } from '../lib/api'
import { getAnimeCharacters } from '../lib/anilist'
import { useAuth } from '../hooks/useAuth'
import { useWatchlist } from '../hooks/useWatchlist'
import { useAnimeFavorites } from '../hooks/useAnimeFavorites'
import { useAnimeRatings } from '../hooks/useAnimeRatings'
import { useHistory } from '../hooks/useHistory'
import { useToast } from '../components/Toast'

export default function AnimeDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { isInWatchlist, toggleWatchlist } = useWatchlist()
  const { isFavorite, toggleFavorite } = useAnimeFavorites()
  const { ratings, fetchRating, setRating } = useAnimeRatings()
  const { history } = useHistory()
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

  useEffect(() => {
    let cancelled = false
    setLoading(true)
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
    }).catch(() => { if (!cancelled) setLoading(false) })

    if (user) fetchRating(parseInt(id, 10))
    return () => { cancelled = true }
  }, [id, user])

  async function handleWatchlist() {
    if (!anime) return
    setWlLoading(true)
    const title = anime.title?.romaji || anime.title?.english || ''
    const image = anime.image
    await toggleWatchlist(parseInt(id, 10), title, image)
    toast(isInWatchlist(parseInt(id, 10)) ? 'Eliminado de tu lista' : 'Agregado a tu lista', 'success')
    setWlLoading(false)
  }

  async function handleFavorite() {
    if (!anime || !user) return
    const title = anime.title?.romaji || anime.title?.english || ''
    const image = anime.image
    await toggleFavorite(parseInt(id, 10), title, image)
    toast(isFavorite(parseInt(id, 10)) ? 'Eliminado de favoritos' : 'Agregado a favoritos', 'success')
  }

  async function handleRating(rating) {
    await setRating(parseInt(id, 10), rating)
    toast(`Calificaste con ${rating}/10`, 'success')
  }

  if (loading) return <DetailSkeleton />

  if (!anime) return (
    <div className="text-center py-20 text-text-secondary">No se encontró el anime.</div>
  )

  const title = anime.title?.romaji || anime.title?.english || anime.title?.native || ''
  const image = anime.image || anime.posterImage
  const banner = anime.bannerImage
  const inList = isInWatchlist(parseInt(id, 10))
  const inFav = isFavorite(parseInt(id, 10))
  const userRating = ratings[parseInt(id, 10)]
  const currentEps = episodeAudio === 'sub' ? episodes : dubEpisodes
  const hasDub = dubEpisodes.length > 0
  const watchedEpisodes = new Set(
    history.filter((h) => h.anilist_id === parseInt(id, 10)).map((h) => h.episode_number)
  )

  const trailer = anime.trailer?.site === 'youtube' ? anime.trailer.id : null

  return (
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
          </div>

          {anime.studio && (
            <p className="text-sm text-text-secondary mt-3">Estudio: <span className="text-text-primary">{anime.studio}</span></p>
          )}

          {anime.synopsis && (
            <p className="text-sm text-text-secondary mt-4 leading-relaxed line-clamp-4">
              {anime.synopsis.replace(/<[^>]*>/g, '')}
            </p>
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
                to={`/watch?anilistId=${id}&ep=${currentEps[0].episodeNumber || currentEps[0].number}&provider=${currentProvider}&audio=${episodeAudio}&title=${encodeURIComponent(title)}&image=${encodeURIComponent(image || '')}`}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium text-sm transition-colors"
              >
                ▶ Reproducir
              </Link>
            )}
            {trailer && (
              <button
                onClick={() => setShowTrailer(true)}
                className="px-4 py-2.5 rounded-xl font-medium text-sm transition-colors border border-white/10 bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-hover"
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
                      : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  {inList ? '❤️ En lista' : '🤍 Agregar'}
                </button>
                <button
                  onClick={handleFavorite}
                  className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-colors border ${
                    inFav
                      ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20'
                      : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  {inFav ? '⭐ Favorito' : '☆ Favorito'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      {showTrailer && trailer && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowTrailer(false)}
        >
          <div
            className="relative w-full max-w-3xl aspect-video rounded-2xl overflow-hidden"
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
              className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Characters */}
      {characters.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4">Personajes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {characters.slice(0, 12).map((edge) => (
              <Link
                key={edge.node.id}
                to={`/character/${edge.node.id}`}
                className="group rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <img src={edge.node.image?.large} alt={edge.node.name.full} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="p-2 text-center">
                  <p className="text-xs font-medium truncate">{edge.node.name.full}</p>
                  <p className="text-[10px] text-text-secondary truncate">{edge.role}</p>
                  {edge.voiceActors?.length > 0 && (
                    <p className="text-[10px] text-accent truncate">🎤 {edge.voiceActors[0].name?.full}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Relations / Recommendations */}
      {anime.relations?.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            🔗 Relacionados
            <span className="text-xs font-normal text-text-secondary">{anime.relations.length}</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {anime.relations.slice(0, 6).map((rel, i) => (
              <div key={rel.anilistId || rel.id || i} className="relative">
                {rel.relationType && (
                  <span className="absolute top-2 left-2 z-10 text-[10px] bg-black/70 text-white px-2 py-0.5 rounded-full">
                    {rel.relationType}
                  </span>
                )}
                <AnimeCard anime={rel} index={i} />
              </div>
            ))}
          </div>
        </section>
      )}

      {anime.recommendations?.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4">💡 Recomendados</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {anime.recommendations.slice(0, 6).map((rec, i) => (
              <AnimeCard key={rec.anilistId || rec.id || i} anime={rec} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Comments */}
      <CommentSection anilistId={id} mediaType="anime" />

      {/* Episodes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">
            Episodios ({currentEps.length}) {currentProvider && <span className="text-xs text-text-secondary font-normal ml-2">via {currentProvider}</span>}
          </h2>
          {hasDub && (
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                onClick={() => setEpisodeAudio('sub')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  episodeAudio === 'sub' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                SUB
              </button>
              <button
                onClick={() => setEpisodeAudio('dub')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  episodeAudio === 'dub' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                DUB
              </button>
            </div>
          )}
        </div>

        {currentEps.length === 0 ? (
          <p className="text-text-secondary text-sm">No hay episodios disponibles.</p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {currentEps.slice(0, episodeLimit).map((ep, idx) => {
                const epNum = ep.number || ep.episodeNumber
                const watched = watchedEpisodes.has(epNum)
                return (
                  <Link
                    key={epNum ?? `ep-${idx}`}
                    to={`/watch?anilistId=${id}&ep=${epNum}&provider=${currentProvider}&audio=${episodeAudio}&title=${encodeURIComponent(title)}&image=${encodeURIComponent(ep.image || image || '')}`}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors group ${
                      watched ? 'bg-surface/50' : 'bg-surface hover:bg-surface-hover'
                    }`}
                  >
                    <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${
                      watched ? 'bg-primary/20 text-primary' : 'bg-surface-hover text-text-secondary'
                    }`}>
                      {watched ? '✓' : epNum}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">Episodio {epNum}</p>
                      {ep.title && <p className="text-xs text-text-secondary truncate mt-0.5">{ep.title}</p>}
                    </div>
                    {watched && (
                      <span className="text-[10px] text-text-secondary shrink-0">Visto</span>
                    )}
                  </Link>
                )
              })}
            </div>
            {episodeLimit < currentEps.length && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setEpisodeLimit((prev) => prev + 30)}
                  className="px-6 py-2.5 bg-surface hover:bg-surface-hover text-text-primary rounded-xl font-medium text-sm transition-colors border border-white/10"
                >
                  Cargar más episodios ({currentEps.length - episodeLimit} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </motion.div>
  )
}
