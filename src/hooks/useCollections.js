import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'

export function useCollections() {
  const { user } = useAuth()
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCollections = useCallback(async () => {
    if (!user) {
      setCollections([])
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/collections')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setCollections(json.data || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  async function createCollection(name, description = '', isPublic = true) {
    if (!user) throw new Error('Debes iniciar sesión')
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, is_public: isPublic }),
    })
    if (!res.ok) throw new Error(await res.text())
    const json = await res.json()
    setCollections((prev) => [json.data, ...prev])
    return json.data
  }

  async function updateCollection(id, updates) {
    const res = await fetch(`/api/collections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error(await res.text())
    const json = await res.json()
    setCollections((prev) => prev.map((c) => (c.id === id ? json.data : c)))
    return json.data
  }

  async function deleteCollection(id) {
    const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(await res.text())
    setCollections((prev) => prev.filter((c) => c.id !== id))
  }

  return { collections, loading, fetchCollections, createCollection, updateCollection, deleteCollection }
}

export function useCollectionItems(collectionId) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    if (!collectionId) {
      setItems([])
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/collections/${collectionId}/items`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setItems(json.data || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [collectionId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  async function addItem(anilistId, mediaType, note = '') {
    const res = await fetch(`/api/collections/${collectionId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anilist_id: anilistId, media_type: mediaType, note }),
    })
    if (!res.ok) throw new Error(await res.text())
    const json = await res.json()
    setItems((prev) => [json.data, ...prev])
    return json.data
  }

  async function removeItem(itemId) {
    const res = await fetch(`/api/collections/${collectionId}/items/${itemId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(await res.text())
    setItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  async function updateNote(itemId, note) {
    const res = await fetch(`/api/collections/${collectionId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })
    if (!res.ok) throw new Error(await res.text())
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, note } : i)))
  }

  function getByAnilistId(anilistId) {
    return items.filter((i) => i.anilist_id === anilistId)
  }

  return { items, loading, fetchItems, addItem, removeItem, updateNote, getByAnilistId }
}
