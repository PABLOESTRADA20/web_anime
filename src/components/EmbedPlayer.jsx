import { useState } from 'react'


const EMBED_PROVIDERS = {
  streamtape: { pattern: /streamtape/i, embed: (url) => url.replace('/v/', '/e/').replace('/d/', '/e/') },
  yourupload: { pattern: /yourupload/i, embed: (url) => url.replace('/watch/', '/embed/') },
  doodstream: { pattern: /doodstream|d000d/i, embed: (url) => url.replace('/d/', '/e/') },
  okru: { pattern: /ok\.ru/i, embed: (url) => url.replace(/\/video\//, '/videoembed/') },
  sendvid: { pattern: /sendvid/i, embed: (url) => url.replace('/v/', '/embed/') },
  'mp4upload': { pattern: /mp4upload/i, embed: (url) => url.replace('/video/', '/embed-') },
  gdrive: { pattern: /drive\.google/i, embed: (url) => {
    const id = url.match(/\/d\/([^/]+)/)?.[1] || url.match(/id=([^&]+)/)?.[1]
    return id ? `https://drive.google.com/file/d/${id}/preview` : url
  }},
  mega: { pattern: /mega\.nz/i, embed: (url) => `https://mega.nz/embed${url.split('#!')[1] ? '#' + url.split('#!')[1] : url.replace('https://mega.nz/', '/')}` },
  mixdrop: { pattern: /mixdrop/i, embed: (url) => url.replace('/f/', '/e/').replace('mixdrop.to', 'mixdrop.co') },
  fembed: { pattern: /fembed|fcdn|femax20/i, embed: (url) => url.replace('/v/', '/api/source/') },
  streamsb: { pattern: /streamsb/i, embed: (url) => url },
  streamlare: { pattern: /streamlare/i, embed: (url) => url },
  allanime: { pattern: /allanime\.day/i, embed: () => null },
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
  } catch { return 'Servidor' }
}

export default function EmbedPlayer({ embeds, onBack }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [iframeError, setIframeError] = useState(false)

  if (!embeds?.length) return null

  const active = embeds[activeIndex]
  const embedUrl = getEmbedUrl(active?.url)
  const isDirectVideo = active?.url?.match(/\.(mp4|webm|mkv|avi|mov)(\?|$)/i) || active?.type === 'direct'
  const isHls = active?.url?.includes('.m3u8')

  return (
    <div className={`${fullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
      <div className={`${fullscreen ? 'h-full w-full' : 'w-full'} bg-black rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/5`}>
        {iframeError || (!embedUrl && !isDirectVideo && !isHls) ? (
          <div className="aspect-video flex flex-col items-center justify-center bg-surface gap-4 p-6">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
            </div>
            <p className="text-text-secondary text-sm text-center">Este enlace no es visible en el reproductor integrado.</p>
            <a href={active.url} target="_blank" rel="noopener noreferrer"
              className="px-5 py-2.5 bg-accent hover:bg-accent/80 text-white rounded-xl text-sm font-medium transition-colors">
              Abrir en nueva pestaña
            </a>
            {onBack && (
              <button onClick={onBack} className="text-xs text-text-secondary/60 hover:text-text-secondary transition-colors">
                Volver al reproductor principal
              </button>
            )}
          </div>
        ) : isDirectVideo || isHls ? (
          <video controls autoPlay playsInline className="w-full aspect-video" key={active.url}>
            <source src={active.url} type={isHls ? 'application/x-mpegURL' : 'video/mp4'} />
          </video>
        ) : (
          <iframe
            src={embedUrl}
            className="w-full aspect-video"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onError={() => setIframeError(true)}
          />
        )}
      </div>

      {embeds.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {embeds.map((e, i) => (
            <button
              key={i}
              onClick={() => { setActiveIndex(i); setIframeError(false) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                i === activeIndex
                  ? 'bg-accent/10 text-accent border-accent/30'
                  : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
              }`}
            >
              {e.name || getProviderName(e.url)}
            </button>
          ))}
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface text-text-secondary border border-white/10 hover:text-text-primary ml-auto"
          >
            {fullscreen ? 'Salir' : 'Pantalla completa'}
          </button>
        </div>
      )}
    </div>
  )
}
