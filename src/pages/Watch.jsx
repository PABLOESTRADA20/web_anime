import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Hls from 'hls.js'
import { getWatch, getEpisodes, normalizeStreams, parseEpisodeId, getEpisodeList } from '../lib/anivexa'
import { useHistory } from '../hooks/useHistory'

function useHls(videoRef, url) {
  const hlsRef = useRef(null)
  const videoRefCleanup = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    if (videoRefCleanup.current) {
      video.removeEventListener('loadedmetadata', videoRefCleanup.current)
      videoRefCleanup.current = null
    }

    const isHls = url.includes('.m3u8')

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ xhrSetup: (xhr) => { xhr.withCredentials = false } })
      hlsRef.current = hls
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {})
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      const onLoaded = () => video.play().catch(() => {})
      videoRefCleanup.current = onLoaded
      video.addEventListener('loadedmetadata', onLoaded)
    } else {
      video.src = url
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      if (videoRefCleanup.current && video) {
        video.removeEventListener('loadedmetadata', videoRefCleanup.current)
        videoRefCleanup.current = null
      }
    }
  }, [url, videoRef])
}

const PROVIDER_NAMES = {
  anikoto: 'AniKoto',
  reanime: 'Reanime',
  allmanga: 'AllManga',
  animegg: 'AnimeGG',
  anineko: 'AniNeko',
  anidbapp: 'AniDB App',
  animepahe: 'AnimePahe',
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const M3U8_PROXY = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/m3u8-proxy?url=` : null
const CORS_PROXY = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/cors-proxy?url=` : null

function proxyUrl(url, referer) {
  if (!M3U8_PROXY || !url) return url
  let full = M3U8_PROXY + encodeURIComponent(url)
  if (referer) full += `&referer=${encodeURIComponent(referer)}`
  return full
}

function proxySubUrl(url) {
  if (!CORS_PROXY || !url) return url
  return CORS_PROXY + encodeURIComponent(url)
}

export default function Watch() {
  const { '*': episodeId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const { saveProgress } = useHistory()

  const [sources, setSources] = useState([])
  const [subtitles, setSubtitles] = useState([])
  const [selectedUrl, setSelectedUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [episodesData, setEpisodesData] = useState(null)
  const [episodesLoading, setEpisodesLoading] = useState(false)

  const parsed = parseEpisodeId(episodeId)
  const anilistId = parsed?.anilistId || searchParams.get('anilistId')
  const epNum = parsed?.epNum || parseInt(searchParams.get('ep'), 10)
  const provider = parsed?.provider || searchParams.get('provider') || 'anikoto'
  const audio = parsed?.audio || 'sub'

  const title = searchParams.get('title') || ''
  const image = searchParams.get('image') || ''

  useHls(videoRef, selectedUrl)

  useEffect(() => {
    if (!anilistId || !epNum) {
      setError('Falta información del episodio.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setSources([])
    setSubtitles([])

    getWatch(anilistId, provider, epNum, audio)
      .then((data) => {
        const { sources: srcs, subtitles: subs } = normalizeStreams(data)
        if (srcs.length > 0) {
          setSources(srcs)
          setSubtitles(subs.map(s => ({ ...s, file: proxySubUrl(s.file) })))
          setSelectedUrl(proxyUrl(srcs[0].url, srcs[0].referer))
        } else {
          setError('No hay fuentes de video disponibles para este episodio.')
        }
        setLoading(false)
      })
      .catch(() => {
        setError(`Error al cargar video desde ${PROVIDER_NAMES[provider] || provider}.`)
        setLoading(false)
      })
  }, [anilistId, provider, epNum, audio])

  useEffect(() => {
    if (anilistId) {
      saveProgress(anilistId, epNum, title, image, episodeId)
    }
  }, [anilistId, epNum, episodeId, saveProgress, title, image])

  useEffect(() => {
    if (!anilistId) return
    setEpisodesLoading(true)
    getEpisodes(anilistId)
      .then((data) => {
        setEpisodesData(data)
        setEpisodesLoading(false)
      })
      .catch(() => setEpisodesLoading(false))
  }, [anilistId])

  const episodeList = episodesData ? getEpisodeList(episodesData, provider, audio) : []
  const sortedEps = [...episodeList].sort((a, b) => b.number - a.number)
  const currentEpIndex = sortedEps.findIndex(ep => ep.number === epNum)
  const prevEp = currentEpIndex < sortedEps.length - 1 ? sortedEps[currentEpIndex + 1] : null
  const nextEp = currentEpIndex > 0 ? sortedEps[currentEpIndex - 1] : null

  const dubList = episodesData ? getEpisodeList(episodesData, provider, 'dub') : []
  const hasDub = dubList.length > 0

  function selectSource(source) {
    setSelectedUrl(proxyUrl(source.url, source.referer))
  }

  const switchProvider = useCallback((newProvider) => {
    if (!anilistId || !epNum) return
    const newId = `watch/${newProvider}/${anilistId}/${audio}/${newProvider}-${epNum}`
    navigate(`/watch/${newId}?anilistId=${anilistId}&ep=${epNum}&title=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}`)
  }, [anilistId, epNum, navigate, audio, title, image])

  function switchAudio(newAudio) {
    if (!anilistId || !epNum) return
    const newId = `watch/${provider}/${anilistId}/${newAudio}/${provider}-${epNum}`
    navigate(`/watch/${newId}?anilistId=${anilistId}&ep=${epNum}&title=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}`)
  }

  function goToEpisode(episode) {
    if (!anilistId) return
    const newId = `watch/${provider}/${anilistId}/${audio}/${provider}-${episode.number}`
    navigate(`/watch/${newId}?anilistId=${anilistId}&ep=${episode.number}&title=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto"
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Link
          to={`/anime/${anilistId}`}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors shrink-0"
        >
          ← Volver
        </Link>

        <div className="flex-1" />

        {!episodesLoading && sortedEps.length > 0 && (
          <div className="flex items-center gap-2">
            {prevEp ? (
              <button
                onClick={() => goToEpisode(prevEp)}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                ← Ep. {prevEp.number}
              </button>
            ) : (
              <div className="px-3 py-1.5 text-xs text-text-secondary/40">← Ep. —</div>
            )}

            <select
              value={epNum || ''}
              onChange={(e) => {
                const ep = sortedEps.find(ep => ep.number === parseInt(e.target.value, 10))
                if (ep) goToEpisode(ep)
              }}
              className="bg-surface text-text-primary text-xs font-medium px-2 py-1.5 rounded-lg border border-white/10 cursor-pointer"
            >
              {sortedEps.map((ep) => (
                <option key={ep.number} value={ep.number}>
                  Ep. {ep.number}{ep.title ? ` - ${ep.title}` : ''}
                </option>
              ))}
            </select>

            {nextEp ? (
              <button
                onClick={() => goToEpisode(nextEp)}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Ep. {nextEp.number} →
              </button>
            ) : (
              <div className="px-3 py-1.5 text-xs text-text-secondary/40">Ep. — →</div>
            )}
          </div>
        )}

        {hasDub && (
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            <button
              onClick={() => switchAudio('sub')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                audio === 'sub'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:text-text-primary'
              }`}
            >
              SUB
            </button>
            <button
              onClick={() => switchAudio('dub')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                audio === 'dub'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:text-text-primary'
              }`}
            >
              DUB
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {Object.entries(PROVIDER_NAMES).map(([p, name]) => (
          <button
            key={p}
            onClick={() => switchProvider(p)}
            disabled={loading}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              provider === p
                ? 'bg-primary text-white'
                : 'bg-surface text-text-secondary hover:text-text-primary'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface gap-3 px-4">
            <p className="text-text-secondary text-sm text-center">{error}</p>
            <Link to="/" className="px-4 py-2 bg-primary text-white rounded-xl text-sm">Volver al inicio</Link>
          </div>
        ) : (
          <video
            ref={videoRef}
            controls
            autoPlay
            className="w-full h-full"
            crossOrigin="anonymous"
            playsInline
          >
            {subtitles.map((sub, i) => (
              <track
                key={i}
                kind="subtitles"
                src={sub.file}
                srcLang={sub.language || (sub.label?.toLowerCase().includes('en') ? 'en' : sub.label?.toLowerCase().includes('es') ? 'es' : 'en')}
                label={sub.label || `Subtítulo ${i + 1}`}
                default={sub.default || sub.label?.toLowerCase().includes('es') || i === 0}
              />
            ))}
          </video>
        )}
      </div>

      {!loading && !error && sources.length > 1 && (
        <div className="mt-4">
          <p className="text-xs text-text-secondary mb-1.5">Calidad:</p>
          <div className="flex flex-wrap gap-2">
            {sources.map((s, i) => (
              <button
                key={i}
                onClick={() => selectSource(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedUrl?.includes(encodeURIComponent(s.url))
                    ? 'bg-primary text-white'
                    : 'bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                {s.quality || s.server || `Fuente ${i + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
