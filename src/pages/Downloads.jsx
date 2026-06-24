import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getDownloads, removeDownload, formatSize, isUrlCached } from '../utils/downloads'
import { getVideoDownloads, removeVideoDownload, isVideoCached, getVideoCacheSize } from '../utils/videoDownload'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'
import SafeImage from '../components/SafeImage'

export default function Downloads() {
  const [downloads, setDownloads] = useState([])
  const [videoDownloads, setVideoDownloads] = useState([])
  const [totalSize, setTotalSize] = useState(0)

  function refresh() {
    setDownloads(getDownloads())
    setVideoDownloads(getVideoDownloads())
    Promise.all((getVideoDownloads() || []).map((d) => getVideoCacheSize(d.id).catch(() => 0))).then((sizes) => {
      const videoTotal = sizes.reduce((a, b) => a + b, 0)
      const mangaTotal = getDownloads().reduce((s, d) => s + (d.size || 0), 0)
      setTotalSize(mangaTotal + videoTotal)
    })
  }

  useEffect(() => {
    refresh()
  }, [])

  const mangaDownloads = downloads.filter((d) => d.type === 'manga')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <SeoHead title="Descargas offline" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Descargas offline</h1>
        {totalSize > 0 && <span className="text-xs text-text-secondary">{formatSize(totalSize)} total</span>}
      </div>

      {downloads.length === 0 && videoDownloads.length === 0 ? (
        <EmptyState message="No hay descargas guardadas." action={{ label: 'Explorar manga', to: '/manga' }} />
      ) : (
        <div className="space-y-6">
          {videoDownloads.length > 0 && (
            <div>
              <h2 className="text-xs text-text-secondary font-medium mb-3 uppercase tracking-wider">Episodios ({videoDownloads.length})</h2>
              <div className="space-y-2">
                {videoDownloads.map((d) => (
                  <VideoDownloadCard
                    key={d.id}
                    item={d}
                    onDelete={() => {
                      removeVideoDownload(d.id)
                      refresh()
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          {mangaDownloads.length > 0 && (
            <div>
              <h2 className="text-xs text-text-secondary font-medium mb-3 uppercase tracking-wider">Manga ({mangaDownloads.length})</h2>
              <div className="space-y-2">
                {mangaDownloads.map((d) => (
                  <DownloadCard
                    key={d.id}
                    item={d}
                    onDelete={() => {
                      removeDownload(d.id)
                      refresh()
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

function VideoDownloadCard({ item, onDelete }) {
  const [cached, setCached] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    isVideoCached(item.id).then((v) => {
      setCached(v)
      setChecking(false)
    })
  }, [item.id])

  const watchUrl = `/watch?anilistId=${item.id?.split('-')?.[1] || ''}&ep=${item.episode}&title=${encodeURIComponent(item.title || '')}&image=${encodeURIComponent(item.image || '')}`

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-surface hover:bg-surface-hover transition-all group border border-transparent hover:border-primary/20">
      <Link to={watchUrl} className="shrink-0">
        <div className="w-14 h-20 rounded-lg overflow-hidden bg-surface-hover ring-1 ring-white/10">
          <SafeImage src={item.image} alt="" className="w-full h-full object-cover" />
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={watchUrl} className="text-sm font-medium truncate group-hover:text-neon-cyan transition-colors block">
          {item.title || 'Sin título'}
        </Link>
        <p className="text-xs text-text-secondary mt-0.5">
          Episodio {item.episode} · {item.quality || 'auto'}
        </p>
        <p className="text-[10px] text-text-secondary/50 mt-0.5">
          {item.totalSegments || item.segments?.length || 0} segments
          {!checking && !cached && ' · sin cache'}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!checking && cached && (
          <Link
            to={watchUrl}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-hover transition-colors">
            Ver offline
          </Link>
        )}
        <button
          onClick={onDelete}
          className="p-2 rounded-lg text-text-secondary/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Eliminar descarga">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

function DownloadCard({ item, onDelete }) {
  const [hasCachedPages, setHasCachedPages] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      if (!item.pages?.length) {
        setChecking(false)
        return
      }
      const cached = await isUrlCached(item.pages[0])
      setHasCachedPages(cached)
      setChecking(false)
    }
    check()
  }, [item.pages])

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-surface hover:bg-surface-hover transition-all group border border-transparent hover:border-primary/20">
      <Link to={item.link || '#'} className="shrink-0">
        <div className="w-14 h-20 rounded-lg overflow-hidden bg-surface-hover ring-1 ring-white/10">
          <SafeImage src={item.image} alt="" className="w-full h-full object-cover" />
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={item.link || '#'} className="text-sm font-medium truncate group-hover:text-neon-cyan transition-colors block">
          {item.title || 'Sin título'}
        </Link>
        <p className="text-xs text-text-secondary mt-0.5">
          {item.chapterLabel || `Capítulo ${item.chapter}`}
          {item.size > 0 && ` · ${formatSize(item.size)}`}
        </p>
        <p className="text-[10px] text-text-secondary/50 mt-0.5">
          {item.pages?.length || 0} páginas
          {!checking && !hasCachedPages && ' · sin cache'}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!checking && hasCachedPages && (
          <Link
            to={item.link || '#'}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-hover transition-colors">
            Leer offline
          </Link>
        )}
        <button
          onClick={onDelete}
          className="p-2 rounded-lg text-text-secondary/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Eliminar descarga">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
