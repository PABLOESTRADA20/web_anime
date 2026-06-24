import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { parseEpisodeId } from '../lib/anivexa'
import { getAnimeEpisodes, getWatchWithFallback } from '../lib/api'

import { getAnimeInfo } from '../lib/anilist'
import { useHistory } from '../hooks/useHistory'
import { useToast } from '../components/Toast'
import CommunityEpisodes from '../components/CommunityEpisodes'
import EmbedPlayer from '../components/EmbedPlayer'
import WatchParty from '../components/WatchParty'
import { useWatchParty } from '../hooks/useWatchParty'
import CommentSection from '../components/CommentSection'
import { getProviderLabel } from '../hooks/useCommunityEpisodes'
import SeoHead from '../components/SeoHead'
import { subtitleLangLabel, subtitleSrcLang, isCloudflareBlock, isSpanishSub } from '../utils/subtitles'
import { fetchSubtitle } from '../utils/proxy'
import { downloadVideoEpisode, isVideoCached } from '../utils/videoDownload'
import { formatSize } from '../utils/downloads'
import { VideoCacheLoader } from '../utils/videoCacheLoader'
import LanguageSelector from '../components/LanguageSelector'
import { detectAudioOptions } from '../utils/detectAudio'

function useHls(videoRef, url, useCache, proxyFallbackUrl) {
  const hlsRef = useRef(null)
  const videoRefCleanup = useRef(null)
  const retryCountRef = useRef(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return
    let cancelled = false
    retryCountRef.current = 0

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
        const config = {
          xhrSetup: (xhr) => {
            xhr.withCredentials = false
          },
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          backBufferLength: 30,
          maxBufferSize: 60 * 1000 * 1000,
          manifestLoadingMaxRetry: 5,
          manifestLoadingRetryDelay: 1000,
          manifestLoadingTimeOut: 10000,
          levelLoadingMaxRetry: 5,
          levelLoadingRetryDelay: 1000,
          levelLoadingTimeOut: 10000,
          fragLoadingMaxRetry: 5,
          fragLoadingRetryDelay: 500,
          fragLoadingTimeOut: 10000,
          enableWorker: true,
          startLevel: 0,
          lowLatencyMode: false,
          abrEwmaFastVoD: 4,
          abrEwmaSlowVoD: 8,
          abrBandWidthFactor: 0.9,
          abrBandWidthUpFactor: 0.7,
        }
        if (useCache) {
          config.loader = VideoCacheLoader
        }
        const hls = new Hls(config)
        hlsRef.current = hls
        hls.loadSource(url)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {})
        })
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (cancelled) return
          if (!data.fatal) return
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (proxyFallbackUrl && url !== proxyFallbackUrl && retryCountRef.current === 0) {
                retryCountRef.current++
                hls.loadSource(proxyFallbackUrl)
                return
              }
              if (retryCountRef.current < 3) {
                retryCountRef.current++
                setTimeout(() => hls.startLoad(), 1000)
                return
              }
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError()
              return
          }
          hls.destroy()
          hlsRef.current = null
          video.src = url
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
  }, [url, videoRef, useCache, proxyFallbackUrl])
}

function useKeyboardShortcuts(videoRef, onNextEpRef, setPlaybackRate) {
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
        case '>':
        case '.':
          e.preventDefault()
          if (e.shiftKey) {
            const rates = [0.5, 1, 1.5, 2]
            const current = video.playbackRate
            const next = rates.find((r) => r > current) || rates[0]
            video.playbackRate = next
            setPlaybackRate(next)
          }
          break
        case '<':
        case ',':
          e.preventDefault()
          if (e.shiftKey) {
            const rates = [2, 1.5, 1, 0.5]
            const current = video.playbackRate
            const prev = rates.find((r) => r < current) || rates[rates.length - 1]
            video.playbackRate = prev
            setPlaybackRate(prev)
          }
          break
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [videoRef, onNextEpRef, setPlaybackRate])
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

const MIRURO_NAMES = {
  kiwi: 'Kiwi',
  pewe: 'Pewe',
  moo: 'Moo',
  bee: 'Bee',
  hop: 'Hop',
  bonk: 'Bonk',
  ally: 'Ally',
}

const BACKEND_NAMES = {
  kenjitsu: 'Kenjitsu',
  anivexa: 'Anivexa',
  miruro: 'Miruro',
  veranime: 'VerAnime',
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const M3U8_PROXY = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/m3u8-proxy?url=` : null

function proxyUrl(url) {
  return url
}

function getProxyUrl(url, referer) {
  if (!M3U8_PROXY || !url) return url
  let full = M3U8_PROXY + encodeURIComponent(url)
  if (referer) full += `&referer=${encodeURIComponent(referer)}`
  return full
}

function providerDisplayName(p) {
  return PROVIDER_NAMES[p] || p
}

function getUniqueServers(sources) {
  const servers = [...new Set(sources.map((s) => s.server || 'default').filter(Boolean))]
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
  const [playbackRate, setPlaybackRate] = useState(1)
  const [timeDisplay, setTimeDisplay] = useState({ current: 0, duration: 0 })
  const [isIframeSource, setIsIframeSource] = useState(false)
  const [autoplayCountdown, setAutoplayCountdown] = useState(null)
  const [dlProgress, setDlProgress] = useState(null)
  const [dlStatus, setDlStatus] = useState('idle')
  const [isCached, setIsCached] = useState(false)
  const [useCachePlayback, setUseCachePlayback] = useState(false)

  const [showSelector, setShowSelector] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState(null)
  const [audioOptions, setAudioOptions] = useState(null)
  const [detectingAudio, setDetectingAudio] = useState(true)
  const audioFallbackRef = useRef(null)

  const effectiveAudio = selectedLanguage || audio

  const parsed = parseEpisodeId(episodeId)
  const anilistId = parsed?.anilistId || searchParams.get('anilistId')
  const epNum = parsed?.epNum || parseInt(searchParams.get('ep'), 10)
  const provider = parsed?.provider || searchParams.get('provider') || 'kenjitsu'
  const audio = parsed?.audio || 'sub'

  const title = searchParams.get('title') || ''
  const image = searchParams.get('image') || ''

  const party = useWatchParty(anilistId, epNum, videoRef)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('party') && anilistId && epNum) {
      party.join()
    }
  }, [anilistId, epNum, party])

  useEffect(() => {
    setShowSelector(true)
    setSelectedLanguage(null)
    setAudioOptions(null)
    setDetectingAudio(true)
  }, [anilistId, epNum])

  useEffect(() => {
    if (!anilistId || !epNum) return
    let cancelled = false
    setDetectingAudio(true)

    clearTimeout(audioFallbackRef.current)
    audioFallbackRef.current = setTimeout(() => {
      if (!cancelled) {
        setDetectingAudio(false)
        setSelectedLanguage('sub')
        setShowSelector(false)
      }
    }, 10000)

    detectAudioOptions(anilistId, epNum, title)
      .then((options) => {
        if (!cancelled) {
          setAudioOptions(options)
          setDetectingAudio(false)
        }
      })
      .catch(() => {
        if (!cancelled) setDetectingAudio(false)
      })
    return () => {
      cancelled = true
      clearTimeout(audioFallbackRef.current)
    }
  }, [anilistId, epNum, title])

  const [proxyFallbackUrl, setProxyFallbackUrl] = useState(null)

  useHls(videoRef, selectedUrl, useCachePlayback, proxyFallbackUrl)

  useEffect(() => {
    const v = videoRef.current
    if (v) v.playbackRate = playbackRate
  }, [playbackRate, videoRef])

  useEffect(() => {
    if (showSelector || !anilistId || !epNum) {
      if (!anilistId || !epNum) {
        setError('Falta información del episodio.')
        setLoading(false)
      }
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

    getWatchWithFallback(anilistId, provider, epNum, effectiveAudio)
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
        const allIframe = result.sources.length > 0 && result.sources.every((s) => s.type === 'iframe')
        setIsIframeSource(allIframe)
        if (!allIframe && result.sources.length > 0) {
          const order = ['4K', '1080p', '720p', '480p', '360p', 'auto']
          const sorted = [...result.sources].sort((a, b) => {
            const ai = order.findIndex((o) => (a.quality || '').toLowerCase().includes(o))
            const bi = order.findIndex((o) => (b.quality || '').toLowerCase().includes(o))
            return (ai >= 0 ? ai : 99) - (bi >= 0 ? bi : 99)
          })
          setSelectedUrl(proxyUrl(sorted[0].url))
          setProxyFallbackUrl(getProxyUrl(sorted[0].url, sorted[0].referer))
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

    return () => {
      cancelled = true
    }
  }, [anilistId, provider, epNum, effectiveAudio, showSelector, selectedLanguage, audio])

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
  }, [subtitles, toast])

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

    Object.values(subtitleBlobsRef.current).forEach((u) => URL.revokeObjectURL(u))
    subtitleBlobsRef.current = {}
    setSubtitleSrc({})

    async function loadAll() {
      const blobs = {}
      const referer = sources.find((s) => s.referer)?.referer || ''
      await Promise.all(
        subtitles.map(async (sub, i) => {
          if (!sub.file) return
          const text = await fetchSubtitle(sub.file, referer)
          if (text && !isCloudflareBlock(text)) {
            blobs[i] = URL.createObjectURL(new Blob([text], { type: 'text/vtt' }))
          }
        }),
      )

      if (cancelled) {
        Object.values(blobs).forEach((u) => URL.revokeObjectURL(u))
        return
      }

      subtitleBlobsRef.current = blobs
      setSubtitleSrc(blobs)
    }

    if (subtitles.length > 0) loadAll()

    return () => {
      cancelled = true
    }
  }, [subtitles, sources])

  useEffect(() => {
    return () => {
      Object.values(subtitleBlobsRef.current).forEach((u) => URL.revokeObjectURL(u))
      subtitleBlobsRef.current = {}
    }
  }, [])

  useEffect(() => {
    if (anilistId) {
      saveProgress(anilistId, epNum, title, image, episodeId)
    }
  }, [anilistId, epNum, episodeId, saveProgress, title, image])

  useEffect(() => {
    if (!anilistId || showSelector) return
    setEpisodesLoading(true)
    getAnimeEpisodes(anilistId, effectiveAudio === 'latam' || provider === 'animeflv' ? 'latam' : 'sub')
      .then((data) => {
        setEpisodesData(data)
        setEpisodesLoading(false)
      })
      .catch(() => setEpisodesLoading(false))
  }, [anilistId, effectiveAudio, provider, showSelector])

  const episodeList = episodesData ? episodesData.providerEpisodes || episodesData?.[provider]?.episodes?.[audio] || [] : []
  const sortedEps = [...episodeList].sort((a, b) => b.number - a.number)
  const currentEpIndex = sortedEps.findIndex((ep) => ep.number === epNum)
  const prevEp = currentEpIndex < sortedEps.length - 1 ? sortedEps[currentEpIndex + 1] : null
  const nextEp = currentEpIndex > 0 ? sortedEps[currentEpIndex - 1] : null

  const servers = getUniqueServers(sources)
  const currentServerSources = activeServer ? sources.filter((s) => (s.server || 'default') === activeServer) : sources

  function selectSubtitleTrack(trackIndex) {
    setActiveSubtitle(trackIndex)
    const video = videoRef.current
    if (!video) return
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = trackIndex >= 0 && i === trackIndex ? 'showing' : 'hidden'
    }
  }

  function selectSource(source) {
    setSelectedUrl(proxyUrl(source.url))
    setProxyFallbackUrl(getProxyUrl(source.url, source.referer))
  }

  async function handleDownload(quality) {
    if (!anilistId || !epNum) return
    const source = sources.find((s) => (s.quality || '').toLowerCase().includes(quality.toLowerCase())) || sources[0]
    if (!source) {
      toast('No hay fuente disponible para descargar', 'error')
      return
    }

    const id = `video-${anilistId}-ep${epNum}-${quality}`
    setDlStatus('downloading')
    setDlProgress({ current: 0, total: 1 })

    try {
      await downloadVideoEpisode({
        id,
        title: title || `Episodio ${epNum}`,
        image,
        episode: epNum,
        quality,
        m3u8Url: source.url,
        referer: source.referer || '',
        onProgress: (current, total) => setDlProgress({ current, total }),
      })
      setDlStatus('done')
      toast('Episodio descargado para ver offline', 'success', 4000)
    } catch (e) {
      setDlStatus('error')
      toast(`Error al descargar: ${e.message}`, 'error', 5000)
    }
  }

  useEffect(() => {
    if (!anilistId || !epNum) return
    const id = `video-${anilistId}-ep${epNum}-`
    isVideoCached(id).then((cached) => setIsCached(cached))
  }, [anilistId, epNum, sources])

  function toggleOfflinePlayback() {
    if (isCached) {
      setUseCachePlayback((v) => !v)
    }
  }

  function selectServer(server) {
    setActiveServer(server)
    const serverSources = sources.filter((s) => (s.server || 'default') === server)
    if (serverSources.length > 0) {
      setSelectedUrl(proxyUrl(serverSources[0].url))
      setProxyFallbackUrl(getProxyUrl(serverSources[0].url, serverSources[0].referer))
    }
  }

  const switchProvider = useCallback(
    (newProvider) => {
      if (!anilistId || !epNum) return
      const newAudio = newProvider === 'animeflv' ? 'latam' : audio
      const newId = `watch/${newProvider}/${anilistId}/${newAudio}/${newProvider}-${epNum}`
      navigate(`/watch/${newId}?anilistId=${anilistId}&ep=${epNum}&title=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}`)
    },
    [anilistId, epNum, navigate, audio, title, image],
  )

  function switchAudio(newAudio) {
    if (!anilistId || !epNum) return
    setSelectedLanguage(null)
    const newId = `watch/${provider}/${anilistId}/${newAudio}/${provider}-${epNum}`
    navigate(`/watch/${newId}?anilistId=${anilistId}&ep=${epNum}&title=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}`)
  }

  const goToEpisode = useCallback(
    (episode) => {
      if (!anilistId) return
      const newId = `watch/${provider}/${anilistId}/${audio}/${provider}-${episode.number}`
      navigate(
        `/watch/${newId}?anilistId=${anilistId}&ep=${episode.number}&title=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}`,
      )
    },
    [anilistId, provider, audio, navigate, title, image],
  )

  useEffect(() => {
    if (autoplayCountdown === null || !nextEp) return
    if (autoplayCountdown <= 0) {
      setAutoplayCountdown(null)
      goToEpisode(nextEp)
      return
    }
    const timer = setTimeout(() => setAutoplayCountdown(autoplayCountdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [autoplayCountdown, nextEp, goToEpisode])

  const onNextEpRef = useRef(null)
  onNextEpRef.current = nextEp ? () => goToEpisode(nextEp) : null
  useKeyboardShortcuts(videoRef, onNextEpRef, setPlaybackRate)

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

  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const pageTitle = title ? `Episodio ${epNum} de ${title}` : 'Reproducir'

  if (showSelector) {
    return (
      <LanguageSelector
        options={audioOptions}
        loading={detectingAudio}
        animeInfo={{ title, image, episode: epNum }}
        onSkip={() => {
          setSelectedLanguage('sub')
          setShowSelector(false)
        }}
        onSelect={(lang) => {
          setSelectedLanguage(lang)
          setShowSelector(false)
        }}
      />
    )
  }

  return (
    <>
      <SeoHead title={pageTitle} image={image} url={`/watch?anilistId=${anilistId}&ep=${epNum}`} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Link
            to={`/anime/${anilistId}`}
            className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors shrink-0 group">
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
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
                    className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-text-secondary hover:text-text-primary transition-colors border border-white/5">
                    ← Ep. {prevEp.number}
                  </button>
                ) : (
                  <div className="px-3 py-1.5 text-xs text-text-secondary/40">← Ep. —</div>
                )}

                <button
                  onClick={() => setShowEpisodes((v) => !v)}
                  aria-label="Lista de episodios"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    showEpisodes
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
                  }`}>
                  Ep. {epNum} {showEpisodes ? '↑' : '↓'}
                </button>

                {nextEp ? (
                  <button
                    onClick={() => goToEpisode(nextEp)}
                    aria-label={`Siguiente episodio: ${nextEp.number}`}
                    className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-text-secondary hover:text-text-primary transition-colors border border-white/5">
                    Ep. {nextEp.number} →
                  </button>
                ) : (
                  <div className="px-3 py-1.5 text-xs text-text-secondary/40">Ep. — →</div>
                )}
              </div>

              {showEpisodes && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="w-full">
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5 max-h-48 overflow-y-auto p-2 rounded-xl bg-surface/50 border border-white/5">
                    {sortedEps.map((ep) => (
                      <button
                        key={ep.number}
                        onClick={() => {
                          goToEpisode(ep)
                          setShowEpisodes(false)
                        }}
                        aria-label={`Episodio ${ep.number}${ep.title ? `: ${ep.title}` : ''}`}
                        className={`aspect-square rounded-lg text-xs font-medium transition-colors border flex items-center justify-center ${
                          ep.number === epNum
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-primary/30 hover:bg-surface-hover'
                        }`}>
                        {ep.number}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl overflow-hidden border border-white/10 p-0.5 bg-surface">
              {[
                ['sub', 'SUB'],
                ['dub', 'DUB'],
                ['latam', 'LATAM'],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => switchAudio(val)}
                  className={`relative px-2.5 py-1.5 text-xs font-medium transition-colors rounded-lg ${
                    audio === val
                      ? 'text-white'
                      : audio === 'latam' && val === 'dub' && audioType === 'latam'
                        ? 'text-accent/60'
                        : 'text-text-secondary hover:text-text-primary'
                  }`}>
                  {audio === val && <motion.span layoutId="audio-watch-tab" className="absolute inset-0 bg-primary rounded-lg" />}
                  <span className="relative z-10">{label}</span>
                </button>
              ))}
            </div>
            {providerUsed && (
              <span className="text-[10px] font-mono text-text-secondary/50 bg-surface-hover px-2 py-1 rounded-md border border-white/5">
                {getProviderLabel(providerUsed)}
                <span className="text-text-secondary/30 ml-1">· {BACKEND_NAMES[backendUsed] || backendUsed}</span>
              </span>
            )}
          </div>

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
                    }`}>
                    {activeSubtitle === i && <motion.span layoutId="sub-watch" className="absolute inset-0 bg-neon-cyan rounded-lg" />}
                    <span className="relative z-10">{subtitleLangLabel(sub)}</span>
                  </button>
                ))}
                <button
                  onClick={() => selectSubtitleTrack(-1)}
                  className={`relative px-2 py-1.5 text-[10px] font-medium transition-colors rounded-lg ${
                    activeSubtitle < 0 ? 'text-text-secondary/50' : 'text-text-secondary hover:text-text-primary'
                  }`}>
                  {activeSubtitle < 0 && <motion.span layoutId="sub-watch" className="absolute inset-0 bg-surface-hover rounded-lg" />}
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
              Sirviendo vía <span className="text-primary font-medium">{providerDisplayName(providerUsed)}</span> (
              {BACKEND_NAMES[backendUsed] || backendUsed})
            </p>
          </div>
        )}
        {audioType === 'latam' && <p className="text-[10px] text-accent mb-2 text-center font-medium">Audio Latino detectado</p>}

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
              }`}>
              {name}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
          <span className="text-[10px] text-text-secondary/50 shrink-0 self-center font-mono mr-1">Miruro</span>
          {Object.entries(MIRURO_NAMES).map(([p, name]) => (
            <button
              key={`miruro-${p}`}
              onClick={() => switchProvider(`miruro-${p}`)}
              disabled={loading}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                provider === `miruro-${p}`
                  ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30'
                  : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
              }`}>
              {name}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
          <span className="text-[10px] text-text-secondary/50 shrink-0 self-center font-mono mr-1">Backends</span>
          <button
            onClick={() => switchProvider('kenjitsu')}
            disabled={loading}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              provider === 'kenjitsu'
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
            }`}>
            Kenjitsu
          </button>
        </div>
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          <span className="text-[10px] text-text-secondary/50 shrink-0 self-center font-mono mr-1">LATAM</span>
          <button
            onClick={() => switchProvider('animeflv')}
            disabled={loading}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              provider === 'animeflv'
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
            }`}>
            AnimeFLV
          </button>
          <div className="ml-auto">
            <WatchParty
              participants={party.participants}
              connected={party.connected}
              partyId={party.partyId}
              onJoin={party.join}
              onLeave={party.leave}
              videoRef={videoRef}
            />
          </div>
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
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <p className="text-text-secondary text-sm text-center max-w-xs">{error}</p>
              {providerErrors.length > 0 && (
                <details className="text-[10px] text-text-secondary/60 max-w-xs text-center">
                  <summary className="cursor-pointer hover:text-text-secondary transition-colors">
                    Detalles de errores ({providerErrors.length})
                  </summary>
                  <ul className="mt-1 space-y-0.5">
                    {providerErrors.map((e, i) => (
                      <li key={i}>
                        {providerDisplayName(e.provider)} ({e.backend}): {e.message}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="flex flex-wrap gap-2 mt-1">
                <Link
                  to="/"
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-medium transition-colors">
                  Volver al inicio
                </Link>
                <button
                  onClick={() => switchProvider(provider === 'anikoto' ? 'reanime' : 'anikoto')}
                  className="px-5 py-2.5 bg-surface text-text-secondary rounded-xl text-sm border border-white/10 hover:bg-surface-hover transition-colors">
                  Intentar otro proveedor
                </button>
              </div>
            </div>
          ) : null}

          {error && (
            <CommunityEpisodes
              anilistId={anilistId}
              episodeNumber={epNum}
              title={title}
              image={image}
              embedMode
              onSelectUrl={(url, provider) => {
                if (url.includes('.mp4') || url.includes('.m3u8')) {
                  setSelectedUrl(proxyUrl(url))
                  setProxyFallbackUrl(getProxyUrl(url))
                  setError(null)
                  toast(`Reproduciendo desde ${getProviderLabel(provider)}`, 'success', 3000)
                }
              }}
            />
          )}

          {!loading && !error && isIframeSource && (
            <EmbedPlayer
              embeds={sources.map((s) => ({ url: s.url, name: s.quality }))}
              onBack={() => {
                selectedUrl && setIsIframeSource(false)
              }}
            />
          )}

          {autoplayCountdown !== null && nextEp && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 gap-4">
              <p className="text-lg font-medium text-white">Siguiente episodio en {autoplayCountdown}s</p>
              <p className="text-sm text-text-secondary">Episodio {nextEp.number}</p>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => {
                    setAutoplayCountdown(null)
                    goToEpisode(nextEp)
                  }}
                  className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors">
                  Reproducir ahora
                </button>
                <button
                  onClick={() => setAutoplayCountdown(null)}
                  className="px-5 py-2 bg-surface text-text-secondary rounded-xl text-sm border border-white/10 hover:bg-surface-hover transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!loading && !error && !isIframeSource && (
            <video
              ref={videoRef}
              controls
              autoPlay
              className="w-full h-full"
              playsInline
              crossOrigin="anonymous"
              preload="metadata"
              playbackRate={playbackRate}
              onPlay={() => party.broadcast('play', videoRef.current?.currentTime || 0)}
              onPause={() => party.broadcast('pause', videoRef.current?.currentTime || 0)}
              onSeeked={() => party.broadcast('seek', videoRef.current?.currentTime || 0)}
              onTimeUpdate={() => {
                const v = videoRef.current
                if (v) setTimeDisplay({ current: v.currentTime, duration: v.duration || 0 })
              }}
              onLoadedMetadata={() => {
                const v = videoRef.current
                if (v) {
                  v.playbackRate = playbackRate
                  setTimeDisplay({ current: v.currentTime, duration: v.duration || 0 })
                }
              }}
              onEnded={() => {
                if (nextEp) {
                  setAutoplayCountdown(5)
                }
              }}
              onError={() => {
                if (selectedUrl) {
                  toast('Error al reproducir el video. Intenta con otro proveedor.', 'error', 5000)
                }
              }}>
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
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-text-secondary/50 justify-between">
              <div className="flex flex-wrap gap-3">
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">Space</kbd> Play/Pause
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">←/→</kbd> 10s
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">↑/↓</kbd> Volumen
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">F</kbd> Pantalla completa
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">M</kbd> Silenciar
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">N</kbd> Siguiente ep.
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">Shift+&lt;/&gt;</kbd> Velocidad
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-text-secondary/70">
                  {formatTime(timeDisplay.current)} / {formatTime(timeDisplay.duration)}
                </span>
                <button
                  onClick={() => {
                    const v = videoRef.current
                    if (!v) return
                    if (document.pictureInPictureElement) {
                      document.exitPictureInPicture()
                    } else {
                      v.requestPictureInPicture()
                    }
                  }}
                  className="px-2 py-1 rounded bg-surface border border-white/10 hover:bg-surface-hover transition-colors"
                  title="Picture-in-Picture">
                  PiP
                </button>
                <div className="flex items-center gap-1">
                  {[0.5, 1, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        setPlaybackRate(rate)
                        const v = videoRef.current
                        if (v) v.playbackRate = rate
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-colors border ${
                        playbackRate === rate
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-surface border-white/10 text-text-secondary/50 hover:text-text-primary hover:border-white/20'
                      }`}>
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
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
                      }`}>
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
                  {[...currentServerSources]
                    .sort((a, b) => {
                      const order = ['4K', '1080p', '720p', '480p', '360p', 'auto']
                      const ai = order.findIndex((o) => (a.quality || '').toLowerCase().includes(o))
                      const bi = order.findIndex((o) => (b.quality || '').toLowerCase().includes(o))
                      return (ai >= 0 ? ai : 99) - (bi >= 0 ? bi : 99)
                    })
                    .map((s, i) => (
                      <button
                        key={i}
                        onClick={() => selectSource(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          selectedUrl?.includes(encodeURIComponent(s.url))
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
                        }`}>
                        {s.quality || s.server || `Fuente ${i + 1}`}
                      </button>
                    ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {isCached && (
                <button
                  onClick={toggleOfflinePlayback}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex items-center gap-1.5 ${
                    useCachePlayback
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary'
                  }`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                    />
                  </svg>
                  {useCachePlayback ? 'Offline activado' : 'Offline'}
                </button>
              )}
              {dlStatus === 'idle' && currentServerSources.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-text-secondary font-medium">Descargar:</span>
                  <div className="flex gap-1">
                    {[...new Set(currentServerSources.map((s) => s.quality || 'auto'))].slice(0, 3).map((q) => (
                      <button
                        key={q}
                        onClick={() => handleDownload(q)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border bg-surface text-text-secondary border-white/10 hover:text-primary hover:border-primary/30 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {dlStatus === 'downloading' && dlProgress && (
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface border border-primary/20">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <div className="flex-1 min-w-[120px]">
                    <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${(dlProgress.current / dlProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-text-secondary font-mono shrink-0">
                    {dlProgress.current}/{dlProgress.total}
                  </span>
                </div>
              )}
              {dlStatus === 'done' && (
                <span className="text-[10px] text-green-400 font-medium flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Descargado
                </span>
              )}
              {dlStatus === 'error' && <span className="text-[10px] text-red-400 font-medium">Error al descargar</span>}
            </div>

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
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover transition-all text-xs border border-transparent hover:border-primary/20 group">
                      <span className="text-primary font-medium group-hover:text-primary-hover transition-colors">
                        {d.server || d.quality || 'Servidor ' + (i + 1)}
                      </span>
                      {d.size && <span className="text-text-secondary">{formatSize(d.size)}</span>}
                      {d.audio && <span className="text-text-secondary/60">{d.audio}</span>}
                      <span className="ml-auto text-neon-cyan flex items-center gap-1 group-hover:gap-2 transition-all">
                        Descargar{' '}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {nextEpisode && (
              <div className="flex items-center justify-center gap-2 text-xs text-text-secondary/60">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                Próximo episodio: <span className="text-text-primary font-medium">{formatDate(nextEpisode.airingAt)}</span> (Ep.{' '}
                {nextEpisode.episode})
              </div>
            )}
          </div>
        )}

        {!loading && !error && anilistId && epNum && (
          <CommunityEpisodes
            anilistId={anilistId}
            episodeNumber={epNum}
            title={title}
            image={image}
            onSelectUrl={(url, provider) => {
              if (url.includes('.mp4') || url.includes('.m3u8')) {
                setSelectedUrl(proxyUrl(url))
                setProxyFallbackUrl(getProxyUrl(url))
                toast(`Reproduciendo desde ${getProviderLabel(provider)}`, 'success', 3000)
              } else {
                window.open(url, '_blank', 'noopener')
              }
            }}
          />
        )}

        <CommentSection anilistId={anilistId} episodeNumber={epNum} />
      </motion.div>
    </>
  )
}
