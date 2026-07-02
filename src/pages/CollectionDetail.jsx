import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { useCollectionItems } from '../hooks/useCollections'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'

export default function CollectionDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const [collection, setCollection] = useState(null)
  const [collLoading, setCollLoading] = useState(true)
  const { items, loading: itemsLoading, removeItem } = useCollectionItems(id)

  useEffect(() => {
    if (!id || !isSupabaseReady()) return
    supabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setCollection(data))
      .catch(() => {})
      .finally(() => setCollLoading(false))
  }, [id])

  const isOwner = user && collection && user.id === collection.user_id

  async function handleRemove(itemId) {
    try {
      await removeItem(itemId)
      toast.success(t('collections.removed'))
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (collLoading || itemsLoading)
    return (
      <div className="max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-surface rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  if (!collection) return <div className="max-w-2xl mx-auto py-12 text-center text-text-secondary">{t('collections.notFound')}</div>

  return (
    <>
      <SeoHead title={collection.name} />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link to="/collections" className="text-xs text-text-secondary hover:text-primary transition-colors mb-1 inline-block">
              ← {t('collections.title')}
            </Link>
            <h1 className="text-xl font-bold">{collection.name}</h1>
            {collection.description && <p className="text-sm text-text-secondary mt-1">{collection.description}</p>}
            <div className="flex gap-3 mt-2 text-xs text-text-secondary">
              <span>
                {items.length} {t('common.items')}
              </span>
              {collection.is_public ? (
                <span className="text-green-400/60">{t('collections.public')}</span>
              ) : (
                <span className="text-yellow-400/60">{t('collections.private')}</span>
              )}
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState message={t('collections.emptyDetail')} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {items.map((item) => {
              const isAnime = item.media_type === 'anime'
              const link = isAnime ? `/anime/${item.anilist_id}` : `/manga/${item.anilist_id}`
              return (
                <div
                  key={item.id}
                  className="group relative rounded-xl overflow-hidden bg-surface hover:bg-surface-hover transition-colors">
                  <Link to={link}>
                    <div className="aspect-[3/4] bg-surface-hover flex items-center justify-center text-text-secondary/30 text-[10px]">
                      {item.media_type} #{item.anilist_id}
                    </div>
                  </Link>
                  <div className="p-2">
                    <Link to={link} className="text-xs truncate block hover:text-primary transition-colors">
                      ID {item.anilist_id}
                    </Link>
                    <span className="text-[10px] text-text-secondary/50">{item.media_type}</span>
                    {item.note && <p className="text-[10px] text-text-secondary/60 mt-0.5 truncate">{item.note}</p>}
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/50 text-white/70 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-[10px]">
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
