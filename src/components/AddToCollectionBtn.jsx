import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useCollections } from '../hooks/useCollections'
import { useToast } from './Toast'

export default function AddToCollectionBtn({ anilistId, mediaType }) {
  const { user } = useAuth()
  const { collections, createCollection } = useCollections()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState({})
  const [membership, setMembership] = useState({})
  const [newName, setNewName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!open || collections.length === 0 || !anilistId) {
      setMembership({})
      return
    }
    const load = async () => {
      const map = {}
      await Promise.all(
        collections.map(async (c) => {
          try {
            const res = await fetch(`/api/collections/${c.id}/items?anilist_id=${anilistId}&media_type=${mediaType}`)
            if (res.ok) {
              const json = await res.json()
              map[c.id] = !!json.data
            }
          } catch { /* ignore */ }
        }),
      )
      setMembership(map)
    }
    load()
  }, [open, collections, anilistId, mediaType])

  if (!user) return null

  async function handleToggle(collId) {
    setAdding((prev) => ({ ...prev, [collId]: true }))
    try {
      if (membership[collId]) {
        const res = await fetch(`/api/collections/${collId}/items?anilist_id=${anilistId}&media_type=${mediaType}&delete=1`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Error al eliminar')
        setMembership((prev) => ({ ...prev, [collId]: false }))
        toast.success('Eliminado de la colección')
      } else {
        const res = await fetch(`/api/collections/${collId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anilist_id: anilistId, media_type: mediaType }),
        })
        if (!res.ok) throw new Error(await res.text())
        setMembership((prev) => ({ ...prev, [collId]: true }))
        toast.success('Agregado a la colección')
      }
    } catch (err) {
      toast.error(err.message)
    }
    setAdding((prev) => ({ ...prev, [collId]: false }))
  }

  async function handleCreateNew(e) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await createCollection(newName.trim())
      setNewName('')
      setShowNew(false)
      toast.success('Colección creada')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-2.5 rounded-xl font-medium text-xs transition-colors border bg-surface text-text-secondary border-white/10 hover:text-neon-cyan hover:bg-surface-hover flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Colección
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-background/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 p-3">
          <p className="text-xs font-medium text-text-secondary mb-2">Agregar a colección</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {collections.length === 0 && <p className="text-xs text-text-secondary/50 text-center py-3">No tienes colecciones aún</p>}
            {collections.map((c) => (
              <button
                key={c.id}
                onClick={() => handleToggle(c.id)}
                disabled={adding[c.id]}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                  membership[c.id] ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}>
                <span
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                    membership[c.id] ? 'bg-primary border-primary text-white' : 'border-white/20'
                  }`}>
                  {membership[c.id] && <span className="text-[8px]">✓</span>}
                </span>
                <span className="truncate flex-1">{c.name}</span>
                {adding[c.id] && (
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-cosmic-spin shrink-0" />
                )}
              </button>
            ))}
          </div>
          {showNew ? (
            <form onSubmit={handleCreateNew} className="mt-2 flex gap-1">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nueva colección..."
                maxLength={100}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-background border border-white/10 text-xs focus:outline-none focus:border-primary/50 transition-all"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newName.trim()}
                className="px-2.5 py-1.5 rounded-lg bg-primary text-white text-[10px] font-medium disabled:opacity-40 shrink-0">
                Crear
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowNew(true)}
              className="w-full text-left px-3 py-2 mt-1 rounded-lg text-xs text-neon-cyan hover:bg-surface-hover transition-colors">
              + Nueva colección
            </button>
          )}
        </div>
      )}
    </div>
  )
}
