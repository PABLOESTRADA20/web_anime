import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DetailSkeleton } from '../components/Skeletons'
import CommentSection from '../components/CommentSection'
import SeoHead from '../components/SeoHead'
import { getNovelInfo, getNovelChapters } from '../lib/novels'

// Simple hash function to convert slug string to a numeric ID for DB
function slugHash(s) {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}
import { useNovelHistory } from '../hooks/useNovelHistory'
import { useToast } from '../components/Toast'
import { useNovelFavorites } from '../hooks/useNovelFavorites'
import { useNovelLists } from '../hooks/useNovelLists'
import { useAuth } from '../hooks/useAuth'
import SafeImage from '../components/SafeImage'

export default function NovelDetail() {
  const { slug } = useParams()
  const [novel, setNovel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chapters, setChapters] = useState([])
  const [chaptersLoading, setChaptersLoading] = useState(true)
  const [chapterLimit, setChapterLimit] = useState(30)

  const { user } = useAuth()
  const { getLatestChapter, isChapterRead } = useNovelHistory()
  const { isFavorite, toggleFavorite } = useNovelFavorites()
  const { getListStatus, setListStatus: setNovelListStatus } = useNovelLists()
  const [favLoading, setFavLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setChapters([])
    getNovelInfo(slug)
      .then(async (data) => {
        if (ac.signal.aborted) return
        setNovel(data)
        setLoading(false)
        try {
          const chs = await getNovelChapters(slug)
          if (!ac.signal.aborted) setChapters(chs || [])
        } catch {
          /* no chapters */
        }
        setChaptersLoading(false)
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          setLoading(false)
          setChaptersLoading(false)
        }
      })
    return () => ac.abort()
  }, [slug])

  async function handleToggleFavorite() {
    if (!user) {
      toast('Inicia sesión para agregar favoritos', 'info')
      return
    }
    setFavLoading(true)
    try {
      await toggleFavorite(slug, novel.title, novel.cover)
      toast(isFavorite(slug) ? 'Eliminado de favoritos' : 'Agregado a favoritos', 'success')
    } catch {
      toast('Error al actualizar favoritos', 'error')
    }
    setFavLoading(false)
  }

  async function handleListStatus(status) {
    if (!user) {
      toast('Inicia sesión para usar listas', 'info')
      return
    }
    try {
      await setNovelListStatus(slug, novel.title, novel.cover, status)
      const current = getListStatus(slug)
      if (current === status) toast(`Marcado como ${status}`, 'success')
      else toast('Lista actualizada', 'success')
    } catch {
      toast('Error al actualizar lista', 'error')
    }
  }

  const latestChapter = getLatestChapter(slug)
  const listStatus = getListStatus(slug)

  if (loading) return <DetailSkeleton />

  return (
    <>
      <SeoHead title={novel?.title || 'Novela'} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="flex flex-col md:flex-row gap-6 mb-10">
          <div className="w-48 shrink-0 mx-auto md:mx-0">
            <SafeImage src={novel.cover} alt={novel.title} className="w-full rounded-2xl shadow-lg" fallbackText={novel.title} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">{novel.title}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              {novel.author && <span className="text-sm text-text-secondary">por {novel.author}</span>}
              {novel.status && (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${novel.status === 'Ongoing' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {novel.status}
                </span>
              )}
            </div>
            {novel.genres?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {novel.genres.map((g) => (
                  <span key={g} className="text-xs px-2 py-1 rounded-full bg-surface text-text-secondary">
                    {g}
                  </span>
                ))}
              </div>
            )}
            {novel.description && <p className="text-sm text-text-secondary leading-relaxed mb-4 line-clamp-4">{novel.description}</p>}
            <div className="flex flex-wrap gap-2">
              {latestChapter && (
                <Link
                  to={`/novel/${slug}/read?chapter=${latestChapter.chapter_number}`}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                  Continuar capítulo {latestChapter.chapter_number}
                </Link>
              )}
              <Link
                to={`/novel/${slug}/read?chapter=1`}
                className="px-4 py-2 bg-surface hover:bg-surface-hover text-text-primary rounded-xl text-sm font-medium transition-colors border border-white/10">
                {chapters.length > 0 ? `Comenzar` : `Capítulo 1`}
              </Link>
              <button
                onClick={handleToggleFavorite}
                disabled={favLoading}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${isFavorite(slug) ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-surface hover:bg-surface-hover text-text-secondary border-white/10'}`}>
                {isFavorite(slug) ? '♥ Favorito' : '♡ Favorito'}
              </button>
            </div>
            {user && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['Leyendo', 'Completado', 'Pendiente', 'Abandonado'].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleListStatus(s)}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${listStatus === s ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <h2 className="text-lg font-bold mb-4">Capítulos ({chapters.length})</h2>
        {chaptersLoading ? (
          <div className="text-center py-8 text-text-secondary">Cargando capítulos...</div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">No se encontraron capítulos.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
              {chapters.slice(0, chapterLimit).map((ch) => (
                <Link
                  key={ch.number}
                  to={`/novel/${slug}/read?chapter=${ch.number}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isChapterRead(slug, ch.number) ? 'bg-neon-cyan/5 text-text-secondary' : 'bg-surface/50 hover:bg-surface text-text-primary'}`}>
                  <span className="font-mono text-xs text-primary">{ch.number}.</span>
                  <span className="truncate">{ch.title}</span>
                </Link>
              ))}
            </div>
            {chapterLimit < chapters.length && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setChapterLimit((prev) => prev + 50)}
                  className="px-6 py-2.5 bg-surface hover:bg-surface-hover text-text-primary rounded-xl font-medium text-sm transition-colors border border-white/10">
                  Mostrar más ({chapters.length - chapterLimit} restantes)
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-12">
          <CommentSection anilistId={slugHash(slug)} mediaType="novel" />
        </div>
      </motion.div>
    </>
  )
}
