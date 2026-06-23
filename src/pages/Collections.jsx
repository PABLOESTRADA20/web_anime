import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCollections } from '../hooks/useCollections'
import SeoHead from '../components/SeoHead'
import GradientHeading from '../components/GradientHeading'
import { useToast } from '../components/Toast'
import EmptyState from '../components/EmptyState'

export default function Collections() {
  const { user } = useAuth()
  const { collections, loading, createCollection, deleteCollection } = useCollections()
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [creating, setCreating] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      await createCollection(name.trim(), description.trim(), isPublic)
      setName('')
      setDescription('')
      setShowForm(false)
      toast.success('Colección creada')
    } catch (err) { toast.error(err.message) }
    setCreating(false)
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta colección permanentemente?')) return
    try { await deleteCollection(id); toast.success('Colección eliminada') }
    catch (err) { toast.error(err.message) }
  }

  if (!user) {
    return <>
      <SeoHead title="Colecciones" />
      <div className="max-w-2xl mx-auto py-12 text-center text-text-secondary">Inicia sesión para ver tus colecciones.</div>
    </>
  }

  return (
    <>
      <SeoHead title="Mis colecciones" />
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <GradientHeading variant="pink" size="lg">Mis colecciones</GradientHeading>
          <button onClick={() => setShowForm(v => !v)}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors">
            + Nueva
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-surface rounded-2xl p-5 mb-6 space-y-3 border border-white/5">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de la colección" required
              maxLength={100}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-all" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción (opcional)"
              maxLength={300} rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-all resize-none" />
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)}
                className="rounded border-white/20 bg-background" />
              Colección pública
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={creating || !name.trim()}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40">
                {creating ? 'Creando...' : 'Crear'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-surface text-text-secondary border border-white/10 hover:text-text-primary transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />)}</div>
        ) : collections.length === 0 ? (
          <EmptyState message="No tienes colecciones aún. Crea una para organizar tu anime y manga." />
        ) : (
          <div className="space-y-2">
            {collections.map(c => (
              <Link key={c.id} to={`/collections/${c.id}`}
                className="flex items-center gap-4 p-4 rounded-2xl bg-surface/50 border border-white/5 hover:bg-surface-hover hover:border-white/10 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  {c.description && <p className="text-xs text-text-secondary truncate mt-0.5">{c.description}</p>}
                  <div className="flex gap-3 mt-1">
                    {c.is_public && <span className="text-[10px] text-text-secondary/50">Pública</span>}
                  </div>
                </div>
                <button onClick={(e) => handleDelete(c.id, e)}
                  className="p-2 rounded-lg text-text-secondary/30 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  title="Eliminar colección">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
