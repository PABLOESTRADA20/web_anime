import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase, isSupabaseReady } from '../lib/supabase'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'
import { useI18n } from '../hooks/useI18n'
import { useAuth } from '../hooks/useAuth'
import { useFollowedUsers } from '../hooks/useFollows'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}mes`
}

export default function Activity() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { followedIds } = useFollowedUsers()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!isSupabaseReady()) {
      setLoading(false)
      return
    }
    let cancelled = false
    supabase
      .from('reviews')
      .select('*, user:user_id(email)')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!cancelled) setReviews(data || [])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = filter === 'following' && followedIds.length > 0 ? reviews.filter((r) => followedIds.includes(r.user_id)) : reviews

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <SeoHead title={t('home.activity')} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{t('home.activity')}</h1>
        {user && followedIds.length > 0 && (
          <div className="flex gap-1 bg-surface rounded-xl p-0.5 border border-white/10">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === 'all' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              Todos
            </button>
            <button
              onClick={() => setFilter('following')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === 'following' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              Siguiendo
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState message={filter === 'following' ? 'No hay actividad de usuarios que sigues.' : 'No hay actividad reciente.'} />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const email = r.user?.email?.split('@')[0] || 'Anónimo'
            return (
              <div key={r.id} className="p-4 rounded-2xl bg-surface/50 border border-white/5 hover:bg-surface-hover transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Link
                    to={`/profile/${r.user_id}`}
                    className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary shrink-0 hover:ring-2 ring-primary/30 transition-all">
                    {email[0].toUpperCase()}
                  </Link>
                  <Link to={`/profile/${r.user_id}`} className="text-xs font-medium hover:text-primary transition-colors">
                    {email}
                  </Link>
                  {followedIds.includes(r.user_id) && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Siguiendo</span>
                  )}
                  <span className="text-[10px] text-text-secondary/50">{timeAgo(r.created_at)}</span>
                  <span className="ml-auto text-xs font-bold text-primary">{r.score}/10</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">{r.content}</p>
                <div className="mt-2">
                  <Link to={`/anime/${r.anilist_id}`} className="text-[10px] text-neon-cyan hover:underline">
                    {t('anime.episode')} {r.anilist_id} →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
