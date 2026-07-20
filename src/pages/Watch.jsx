import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { parseEpisodeId } from '../lib/anivexa'
import { getAnimeEpisodes, getWatchWithFallback } from '../lib/api'
import { PROVIDER_LABELS, AUTO_FALLBACK_ORDER } from '../lib/providers/registry'
import { useI18n } from '../hooks/useI18n'

import { getAnimeInfo } from '../lib/anilist'
import { useHistory } from '../hooks/useHistory'
import { useToast } from '../components/Toast'
import CommunityEpisodes from '../components/CommunityEpisodes'
import EmbedPlayer from '../components/EmbedPlayer'
import { SubtitleOverlay } from '../components/SubtitleOverlay'
import WatchParty from '../components/WatchParty'
import EpisodeNav from '../components/EpisodeNav'
import { useWatchParty } from '../hooks/useWatchParty'
import CommentSection from '../components/CommentSection'
import { getProviderLabel } from '../hooks/useCommunityEpisodes'
import SeoHead from '../components/SeoHead'
import { subtitleLangLabel, isCloudflareBlock, isSpanishSub } from '../utils/subtitles'
import { fetchSubtitle } from '../utils/proxy'
import { downloadVideoEpisode, isVideoCached } from '../utils/videoDownload'
import { formatSize } from '../utils/downloads'
import { VideoCacheLoader } from '../utils/videoCacheLoader'
import LanguageSelector from '../components/LanguageSelector'
import { detectAudioOptions } from '../utils/detectAudio'
import { getSubtitlePrefs } from '../utils/subtitlePreferences'
import ShareButton from '../components/ShareButton'
import Breadcrumbs from '../components/Breadcrumbs'
import { useGamification } from '../hooks/useGamification'
import { XP_VALUES } from '../lib/achievements'
import { getToken } from '../lib/auth'

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

const PROVIDER_NAMES = { ...PROVIDER_LABELS }

Object.assign(PROVIDER_NAMES, {
  anivexa: 'Anivexa',
  veranime: 'VerAnime',
})

const BACKEND_NAMES = {
  anivexa: 'Anivexa',
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
  const { t, locale, localeNames } = useI18n()
  const { addXp } = useGamification()
  const awardedEpRef = useRef(new Set())

  const [sources, setSources] = useState([])
  const [subtitles, setSubtitles] = useState([])
  const [downloads, setDownloads] = useState([])
  const [selectedUrl, setSelectedUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [providerErrors, setProviderErrors] = useState([])
  const [episodesData, setEpisodesData] = useState(null)
  const [, setEpisodesLoading] = useState(false)
  const [activeSubtitle, setActiveSubtitle] = useState(-1)
  const [subtitleSrc, setSubtitleSrc] = useState([])
  const subtitleBlobsRef = useRef([])
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

  const [translatedSub, setTranslatedSub] = useState(null)
  const [translating, setTranslating] = useState(false)
  const [translateProgress, setTranslateProgress] = useState(null)
  const [showSelector, setShowSelector] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState(null)
  const [audioOptions, setAudioOptions] = useState(null)
  const [detectingAudio, setDetectingAudio] = useState(true)
  const audioFallbackRef = useRef(null)
  const prefsLoadedRef = useRef(false)

  const parsed = parseEpisodeId(episodeId)
  const anilistId = parsed?.anilistId || searchParams.get('anilistId')
  const epNum = parsed?.epNum || parseInt(searchParams.get('ep'), 10)
  const provider = parsed?.provider || searchParams.get('provider') || 'anikoto'
  const audio = parsed?.audio || 'sub'

  const effectiveAudio = selectedLanguage || audio

  async function syncLangPrefsFromAPI() {
    try {
      const token = await getToken()
      if (!token) return null
      const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return null
      const { data } = await res.json()
      if (data?.preferred_audio) localStorage.setItem('preferred_audio', data.preferred_audio)
      if (data?.preferred_subtitle_lang) localStorage.setItem('preferred_subtitle_lang', data.preferred_subtitle_lang)
      return { preferred_audio: data?.preferred_audio, preferred_subtitle_lang: data?.preferred_subtitle_lang }
    } catch {
      return null
    }
  }

  async function saveLangPrefToAPI(type, value) {
    try {
      const token = await getToken()
      if (!token) return
      const body = type === 'audio' ? { preferred_audio: value } : { preferred_subtitle_lang: value }
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
    } catch {
      /* silent */
    }
  }

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
    setSelectedLanguage(null)
    setAudioOptions(null)
    setDetectingAudio(true)
    prefsLoadedRef.current = false
    const saved = localStorage.getItem('preferred_audio')
    if (saved) {
      setShowSelector(false)
    } else {
      setShowSelector(true)
    }
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

    detectAudioOptions(anilistId, t)
      .then((options) => {
        if (!cancelled) {
          setAudioOptions(options)
          setDetectingAudio(false)
          const saved = localStorage.getItem('preferred_audio')
          if (saved && options[saved]?.available) {
            setSelectedLanguage(saved)
            setShowSelector(false)
          }
          if (!prefsLoadedRef.current) {
            prefsLoadedRef.current = true
            syncLangPrefsFromAPI().then((prefs) => {
              if (prefs && !cancelled) {
                if (prefs.preferred_audio && options[prefs.preferred_audio]?.available) {
                  setSelectedLanguage(prefs.preferred_audio)
                  setShowSelector(false)
                }
                if (prefs.preferred_subtitle_lang) {
                  localStorage.setItem('preferred_subtitle_lang', prefs.preferred_subtitle_lang)
                }
              }
            })
          }
        }
      })
      .catch(() => {
        if (!cancelled) setDetectingAudio(false)
      })
    return () => {
      cancelled = true
      clearTimeout(audioFallbackRef.current)
    }
  }, [anilistId, epNum, title, t])

  const [proxyFallbackUrl, setProxyFallbackUrl] = useState(null)

  useHls(videoRef, selectedUrl, useCachePlayback, proxyFallbackUrl)

  useEffect(() => {
    const v = videoRef.current
    if (v) v.playbackRate = playbackRate
  }, [playbackRate, videoRef])

  useEffect(() => {
    if (showSelector || !anilistId || !epNum) {
      if (!anilistId || !epNum) {
        setError(t('watch.error.missingInfo'))
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
    setTranslatedSub((prev) => {
      if (prev?.blob) URL.revokeObjectURL(prev.blob)
      return null
    })

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
        setError(t('video.error'))
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
  }, [anilistId, provider, epNum, effectiveAudio, showSelector, selectedLanguage, audio, t])

  useEffect(() => {
    if (subtitles.length === 0) {
      setActiveSubtitle(-1)
      return
    }
    const savedLang = localStorage.getItem('preferred_subtitle_lang')
    let preferred = 0
    if (savedLang) {
      const idx = subtitles.findIndex((s) => (s.language || s.lang || s.srclang || '').toLowerCase().startsWith(savedLang.toLowerCase()))
      if (idx >= 0) preferred = idx
    }
    const esIndex = subtitles.findIndex(isSpanishSub)
    if (preferred === 0 && esIndex >= 0) preferred = esIndex
    setActiveSubtitle(preferred)
    if (esIndex < 0 && preferred === 0) {
      toast(t('audio.noSpanishSubs', { lang: subtitleLangLabel(subtitles[preferred]).toLowerCase() }), 'info', 4000)
    }
  }, [subtitles, toast, audioType, t])

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

    subtitleBlobsRef.current.forEach((u) => u && URL.revokeObjectURL(u))
    subtitleBlobsRef.current = []
    setSubtitleSrc([])
    setTranslatedSub((prev) => {
      if (prev?.blob) URL.revokeObjectURL(prev.blob)
      return null
    })

    async function loadAll() {
      const blobs = []
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
        blobs.forEach((u) => u && URL.revokeObjectURL(u))
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
      subtitleBlobsRef.current.forEach((u) => u && URL.revokeObjectURL(u))
      subtitleBlobsRef.current = []
      setTranslatedSub((prev) => {
        if (prev?.blob) URL.revokeObjectURL(prev.blob)
        return null
      })
    }
  }, [])

  useEffect(() => {
    if (!anilistId) return
    saveProgress(anilistId, epNum, title, image, episodeId, 0, 0)
    if (episodeId && !awardedEpRef.current.has(episodeId)) {
      awardedEpRef.current.add(episodeId)
      addXp(XP_VALUES.WATCH_EPISODE, 'episode')
    }

    const interval = setInterval(() => {
      const v = videoRef.current
      if (v && v.currentTime > 10) {
        saveProgress(anilistId, epNum, title, image, episodeId, v.currentTime, v.duration || 0)
      }
    }, 15000)

    const vCleanup = videoRef.current
    return () => {
      clearInterval(interval)
      if (vCleanup && vCleanup.currentTime > 10) {
        saveProgress(anilistId, epNum, title, image, episodeId, vCleanup.currentTime, vCleanup.duration || 0)
      }
    }
  }, [anilistId, epNum, episodeId, saveProgress, title, image, addXp])

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

  const episodeList = episodesData?.providerEpisodes || []
  const sortedEps = [...episodeList].sort((a, b) => b.number - a.number)
  const currentEpIndex = sortedEps.findIndex((ep) => ep.number === epNum)
  const prevEp = currentEpIndex < sortedEps.length - 1 ? sortedEps[currentEpIndex + 1] : null
  const nextEp = currentEpIndex > 0 ? sortedEps[currentEpIndex - 1] : null

  const servers = getUniqueServers(sources)
  const currentServerSources = activeServer ? sources.filter((s) => (s.server || 'default') === activeServer) : sources

  function selectSubtitleTrack(trackIndex) {
    setActiveSubtitle(trackIndex)
    const sub = subtitles[trackIndex]
    if (sub) {
      const lang = sub.language || sub.lang || sub.srclang || ''
      if (lang) {
        localStorage.setItem('preferred_subtitle_lang', lang)
        saveLangPrefToAPI('subtitle', lang)
      }
    }
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
      toast(t('watch.download.noSource'), 'error')
      return
    }

    const id = `video-${anilistId}-ep${epNum}-${quality}`
    setDlStatus('downloading')
    setDlProgress({ current: 0, total: 1 })

    try {
      await downloadVideoEpisode({
        id,
        title: title || t('episode.number', { n: epNum }),
        image,
        episode: epNum,
        quality,
        m3u8Url: source.url,
        referer: source.referer || '',
        onProgress: (current, total) => setDlProgress({ current, total }),
      })
      setDlStatus('done')
      toast(t('video.episodeDownloaded'), 'success', 4000)
    } catch (e) {
      setDlStatus('error')
      toast(t('watch.download.error', { message: e.message }), 'error', 5000)
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

  const handleAutoTranslate = useCallback(async () => {
    const engIdx = subtitles.findIndex(
      (s) => (s.language || '').toLowerCase() === 'en' || (s.label || '').toLowerCase().includes('english'),
    )
    if (engIdx < 0 || !subtitles[engIdx]?.file) return

    if (import.meta.env.DEV) {
      toast(t('video.translationUnavailableDev'), 'info', 5000)
      return
    }

    const LANG_MAP = { es: 'spanish', pt: 'portuguese' }
    const targetLang = LANG_MAP[locale] || 'spanish'
    const displayName = localeNames[locale] || 'Español'

    setTranslating(true)
    setTranslateProgress({ current: 0, total: 0 })
    try {
      const url = subtitles[engIdx].file
      const referer = sources.find((s) => s.referer)?.referer || ''
      const params = new URLSearchParams({ url, referer, from: 'english', to: targetLang })
      const res = await fetch(`/api/translate-subtitles?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Translation failed' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const blob = URL.createObjectURL(new Blob([await res.text()], { type: 'text/vtt' }))
      setTranslatedSub({ blob, label: `${displayName} (AI)`, language: locale })
      setActiveSubtitle(subtitles.length)
      setTranslateProgress(null)
      toast(t('video.translationLabel', { lang: displayName }), 'success', 3000)
    } catch (e) {
      setTranslateProgress(null)
      toast(t('video.translationError', { message: e.message }), 'error', 5000)
    } finally {
      setTranslating(false)
    }
  }, [subtitles, sources, toast, locale, localeNames, t])

  const hasNativeSub =
    locale === 'es' ? subtitles.some(isSpanishSub) : subtitles.some((s) => (s.language || '').toLowerCase().startsWith(locale))
  const englishSubIdx = subtitles.findIndex(
    (s) => (s.language || '').toLowerCase() === 'en' || (s.label || '').toLowerCase().includes('english'),
  )

  const switchProvider = useCallback(
    (newProvider, isFallback = false) => {
      if (!anilistId || !epNum) return
      const newAudio = newProvider === 'animeflv' ? 'latam' : audio
      const newId = `watch/${newProvider}/${anilistId}/${newAudio}/${newProvider}-${epNum}`
      let path = `/watch/${newId}?anilistId=${anilistId}&ep=${epNum}&title=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}`
      if (isFallback) path += '&autoFallback=1'
      navigate(path)
    },
    [anilistId, epNum, navigate, audio, title, image],
  )

  function switchAudio(newAudio) {
    if (!anilistId || !epNum) return
    setSelectedLanguage(null)
    localStorage.setItem('preferred_audio', newAudio)
    saveLangPrefToAPI('audio', newAudio)
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

  function formatDate(timestamp) {
    if (!timestamp) return ''
    const d = new Date(timestamp * 1000)
    return d.toLocaleDateString(navigator.language || 'es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const pageTitle = title ? t('watch.title', { epNum, title }) : t('anime.watch')

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
          localStorage.setItem('preferred_audio', lang)
          saveLangPrefToAPI('audio', lang)
        }}
      />
    )
  }

  return (
    <>
      <SeoHead title={pageTitle} image={image} url={`/watch?anilistId=${anilistId}&ep=${epNum}`} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Breadcrumbs
            items={[
              { label: t('nav.home'), href: '/' },
              { label: t('anime.detail.breadcrumbs'), href: '/directorio' },
              { label: title || '...', href: `/anime/${anilistId}` },
              { label: t('episode.number', { n: epNum }) },
            ]}
          />

          <ShareButton title={title} className="shrink-0" />

          <div className="flex-1" />

          <EpisodeNav
            sortedEps={sortedEps}
            goToEpisode={goToEpisode}
            prevEp={prevEp}
            nextEp={nextEp}
            epNum={epNum}
            showEpisodes={showEpisodes}
            setShowEpisodes={setShowEpisodes}
          />

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
                {translatedSub && (
                  <button
                    onClick={() => setActiveSubtitle(subtitles.length)}
                    className={`relative px-2 py-1.5 text-[10px] font-medium transition-colors rounded-lg ${
                      activeSubtitle === subtitles.length ? 'text-white' : 'text-text-secondary hover:text-text-primary'
                    }`}>
                    {activeSubtitle === subtitles.length && (
                      <motion.span layoutId="sub-watch" className="absolute inset-0 bg-neon-cyan rounded-lg" />
                    )}
                    <span className="relative z-10">{translatedSub.label}</span>
                  </button>
                )}
                <button
                  onClick={() => selectSubtitleTrack(-1)}
                  className={`relative px-2 py-1.5 text-[10px] font-medium transition-colors rounded-lg ${
                    activeSubtitle < 0 ? 'text-text-secondary/50' : 'text-text-secondary hover:text-text-primary'
                  }`}>
                  {activeSubtitle < 0 && <motion.span layoutId="sub-watch" className="absolute inset-0 bg-surface-hover rounded-lg" />}
                  <span className="relative z-10">{t('video.off')}</span>
                </button>
              </div>
              {!hasNativeSub && englishSubIdx >= 0 && !translatedSub && (
                <button
                  onClick={handleAutoTranslate}
                  disabled={translating}
                  className="px-2 py-1.5 rounded-lg text-[10px] font-medium bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/20 transition-colors flex items-center gap-1 disabled:opacity-50">
                  {translating ? (
                    <>
                      <span className="w-3 h-3 border border-neon-cyan border-t-transparent rounded-full animate-cosmic-spin" />
                      {translateProgress
                        ? t('video.downloadingProgress', { current: translateProgress.current, total: translateProgress.total })
                        : t('video.translating')}
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5h12M9 3v2m0 4a7 7 0 016.392 4.042M14 17l3 3m0 0l3-3m-3 3v-6"
                        />
                      </svg>{' '}
                      {t('video.autoTranslate', { lang: localeNames[locale] })}
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {providerUsed && providerUsed !== provider && (
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] text-text-secondary">
              {t('video.servingVia')} <span className="text-primary font-medium">{providerDisplayName(providerUsed)}</span> (
              {BACKEND_NAMES[backendUsed] || backendUsed})
            </p>
          </div>
        )}
        {audioType === 'latam' && <p className="text-[10px] text-accent mb-2 text-center font-medium">{t('video.latamDetected')}</p>}

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
          <span className="text-[10px] text-text-secondary/50 shrink-0 self-center font-mono mr-1">Backup</span>
          <button
            onClick={() => switchProvider('jkanime')}
            disabled={loading}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              provider === 'jkanime'
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
            }`}>
            JKanime
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
              amHost={party.amHost}
              hostId={party.hostId}
              messages={party.messages}
              onSendMessage={party.sendMessage}
              onSendReaction={party.sendReaction}
              onReSync={() => {
                if (videoRef.current && videoRef.current.currentTime !== undefined) {
                  videoRef.current.currentTime += 0.01
                }
              }}
              onRequestHost={party.requestHost}
            />
          </div>
        </div>

        <div className="relative bg-black rounded-2xl overflow-hidden aspect-video shadow-2xl shadow-black/50 ring-1 ring-white/5">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface gap-3">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 border-2 border-primary/30 rounded-full" />
                <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-cosmic-spin" />
              </div>
              <p className="text-xs text-text-secondary">{t('video.loading')}</p>
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
                    {t('watch.errorDetails', { count: providerErrors.length })}
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
                  {t('errors.goHome')}
                </Link>
                <button
                  onClick={() => switchProvider(provider === 'anikoto' ? 'reanime' : 'anikoto')}
                  className="px-5 py-2.5 bg-surface text-text-secondary rounded-xl text-sm border border-white/10 hover:bg-surface-hover transition-colors">
                  {t('video.retry')}
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
                  toast(t('watch.playingFrom', { provider: getProviderLabel(provider) }), 'success', 3000)
                }
              }}
            />
          )}

          {!loading && !error && isIframeSource && (
            <EmbedPlayer
              embeds={sources.map((s) => ({ url: s.url, name: s.quality }))}
              subtitles={subtitles}
              subtitleSources={subtitleSrc}
              activeSubtitle={activeSubtitle}
              onSubtitleChange={setActiveSubtitle}
              onBack={() => {
                selectedUrl && setIsIframeSource(false)
              }}
            />
          )}

          {autoplayCountdown !== null && nextEp && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 gap-4">
              <p className="text-lg font-medium text-white">{t('anime.autoplay.nextIn', { s: autoplayCountdown })}</p>
              <p className="text-sm text-text-secondary">{t('episode.number', { n: nextEp.number })}</p>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => {
                    setAutoplayCountdown(null)
                    goToEpisode(nextEp)
                  }}
                  className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors">
                  {t('anime.autoplay.playNow')}
                </button>
                <button
                  onClick={() => setAutoplayCountdown(null)}
                  className="px-5 py-2 bg-surface text-text-secondary rounded-xl text-sm border border-white/10 hover:bg-surface-hover transition-colors">
                  {t('anime.autoplay.cancel')}
                </button>
              </div>
            </div>
          )}

          {!loading && !error && !isIframeSource && (
            <div className="relative w-full h-full">
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
                  if (!selectedUrl) return
                  if (!searchParams.get('autoFallback')) {
                    const idx = AUTO_FALLBACK_ORDER.indexOf(provider)
                    const nextProvider = idx >= 0 && idx < AUTO_FALLBACK_ORDER.length - 1 ? AUTO_FALLBACK_ORDER[idx + 1] : null
                    if (nextProvider) {
                      toast(t('video.switchingServer'), 'info', 3000)
                      switchProvider(nextProvider, true)
                      return
                    }
                  }
                  toast(t('video.errorShort'), 'error', 5000)
                }}
              />
              {subtitles.length > 0 &&
                activeSubtitle >= 0 &&
                (() => {
                  const prefs = getSubtitlePrefs()
                  const subProps = { ...prefs, currentTime: timeDisplay.current }
                  return activeSubtitle < subtitles.length && subtitleSrc[activeSubtitle] ? (
                    <SubtitleOverlay subtitleUrl={subtitleSrc[activeSubtitle]} {...subProps} />
                  ) : translatedSub && activeSubtitle === subtitles.length ? (
                    <SubtitleOverlay subtitleUrl={translatedSub.blob} {...subProps} />
                  ) : null
                })()}
            </div>
          )}
        </div>

        {!loading && !error && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-text-secondary/50 justify-between">
              <div className="flex flex-wrap gap-3">
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">Space</kbd> {t('video.player.playPause')}
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">←/→</kbd> {t('video.player.seekBack')}
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">↑/↓</kbd> {t('video.player.volume')}
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">F</kbd> {t('video.player.fullscreen')}
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">M</kbd> {t('video.player.mute')}
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">N</kbd> {t('video.player.nextEpisode')}
                </span>
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-surface border border-white/10 font-mono">Shift+&lt;/&gt;</kbd>{' '}
                  {t('video.player.speedLabel')}
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
                  title={t('video.player.pip')}>
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
                <span className="text-xs text-text-secondary font-medium">{t('video.serverLabel')}</span>
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
                <span className="text-xs text-text-secondary font-medium">{t('video.quality')}:</span>
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
                        {s.quality || s.server || t('video.source', { n: i + 1 })}
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
                  {useCachePlayback ? t('video.offlineActive') : t('video.offline')}
                </button>
              )}
              {dlStatus === 'idle' && currentServerSources.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-text-secondary font-medium">{t('video.download')}:</span>
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
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-cosmic-spin" />
                  <div className="flex-1 min-w-[120px]">
                    <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${(dlProgress.current / dlProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-text-secondary font-mono shrink-0">
                    {t('video.downloadingProgress', { current: dlProgress.current, total: dlProgress.total })}
                  </span>
                </div>
              )}
              {dlStatus === 'done' && (
                <span className="text-[10px] text-green-400 font-medium flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('video.downloaded')}
                </span>
              )}
              {dlStatus === 'error' && <span className="text-[10px] text-red-400 font-medium">{t('video.downloadError')}</span>}
            </div>

            {downloads.length > 0 && (
              <div className="p-4 rounded-2xl bg-surface/50 border border-white/5">
                <p className="text-xs font-medium text-text-secondary mb-2">{t('watch.downloads')}</p>
                <div className="space-y-1.5">
                  {downloads.map((d, i) => (
                    <a
                      key={i}
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover transition-all text-xs border border-transparent hover:border-primary/20 group">
                      <span className="text-primary font-medium group-hover:text-primary-hover transition-colors">
                        {d.server || d.quality || t('watch.downloadItem', { n: i + 1 })}
                      </span>
                      {d.size && <span className="text-text-secondary">{formatSize(d.size)}</span>}
                      {d.audio && <span className="text-text-secondary/60">{d.audio}</span>}
                      <span className="ml-auto text-neon-cyan flex items-center gap-1 group-hover:gap-2 transition-all">
                        {t('watch.downloadAction')}{' '}
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
                {t('watch.nextEpisodeAiring', { date: formatDate(nextEpisode.airingAt), episode: nextEpisode.episode })}
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
                toast(t('watch.playingFrom', { provider: getProviderLabel(provider) }), 'success', 3000)
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
