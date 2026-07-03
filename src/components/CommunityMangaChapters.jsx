import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import {
  useCommunityMangaChapters,
  useSubmitMangaChapter,
  useMangaChapterVote,
  getMangaProviderLabel,
  getMangaProviderColor,
} from '../hooks/useCommunityManga'
import { useToast } from './Toast'
import EmptyState from './EmptyState'

export default function CommunityMangaChapters({ anilistId, chapterNumber, title }) {
  const { user } = useAuth()
  const toast = useToast()
  const { links, loading, refetch } = useCommunityMangaChapters(anilistId, chapterNumber)
  const { submit, submitting } = useSubmitMangaChapter()
  const { vote, voting } = useMangaChapterVote()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ url: '', title: '' })
  const [formError, setFormError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!form.url) {
      setFormError('La URL es obligatoria')
      return
    }
    if (!form.url.startsWith('http://') && !form.url.startsWith('https://')) {
      setFormError('URL inválida')
      return
    }
    try {
      await submit({
        anilist_id: parseInt(anilistId, 10),
        chapter_number: parseFloat(chapterNumber),
        url: form.url,
        title: form.title || title || '',
      })
      toast('Enlace enviado. Pendiente de aprobación.', 'success', 4000)
      setShowForm(false)
      setForm({ url: '', title: '' })
      setTimeout(refetch, 2000)
    } catch (e) {
      setFormError(e.message)
    }
  }

  async function handleVote(chId, value) {
    try {
      await vote(chId, value)
      refetch()
    } catch {
      toast('Error al votar', 'error')
    }
  }

  if (loading) return null

  return (
    <div className="mt-6 p-4 rounded-2xl bg-surface/50 border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Comunidad — Capítulos de Manga
        </h3>
        {user && (
          <button
            onClick={() => setShowForm(!showForm)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              showForm ? 'bg-primary text-white border-primary' : 'bg-surface text-text-secondary border-white/10 hover:text-primary'
            }`}>
            {showForm ? '✕ Cerrar' : '+ Aportar enlace'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="mb-4 space-y-3 overflow-hidden">
            <div>
              <label className="text-[10px] text-text-secondary block mb-1">URL del capítulo *</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://mangadex.org/chapter/..."
                className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-secondary block mb-1">Título (opcional)</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={title || `Capítulo ${chapterNumber}`}
                className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            {formError && <p className="text-[10px] text-red-400">{formError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
              {submitting ? 'Enviando...' : 'Enviar enlace'}
            </button>
            <p className="text-[10px] text-text-secondary/60">Los enlaces son revisados antes de publicarse.</p>
          </motion.form>
        )}
      </AnimatePresence>

      {links.length === 0 ? (
        <EmptyState
          message={user ? 'No hay enlaces aún. ¡Sé el primero en aportar!' : 'No hay enlaces de la comunidad para este capítulo.'}
        />
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface hover:bg-surface-hover transition-colors border border-white/5 group">
              <div className="flex flex-col items-center gap-0.5 min-w-[32px]">
                <button
                  onClick={() => handleVote(link.id, 1)}
                  disabled={voting[link.id]}
                  className="text-[10px] text-text-secondary hover:text-green-400 transition-colors disabled:opacity-50"
                  title="Útil"
                  aria-label="Votar útil">
                  ▲
                </button>
                <span
                  className={`text-xs font-mono font-bold ${link.votes > 0 ? 'text-green-400' : link.votes < 0 ? 'text-red-400' : 'text-text-secondary'}`}>
                  {link.votes}
                </span>
                <button
                  onClick={() => handleVote(link.id, -1)}
                  disabled={voting[link.id]}
                  className="text-[10px] text-text-secondary hover:text-red-400 transition-colors disabled:opacity-50"
                  title="No útil"
                  aria-label="Votar no útil">
                  ▼
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getMangaProviderColor(link.provider_name)}`}>
                    {getMangaProviderLabel(link.provider_name)}
                  </span>
                </div>
                {link.title && <p className="text-xs text-text-secondary truncate mt-1">{link.title}</p>}
              </div>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium transition-colors">
                Abrir
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
