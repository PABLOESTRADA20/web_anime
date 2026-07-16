import { useState, useRef, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { SubtitleOverlay } from './SubtitleOverlay'
import { SubtitleSettings } from './SubtitleSettings'
import { subtitleLangLabel } from '../utils/subtitles'
import { getSubtitlePrefs } from '../utils/subtitlePreferences'

const EMBED_PROVIDERS = {
  streamtape: { pattern: /streamtape/i, embed: (url) => url.replace('/v/', '/e/').replace('/d/', '/e/') },
  yourupload: { pattern: /yourupload/i, embed: (url) => url.replace('/watch/', '/embed/') },
  doodstream: { pattern: /doodstream|d000d/i, embed: (url) => url.replace('/d/', '/e/') },
  okru: { pattern: /ok\.ru/i, embed: (url) => url.replace(/\/video\//, '/videoembed/') },
  sendvid: { pattern: /sendvid/i, embed: (url) => url.replace('/v/', '/embed/') },
  mp4upload: { pattern: /mp4upload/i, embed: (url) => url.replace('/video/', '/embed-') },
  gdrive: {
    pattern: /drive\.google/i,
    embed: (url) => {
      const id = url.match(/\/d\/([^/]+)/)?.[1] || url.match(/id=([^&]+)/)?.[1]
      return id ? `https://drive.google.com/file/d/${id}/preview` : url
    },
  },
  mega: {
    pattern: /mega\.nz/i,
    embed: (url) => `https://mega.nz/embed${url.split('#!')[1] ? '#' + url.split('#!')[1] : url.replace('https://mega.nz/', '/')}`,
  },
  mixdrop: { pattern: /mixdrop/i, embed: (url) => url.replace('/f/', '/e/').replace('mixdrop.to', 'mixdrop.co') },
  fembed: { pattern: /fembed|fcdn|femax20/i, embed: (url) => url.replace('/v/', '/api/source/') },
  streamsb: { pattern: /streamsb/i, embed: (url) => url },
  streamlare: { pattern: /streamlare/i, embed: (url) => url },
  allanime: { pattern: /allanime\.day/i, embed: () => null },
  voe: { pattern: /voe\.sx/i, embed: (url) => url },
  filemoon: { pattern: /filemoon\.sx/i, embed: (url) => url.replace('/d/', '/e/') },
  vidguard: { pattern: /vgfplay|vidguard/i, embed: (url) => url },
  jkanime: { pattern: /jkanime\.net\/jkplayer/i, embed: (url) => url },
}

function getEmbedUrl(url) {
  for (const p of Object.values(EMBED_PROVIDERS)) {
    if (p.pattern.test(url)) return p.embed(url)
  }
  return null
}

function getProviderName(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '')
    return host.split('.')[0] || host
  } catch {
    return 'Servidor'
  }
}

export default function EmbedPlayer({ embeds, onBack, subtitles = [], subtitleSources = [], activeSubtitle = -1, onSubtitleChange }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [iframeError, setIframeError] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [globalPrefs, setGlobalPrefs] = useState(getSubtitlePrefs)
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const updateTime = () => setCurrentTime(video.currentTime)
    video.addEventListener('timeupdate', updateTime)
    return () => video.removeEventListener('timeupdate', updateTime)
  }, [activeIndex])

  if (!embeds?.length) return null

  const active = embeds[activeIndex]
  const embedUrl = getEmbedUrl(active?.url)
  const isDirectVideo = active?.url?.match(/\.(mp4|webm|mkv|avi|mov)(\?|$)/i) || active?.type === 'direct'
  const isHls = active?.url?.includes('.m3u8')
  const isIframe = embedUrl && !isDirectVideo && !isHls

  function handleSettingsChange() {
    setGlobalPrefs(getSubtitlePrefs())
  }

  return (
    <div className={`${fullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
      <div
        className={`${fullscreen ? 'h-full w-full' : 'w-full'} bg-black rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/5`}>
        {iframeError || (!embedUrl && !isDirectVideo && !isHls) ? (
          <div className="aspect-video flex flex-col items-center justify-center bg-surface gap-4 p-6">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <p className="text-text-secondary text-sm text-center">Este enlace no es visible en el reproductor integrado.</p>
            <a
              href={active.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-accent hover:bg-accent/80 text-white rounded-xl text-sm font-medium transition-colors">
              Abrir en nueva pestaña
            </a>
            {onBack && (
              <button onClick={onBack} className="text-xs text-text-secondary/60 hover:text-text-secondary transition-colors">
                Volver al reproductor principal
              </button>
            )}
          </div>
        ) : isIframe ? (
          <iframe
            src={embedUrl}
            className="w-full aspect-video"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onError={() => setIframeError(true)}
          />
        ) : (
          <div className="relative w-full bg-black overflow-hidden">
            <video ref={videoRef} controls autoPlay playsInline className="w-full aspect-video" key={active.url}>
              <source src={active.url} type={isHls ? 'application/x-mpegURL' : 'video/mp4'} />
            </video>
            {subtitles.length > 0 && activeSubtitle >= 0 && subtitleSources[activeSubtitle] && (
              <SubtitleOverlay
                subtitleUrl={subtitleSources[activeSubtitle]}
                currentTime={currentTime}
                offset={globalPrefs.offset}
                fontSize={globalPrefs.fontSize}
                position={globalPrefs.position}
                enableTransitions={globalPrefs.enableTransitions}
              />
            )}
          </div>
        )}
      </div>

      {embeds.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {embeds.map((e, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveIndex(i)
                setIframeError(false)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                i === activeIndex
                  ? 'bg-accent/10 text-accent border-accent/30'
                  : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
              }`}>
              {e.name || getProviderName(e.url)}
            </button>
          ))}
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface text-text-secondary border border-white/10 hover:text-text-primary ml-auto">
            {fullscreen ? 'Salir' : 'Pantalla completa'}
          </button>
        </div>
      )}

      {subtitles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 relative">
          <button
            onClick={() => onSubtitleChange?.(-1)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              activeSubtitle < 0
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
            }`}>
            Sin subtítulos
          </button>
          {subtitles.map((sub, i) => (
            <button
              key={i}
              onClick={() => onSubtitleChange?.(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                i === activeSubtitle
                  ? 'bg-accent/10 text-accent border-accent/30'
                  : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
              }`}>
              {subtitleLangLabel(sub)}
            </button>
          ))}
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface text-text-secondary border border-white/10 hover:text-text-primary"
            title="Configuración de subtítulos"
            aria-label="Configuración de subtítulos">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <AnimatePresence>
            {showSettings && (
              <SubtitleSettings
                onClose={() => {
                  setShowSettings(false)
                  handleSettingsChange()
                }}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
