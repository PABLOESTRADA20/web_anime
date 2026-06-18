import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Hls from 'hls.js'
import { getEpisodes, parseEpisodeId, getEpisodeList } from '../lib/anivexa'
import { getWatchWithFallback } from '../lib/api'
import { useHistory } from '../hooks/useHistory'
import { useToast } from '../components/Toast'
import { subtitleLangLabel, subtitleSrcLang, isCloudflareBlock, isSpanishSub } from '../utils/subtitles'

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

const CONSUMET_NAMES = {
  gogoanime: 'Gogoanime',
  zoro: 'Zoro',
  animekai: 'AnimeKai',
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

function providerDisplayName(p) {
  return PROVIDER_NAMES[p] || CONSUMET_NAMES[p] || p
}

export default function Watch() {
  const { '*': episodeId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const { saveProgress } = useHistory()
  const toast = useToast()

  const [sources, setSources] = useState([])
  const [subtitles, setSubtitles] = useState([])
  const [selectedUrl, setSelectedUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [providerErrors, setProviderErrors] = useState([])
  const [episodesData, setEpisodesData] = useState(null)
  const [episodesLoading, setEpisodesLoading] = useState(false)
  const [activeSubtitle, setActiveSubtitle] = useState(-1)
  const [subtitleSrc, setSubtitleSrc] = useState({})
  const subtitleBlobsRef = useRef({})
  const [providerUsed, setProviderUsed] = useState(null)
  const [backendUsed, setBackendUsed] = useState(null)

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

    let cancelled = false
    setLoading(true)
    setError(null)
    setProviderErrors([])
    setSources([])
    setSubtitles([])

    getWatchWithFallback(anilistId, provider, epNum, audio)
      .then((result) => {
        if (cancelled) return
        setProviderUsed(result.provider)
        setBackendUsed(result.backend)
        setSources(result.sources)
        setSubtitles(result.subtitles)
        setSelectedUrl(proxyUrl(result.sources[0].url, result.sources[0].referer))
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setProviderUsed(null)
        setBackendUsed(null)
        setProviderErrors(err.providerErrors || [])
        setError('No se pudo cargar video de ningún proveedor.')
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [anilistId, provider, epNum, audio])

  useEffect(() => {
    if (subtitles.length === 0) {
      setActiveSubtitle(-1)
      return
    }
    const esIndex = subtitles.findIndex(isSpanishSub)
    const preferred = esIndex >= 0 ? esIndex : 0
    setActiveSubtitle(preferred)
    if (esIndex < 0) {
      toast('No hay subtítulos en español. Mostrando ' + subtitleLangLabel(subtitles[0]).toLowerCase() + '.', 'info', 4000)
    }
  }, [subtitles])

  useEffect(() => {
    const video = videoRef.current
    if (!video || subtitles.length === 0) return

    function apply() {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = activeSubtitle >= 0 && i === activeSubtitle ? 'showing' : 'hidden'
      }
    }

    apply()

    if (video.textTracks.length < subtitles.length) {
      const handler = () => {
        if (video.textTracks.length >= subtitles.length) {
          apply()
          video.textTracks.removeEventListener('addtrack', handler)
        }
      }
      video.textTracks.addEventListener('addtrack', handler)
      return () => video.textTracks.removeEventListener('addtrack', handler)
    }
  }, [activeSubtitle, subtitles])

  useEffect(() => {
    let cancelled = false

    Object.values(subtitleBlobsRef.current).forEach(u => URL.revokeObjectURL(u))
    subtitleBlobsRef.current = {}
    setSubtitleSrc({})

    async function loadAll() {
      const blobs = {}
      await Promise.all(subtitles.map(async (sub, i) => {
        if (!sub.file) return
        const urls = [proxySubUrl(sub.file), sub.file].filter(Boolean)
        for (const url of urls) {
          try {
            const res = await fetch(url)
            const text = await res.text()
            if (text && !isCloudflareBlock(text)) {
              blobs[i] = URL.createObjectURL(new Blob([text], { type: 'text/vtt' }))
              return
            }
          } catch {
            // retry with direct url
          }
        }
      }))

      if (cancelled) {
        Object.values(blobs).forEach(u => URL.revokeObjectURL(u))
        return
      }

      subtitleBlobsRef.current = blobs
      setSubtitleSrc(blobs)
    }

    if (subtitles.length > 0) loadAll()

    return () => { cancelled = true }
  }, [subtitles])

  useEffect(() => {
    return () => {
      Object.values(subtitleBlobsRef.current).forEach(u => URL.revokeObjectURL(u))
      subtitleBlobsRef.current = {}
    }
  }, [])

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

  function selectSubtitleTrack(trackIndex) {
    setActiveSubtitle(trackIndex)
    const video = videoRef.current
    if (!video) return
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = trackIndex >= 0 && i === trackIndex ? 'showing' : 'hidden'
    }
  }

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

  const defaultSubIdx = (() => {
    if (subtitles.length === 0) return -1
    const es = subtitles.findIndex(isSpanishSub)
    return es >= 0 ? es : 0
  })()

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

        {subtitles.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-text-secondary mr-1 font-mono">CC</span>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {subtitles.map((sub, i) => (
                <button
                  key={i}
                  onClick={() => selectSubtitleTrack(i)}
                  className={`px-2 py-1.5 text-[10px] font-medium transition-colors ${
                    activeSubtitle === i
                      ? 'bg-neon-cyan text-black'
                      : 'bg-surface text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {subtitleLangLabel(sub)}
                </button>
              ))}
              <button
                onClick={() => selectSubtitleTrack(-1)}
                className={`px-2 py-1.5 text-[10px] font-medium transition-colors border-l border-white/10 ${
                  activeSubtitle < 0
                    ? 'bg-surface/50 text-text-secondary/50'
                    : 'bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                OFF
              </button>
            </div>
          </div>
        )}
      </div>

      {providerUsed && providerUsed !== provider && (
        <p className="text-[10px] text-text-secondary mb-2 text-center">
          Sirviendo vía <span className="text-primary font-medium">{providerDisplayName(providerUsed)}</span> ({backendUsed}) como respaldo
        </p>
      )}

      <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
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
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <span className="text-[10px] text-text-secondary/50 shrink-0 self-center font-mono">Consumet</span>
        {Object.entries(CONSUMET_NAMES).map(([p, name]) => (
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
            {providerErrors.length > 0 && (
              <details className="text-[10px] text-text-secondary/60 max-w-xs text-center">
                <summary className="cursor-pointer hover:text-text-secondary transition-colors">
                  Detalles de errores ({providerErrors.length})
                </summary>
                <ul className="mt-1 space-y-0.5">
                  {providerErrors.map((e, i) => (
                    <li key={i}>{providerDisplayName(e.provider)} ({e.backend}): {e.message}</li>
                  ))}
                </ul>
              </details>
            )}
            <div className="flex flex-wrap gap-2 mt-1">
              <Link to="/" className="px-4 py-2 bg-primary text-white rounded-xl text-sm">Volver al inicio</Link>
              <button
                onClick={() => switchProvider(provider === 'anikoto' ? 'reanime' : 'anikoto')}
                className="px-4 py-2 bg-surface text-text-secondary rounded-xl text-sm border border-white/10 hover:bg-surface-hover transition-colors"
              >
                Intentar otro proveedor
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            controls
            autoPlay
            className="w-full h-full"
            playsInline
          >
            {subtitles.map((sub, i) => (
              <track
                key={i}
                kind="subtitles"
                src={subtitleSrc[i] || sub.file}
                srcLang={subtitleSrcLang(sub)}
                label={subtitleLangLabel(sub)}
                default={i === defaultSubIdx}
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
