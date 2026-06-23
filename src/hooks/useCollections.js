import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useCollections() {
  const { user } = useAuth()
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCollections = useCallback(async () => {
    if (!user || !isSupabaseReady()) { setCollections([]); setLoading(false); return }
    const { data } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    setCollections(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchCollections() }, [fetchCollections])

  async function createCollection(name, description = '', isPublic = true) {
    if (!user) throw new Error('Debes iniciar sesión')
    const { data, error } = await supabase
      .from('collections')
      .insert({ user_id: user.id, name, description, is_public: isPublic })
      .select()
      .single()
    if (error) throw error
    setCollections(prev => [data, ...prev])
    return data
  }

  async function updateCollection(id, updates) {
    const { data, error } = await supabase
      .from('collections')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setCollections(prev => prev.map(c => c.id === id ? data : c))
    return data
  }

  async function deleteCollection(id) {
    const { error } = await supabase.from('collections').delete().eq('id', id)
    if (error) throw error
    setCollections(prev => prev.filter(c => c.id !== id))
  }

  return { collections, loading, fetchCollections, createCollection, updateCollection, deleteCollection }
}

export function useCollectionItems(collectionId) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    if (!collectionId || !isSupabaseReady()) { setItems([]); setLoading(false); return }
    const { data } = await supabase
      .from('collection_items')
      .select('*')
      .eq('collection_id', collectionId)
      .order('added_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [collectionId])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function addItem(anilistId, mediaType, note = '') {
    const { data, error } = await supabase
      .from('collection_items')
      .insert({ collection_id: collectionId, anilist_id: anilistId, media_type: mediaType, note })
      .select()
      .single()
    if (error) throw error
    setItems(prev => [data, ...prev])
    return data
  }

  async function removeItem(itemId) {
    const { error } = await supabase.from('collection_items').delete().eq('id', itemId)
    if (error) throw error
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  async function updateNote(itemId, note) {
    const { error } = await supabase.from('collection_items').update({ note }).eq('id', itemId)
    if (error) throw error
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, note } : i))
  }

  function getByAnilistId(anilistId) {
    return items.filter(i => i.anilist_id === anilistId)
  }

  return { items, loading, fetchItems, addItem, removeItem, updateNote, getByAnilistId }
}
