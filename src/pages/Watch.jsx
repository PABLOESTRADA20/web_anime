import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { parseEpisodeId } from '../lib/anivexa'
import { getAnimeEpisodes, getWatchWithFallback } from '../lib/api'
import { getAnimeInfo } from '../lib/anilist'
import { useHistory } from '../hooks/useHistory'
import { useToast } from '../components/Toast'
import SeoHead from '../components/SeoHead'
import { subtitleLangLabel, subtitleSrcLang, isCloudflareBlock, isSpanishSub } from '../utils/subtitles'
import { fetchSubtitle } from '../utils/proxy'

function useHls(videoRef, url) {
  const hlsRef = useRef(null)
  const videoRefCleanup = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return
    let cancelled = false

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    if (videoRefCleanup.current) {
      video.removeEventListener('loadedmetadata', videoRefCleanup.current)
      videoRefCleanup.current = null
    }

    const isHls = url.includes('.m3u8')

    async function setupHls() {
      if (!isHls) {
        video.src = url
        return
      }

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url
        const onLoaded = () => video.play().catch(() => {})
        videoRefCleanup.current = onLoaded
        video.addEventListener('loadedmetadata', onLoaded)
        return
      }

      try {
        const { default: Hls } = await import('hls.js')
        if (cancelled) return
        if (!Hls.isSupported()) {
          video.src = url
          return
        }
        const hls = new Hls({ xhrSetup: (xhr) => { xhr.withCredentials = false } })
        hlsRef.current = hls
        hls.loadSource(url)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {})
        })
      } catch {
        video.src = url
      }
    }

    setupHls()

    return () => {
      cancelled = true
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

function useKeyboardShortcuts(videoRef, onNextEpRef) {
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    function handler(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          if (video.paused) video.play().catch(() => {})
          else video.pause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          video.currentTime = Math.max(0, video.currentTime - 10)
          break
        case 'ArrowRight':
          e.preventDefault()
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 10)
          break
        case 'ArrowUp':
          e.preventDefault()
          video.volume = Math.min(1, (video.volume || 0) + 0.1)
          break
        case 'ArrowDown':
          e.preventDefault()
          video.volume = Math.max(0, (video.volume || 0) - 0.1)
          break
        case 'f':
        case 'F':
          e.preventDefault()
          if (document.fullscreenElement) document.exitFullscreen()
          else video.requestFullscreen()
          break
        case 'm':
        case 'M':
          e.preventDefault()
          video.muted = !video.muted
          break
        case 'n':
        case 'N':
          e.preventDefault()
          onNextEpRef.current?.()
          break
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [videoRef, onNextEpRef])
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

const BACKEND_NAMES = {
  kenjitsu: 'Kenjitsu',
  anivexa: 'Anivexa',
  consumet: 'Consumet',
}

const CONSUMET_NAMES = {
  gogoanime: 'Gogoanime',
  zoro: 'Zoro',
  animekai: 'AnimeKai',
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const M3U8_PROXY = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/m3u8-proxy?url=` : null

function proxyUrl(url, referer) {
  if (!M3U8_PROXY || !url) return url
  let full = M3U8_PROXY + encodeURIComponent(url)
  if (referer) full += `&referer=${encodeURIComponent(referer)}`
  return full
}

function providerDisplayName(p) {
  return PROVIDER_NAMES[p] || CONSUMET_NAMES[p] || p
}

function getUniqueServers(sources) {
  const servers = [...new Set(sources.map(s => s.server || 'default').filter(Boolean))]
  if (servers.length <= 1) return []
  return servers
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
  const [downloads, setDownloads] = useState([])
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
  const [activeServer, setActiveServer] = useState(null)
  const [nextEpisode, setNextEpisode] = useState(null)
  const [audioType, setAudioType] = useState('sub')
  const [showEpisodes, setShowEpisodes] = useState(false)

  const parsed = parseEpisodeId(episodeId)
  const anilistId = parsed?.anilistId || searchParams.get('anilistId')
  const epNum = parsed?.epNum || parseInt(searchParams.get('ep'), 10)
  const provider = parsed?.provider || searchParams.get('provider') || 'kenjitsu'
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
    setDownloads([])
    setActiveServer(null)

    getWatchWithFallback(anilistId, provider, epNum, audio)
      .then((result) => {
        if (cancelled) return
        setProviderUsed(result.provider)
        setBackendUsed(result.backend)
        setAudioType(result.audioType || audio)
        setSources(result.sources)
        setSubtitles(result.subtitles)
        setDownloads(result.downloads || [])
        const servers = getUniqueServers(result.sources)
        if (servers.length > 0) {
          setActiveServer(servers[0])
        }
        if (result.sources.length > 0) {
          setSelectedUrl(proxyUrl(result.sources[0].url, result.sources[0].referer))
        }
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

    getAnimeInfo(parseInt(anilistId, 10))
      .then((info) => {
        if (!cancelled && info?.nextAiringEpisode) {
          setNextEpisode(info.nextAiringEpisode)
        }
      })
      .catch(() => {})

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
        const text = await fetchSubtitle(sub.file)
        if (text && !isCloudflareBlock(text)) {
          blobs[i] = URL.createObjectURL(new Blob([text], { type: 'text/vtt' }))
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
    getAnimeEpisodes(anilistId)
      .then((data) => {
        setEpisodesData(data)
        setEpisodesLoading(false)
      })
      .catch(() => setEpisodesLoading(false))
  }, [anilistId])

  const episodeList = episodesData
    ? (episodesData.providerEpisodes || episodesData?.[provider]?.episodes?.[audio] || [])
    : []
  const sortedEps = [...episodeList].sort((a, b) => b.number - a.number)
  const currentEpIndex = sortedEps.findIndex(ep => ep.number === epNum)
  const prevEp = currentEpIndex < sortedEps.length - 1 ? sortedEps[currentEpIndex + 1] : null
  const nextEp = currentEpIndex > 0 ? sortedEps[currentEpIndex - 1] : null

  const dubList = episodesData
    ? (episodesData.dubEpisodes || episodesData?.[provider]?.episodes?.dub || [])
    : []
  const hasDub = dubList.length > 0

  const servers = getUniqueServers(sources)
  const currentServerSources = activeServer
    ? sources.filter(s => (s.server || 'default') === activeServer)
    : sources

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

  function selectServer(server) {
    setActiveServer(server)
    const serverSources = sources.filter(s => (s.server || 'default') === server)
    if (serverSources.length > 0) {
      setSelectedUrl(proxyUrl(serverSources[0].url, serverSources[0].referer))
    }
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

  const onNextEpRef = useRef(null)
  useEffect(() => {
    onNextEpRef.current = nextEp ? () => goToEpisode(nextEp) : null
  }, [nextEp, goToEpisode])
  useKeyboardShortcuts(videoRef, onNextEpRef)

  const defaultSubIdx = (() => {
    if (subtitles.length === 0) return -1
    const es = subtitles.findIndex(isSpanishSub)
    return es >= 0 ? es : 0
  })()

  function formatDate(timestamp) {
    if (!timestamp) return ''
    const d = new Date(timestamp * 1000)
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  function formatSize(bytes) {
    if (!bytes) return ''
    const mb = bytes / (1024 * 1024)
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
  }

  const pageTitle = title ? `Episodio ${epNum} de ${title}` : 'Reproducir'

  return (
    <>
      <SeoHead title={pageTitle} image={image} url={`/watch?anilistId=${anilistId}&ep=${epNum}`} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-5xl mx-auto"
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Link
          to={`/anime/${anilistId}`}
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors shrink-0 group"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          Volver
        </Link>

        <div className="flex-1" />

        {!episodesLoading && sortedEps.length > 0 && (
          <>
            <div className="flex items-center gap-1.5">
              {prevEp ? (
                <button
                  onClick={() => goToEpisode(prevEp)}
                  aria-label={`Episodio anterior: ${prevEp.number}`}
                  className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-text-secondary hover:text-text-primary transition-colors border border-white/5"
                >
                  ← Ep. {prevEp.number}
                </button>
              ) : (
                <div className="px-3 py-1.5 text-xs text-text-secondary/40">← Ep. —</div>
              )}

              <button
                onClick={() => setShowEpisodes(v => !v)}
                aria-label="Lista de episodios"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  showEpisodes
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
                }`}
              >
                Ep. {epNum} {showEpisodes ? '▲' : '▼'}
              </button>

              {nextEp ? (
                <button
                  onClick={() => goToEpisode(nextEp)}
                  aria-label={`Siguiente episodio: ${nextEp.number}`}
                  className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-text-secondary hover:text-text-primary transition-colors border border-white/5"
                >
                  Ep. {nextEp.number} →
                </button>
              ) : (
                <div className="px-3 py-1.5 text-xs text-text-secondary/40">Ep. — →</div>
              )}
            </div>

            {showEpisodes && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="w-full"
              >
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5 max-h-48 overflow-y-auto p-2 rounded-xl bg-surface/50 border border-white/5">
                  {sortedEps.map((ep) => (
                    <button
                      key={ep.number}
                      onClick={() => { goToEpisode(ep); setShowEpisodes(false) }}
                      aria-label={`Episodio ${ep.number}${ep.title ? `: ${ep.title}` : ''}`}
                      className={`aspect-square rounded-lg text-xs font-medium transition-colors border flex items-center justify-center ${
                        ep.number === epNum
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-primary/30 hover:bg-surface-hover'
                      }`}
                    >
                      {ep.number}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}

        {hasDub && (
          <div className="flex rounded-xl overflow-hidden border border-white/10 p-0.5 bg-surface">
            {[['sub', 'SUB'], ['dub', 'DUB'], ['latam', 'LATAM']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => switchAudio(val)}
                className={`relative px-2.5 py-1.5 text-xs font-medium transition-colors rounded-lg ${
                  audio === val
                    ? 'text-white'
                    : audio === 'latam' && val === 'dub' && audioType === 'latam'
                      ? 'text-accent/60'
                      : 'bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                {audio === val && (
                  <motion.span layoutId="audio-watch-tab" className="absolute inset-0 bg-primary rounded-lg" />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            ))}
          </div>
        )}

        {subtitles.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-text-secondary font-mono">CC</span>
            <div className="flex rounded-xl overflow-hidden border border-white/10 p-0.5 bg-surface">
              {subtitles.map((sub, i) => (
                <button
                  key={i}
                  onClick={() => selectSubtitleTrack(i)}
                  className={`relative px-2 py-1.5 text-[10px] font-medium transition-colors rounded-lg ${
                    activeSubtitle === i ? 'text-white' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {activeSubtitle === i && (
                    <motion.span layoutId="sub-watch" className="absolute inset-0 bg-neon-cyan rounded-lg" />
                  )}
                  <span className="relative z-10">{subtitleLangLabel(sub)}</span>
                </button>
              ))}
              <button
                onClick={() => selectSubtitleTrack(-1)}
                className={`relative px-2 py-1.5 text-[10px] font-medium transition-colors rounded-lg ${
                  activeSubtitle < 0 ? 'text-text-secondary/50' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {activeSubtitle < 0 && (
                  <motion.span layoutId="sub-watch" className="absolute inset-0 bg-surface-hover rounded-lg" />
                )}
                <span className="relative z-10">OFF</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {providerUsed && providerUsed !== provider && (
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <p className="text-[10px] text-text-secondary">
            Sirviendo vía <span className="text-primary font-medium">{providerDisplayName(providerUsed)}</span> ({BACKEND_NAMES[backendUsed] || backendUsed})
          </p>
        </div>
      )}
      {audioType === 'latam' && (
        <p className="text-[10px] text-accent mb-2 text-center font-medium">Audio Latino detectado</p>
      )}

      <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
        <span className="text-[10px] text-text-secondary/50 shrink-0 self-center font-mono mr-1">Anivexa</span>
        {Object.entries(PROVIDER_NAMES).map(([p, name]) => (
          <button
            key={p}
            onClick={() => switchProvider(p)}
            disabled={loading}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              provider === p
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        <span className="text-[10px] text-text-secondary/50 shrink-0 self-center font-mono mr-1">Backends</span>
        {Object.entries(CONSUMET_NAMES).map(([p, name]) => (
          <button
            key={p}
            onClick={() => switchProvider(p)}
            disabled={loading}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              provider === p
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
            }`}
          >
            {name}
          </button>
        ))}
        <button
          onClick={() => switchProvider('kenjitsu')}
          disabled={loading}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            provider === 'kenjitsu'
              ? 'bg-accent/10 text-accent border-accent/30'
              : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
          }`}
        >
          Kenjitsu
        </button>
      </div>

      <div className="relative bg-black rounded-2xl overflow-hidden aspect-video shadow-2xl shadow-black/50 ring-1 ring-white/5">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 border-2 border-primary/30 rounded-full" />
              <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-xs text-text-secondary">Cargando video...</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface gap-4 px-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
            </div>
            <p className="text-text-secondary text-sm text-center max-w-xs">{error}</p>
            {providerErrors.length > 0 && (
              <details className="text-[10px] text-text-secondary/60 max-w-xs text-center">
                <summary className="cursor-pointer hover:text-text-secondary transition-colors">Detalles de errores ({providerErrors.length})</summary>
                <ul className="mt-1 space-y-0.5">
                  {providerErrors.map((e, i) => (
                    <li key={i}>{providerDisplayName(e.provider)} ({e.backend}): {e.message}</li>
                  ))}
                </ul>
              </details>
            )}
            <div className="flex flex-wrap gap-2 mt-1">
              <Link to="/" className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-medium transition-colors">Volver al inicio</Link>
              <button
                onClick={() => switchProvider(provider === 'anikoto' ? 'reanime' : 'anikoto')}
                className="px-5 py-2.5 bg-surface text-text-secondary rounded-xl text-sm border border-white/10 hover:bg-surface-hover transition-colors"
              >Intentar otro proveedor</button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            controls
            autoPlay
            className="w-full h-full"
            playsInline
            onEnded={() => {
              if (nextEp) {
                toast('Reproduciendo siguiente episodio...', 'info', 2000)
                setTimeout(() => goToEpisode(nextEp), 1000)
              }
            }}
          >
            {subtitles.map((sub, i) => {
              const trackSrc = subtitleSrc[i]
              if (!trackSrc) return null
              return (
                <track
                  key={i}
                  kind="subtitles"
                  src={trackSrc}
                  srcLang={subtitleSrcLang(sub)}
                  label={subtitleLangLabel(sub)}
                  default={i === defaultSubIdx}
                />
              )
            })}
          </video>
        )}
      </div>

      {!loading && !error && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-3 text-[10px] text-text-secondary/50 justify-center">
            <span><kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">Space</kbd> Play/Pause</span>
            <span><kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">←/→</kbd> 10s</span>
            <span><kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">↑/↓</kbd> Volumen</span>
            <span><kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">F</kbd> Pantalla completa</span>
            <span><kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">M</kbd> Silenciar</span>
            <span><kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">N</kbd> Siguiente ep.</span>
          </div>
          {servers.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-secondary font-medium">Servidor:</span>
              <div className="flex gap-1.5">
                {servers.map((server) => (
                  <button
                    key={server}
                    onClick={() => selectServer(server)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      activeServer === server
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
                    }`}
                  >
                    {server}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentServerSources.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-secondary font-medium">Calidad:</span>
              <div className="flex gap-1.5">
                {currentServerSources.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => selectSource(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      selectedUrl?.includes(encodeURIComponent(s.url))
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
                    }`}
                  >
                    {s.quality || s.server || `Fuente ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {downloads.length > 0 && (
            <div className="p-4 rounded-2xl bg-surface/50 border border-white/5">
              <p className="text-xs font-medium text-text-secondary mb-2">Descargas:</p>
              <div className="space-y-1.5">
                {downloads.map((d, i) => (
                  <a
                    key={i}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover transition-all text-xs border border-transparent hover:border-primary/20 group"
                  >
                    <span className="text-primary font-medium group-hover:text-primary-hover transition-colors">{d.server || d.quality || 'Servidor ' + (i + 1)}</span>
                    {d.size && <span className="text-text-secondary">{formatSize(d.size)}</span>}
                    {d.audio && <span className="text-text-secondary/60">{d.audio}</span>}
                    <span className="ml-auto text-neon-cyan flex items-center gap-1 group-hover:gap-2 transition-all">Descargar <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {nextEpisode && (
            <div className="flex items-center justify-center gap-2 text-xs text-text-secondary/60">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              Próximo episodio: <span className="text-text-primary font-medium">{formatDate(nextEpisode.airingAt)}</span> (Ep. {nextEpisode.episode})
            </div>
          )}
        </div>
      )}
    </motion.div>
    </>
  )
}
