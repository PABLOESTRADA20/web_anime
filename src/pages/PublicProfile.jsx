import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, isSupabaseReady } from '../lib/supabase'
import SeoHead from '../components/SeoHead'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { useFollows } from '../hooks/useFollows'
import SafeImage from '../components/SafeImage'

export default function PublicProfile() {
  const { id } = useParams()
  const { user } = useAuth()
  const { isFollowing, followerCount, followingCount, loading: followsLoading, follow, unfollow } = useFollows(id)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [reviews, setReviews] = useState([])
  const [history, setHistory] = useState([])
  const [mangaHistory, setMangaHistory] = useState([])
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('reviews')
  const toast = useToast()
  const [followActionLoading, setFollowActionLoading] = useState(false)

  useEffect(() => {
    if (!id || !isSupabaseReady()) return
    let cancelled = false

    async function load() {
      try {
        const [profileRes, historyRes, listsRes, reviewsRes, mangaRes] = await Promise.allSettled([
          supabase.from('user_profiles').select('*').eq('id', id).single(),
          supabase.from('history').select('*').eq('user_id', id).order('updated_at', { ascending: false }).limit(20),
          supabase.from('anime_lists').select('*').eq('user_id', id),
          supabase.from('reviews').select('*, user:user_id(email)').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
          supabase.from('manga_history').select('*').eq('user_id', id).order('updated_at', { ascending: false }).limit(20),
        ])

        let displayName = 'AnimeVerse User'
        let bio = ''
        let avatarUrl = null
        let website = ''
        if (profileRes.status === 'fulfilled' && profileRes.value.data) {
          displayName = profileRes.value.data.display_name || 'AnimeVerse User'
          bio = profileRes.value.data.bio || ''
          avatarUrl = profileRes.value.data.avatar_url
          website = profileRes.value.data.website || ''
        }

        const h = historyRes.status === 'fulfilled' ? historyRes.value.data || [] : []
        const mh = mangaRes.status === 'fulfilled' ? mangaRes.value.data || [] : []
        const l = listsRes.status === 'fulfilled' ? listsRes.value.data || [] : []
        const r = reviewsRes.status === 'fulfilled' ? reviewsRes.value.data || [] : []

        if (!cancelled) {
          setProfile({ displayName, bio, avatarUrl, website })
          setStats({
            episodesWatched: h.length,
            mangaRead: mh.length,
            watching: l.filter((i) => i.status === 'watching').length,
            completed: l.filter((i) => i.status === 'completed').length,
            planToWatch: l.filter((i) => i.status === 'plan_to_watch').length,
            reviews: r.length,
          })
          setReviews(r)
          setHistory(h)
          setMangaHistory(mh)
          setLists(l)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setLoading(false)
          toast('Error al cargar perfil', 'error')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id, toast])

  if (loading)
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-48 bg-surface rounded-2xl animate-pulse mb-6" />
      </div>
    )
  if (!profile) return <div className="text-center py-20 text-text-secondary">Usuario no encontrado.</div>

  const watchingList = lists.filter((l) => l.status === 'watching')

  return (
    <>
      <SeoHead title={profile.displayName} />
      <div className="max-w-2xl mx-auto">
        <div className="bg-surface rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 bg-primary/20">
              {profile.avatarUrl ? (
                <SafeImage src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary">
                  {profile.displayName[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold truncate">{profile.displayName}</h1>
                  {profile.bio && <p className="text-sm text-text-secondary mt-1">{profile.bio}</p>}
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-neon-cyan hover:underline mt-1 inline-block truncate max-w-full">
                      {profile.website}
                    </a>
                  )}
                </div>
                {user && user.id !== id && (
                  <button
                    onClick={async () => {
                      setFollowActionLoading(true)
                      try {
                        if (isFollowing) await unfollow()
                        else await follow()
                      } catch (e) {
                        toast.error(e.message)
                      }
                      setFollowActionLoading(false)
                    }}
                    disabled={followActionLoading || followsLoading}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-colors border ${
                      isFollowing
                        ? 'bg-surface text-text-secondary border-white/10 hover:text-red-400 hover:border-red-500/30'
                        : 'bg-primary text-white border-primary hover:bg-primary-hover'
                    }`}>
                    {followActionLoading ? '...' : isFollowing ? 'Siguiendo' : 'Seguir'}
                  </button>
                )}
              </div>
              <div className="flex gap-4 mt-3">
                <span className="text-xs text-text-secondary">
                  <strong className="text-text-primary">{followerCount}</strong> seguidores
                </span>
                <span className="text-xs text-text-secondary">
                  <strong className="text-text-primary">{followingCount}</strong> siguiendo
                </span>
              </div>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-5 gap-2 mt-6">
              <StatBox value={stats.episodesWatched} label="Episodios vistos" color="text-primary" />
              <StatBox value={stats.mangaRead} label="Cap. manga leídos" color="text-accent" />
              <StatBox value={stats.watching} label="Viendo" color="text-neon-cyan" />
              <StatBox value={stats.completed} label="Completados" color="text-green-400" />
              <StatBox value={stats.reviews} label="Reseñas" color="text-yellow-400" />
            </div>
          )}

          {watchingList.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-2">Viendo ahora</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {watchingList.map((item) => (
                  <Link key={item.id} to={`/anime/${item.anilist_id}`} className="shrink-0 w-16">
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-surface-hover">
                      <SafeImage src={item.image} alt="" className="w-full h-full object-cover" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {reviews.length > 0 && (
            <TabBtn active={tab === 'reviews'} onClick={() => setTab('reviews')}>
              Reseñas ({reviews.length})
            </TabBtn>
          )}
          {history.length > 0 && (
            <TabBtn active={tab === 'history'} onClick={() => setTab('history')}>
              Historial ({history.length})
            </TabBtn>
          )}
          {mangaHistory.length > 0 && (
            <TabBtn active={tab === 'manga'} onClick={() => setTab('manga')}>
              Manga ({mangaHistory.length})
            </TabBtn>
          )}
        </div>

        {tab === 'reviews' && reviews.length > 0 && (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="p-4 rounded-2xl bg-surface/50 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-primary">{r.score}/10</span>
                  <Link to={`/anime/${r.anilist_id}`} className="text-xs text-neon-cyan hover:underline">
                    {r.anilist_id} →
                  </Link>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">{r.content}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'history' && history.length > 0 && (
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 hover:bg-surface-hover transition-colors group">
                <Link to={`/anime/${item.anilist_id}`} className="shrink-0">
                  <div className="w-14 h-10 rounded-lg overflow-hidden bg-surface-hover">
                    <SafeImage src={item.image} alt="" className="w-full h-full object-cover" />
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/anime/${item.anilist_id}`}
                    className="text-xs font-medium truncate block hover:text-primary transition-colors">
                    {item.title}
                  </Link>
                  <Link
                    to={`/watch?anilistId=${item.anilist_id}&ep=${item.episode_number}`}
                    className="text-[10px] text-text-secondary hover:text-primary transition-colors">
                    Episodio {item.episode_number}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'manga' && mangaHistory.length > 0 && (
          <div className="space-y-2">
            {mangaHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 hover:bg-surface-hover transition-colors group">
                <Link to={`/manga/${item.anilist_id}`} className="shrink-0">
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-surface-hover">
                    <SafeImage src={item.image} alt="" className="w-full h-full object-cover" />
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/manga/${item.anilist_id}`}
                    className="text-xs font-medium truncate block hover:text-primary transition-colors">
                    {item.title}
                  </Link>
                  <Link
                    to={`/manga/${item.anilist_id}/read?chapterId=${item.chapter_id}&chapter=${item.chapter_number}`}
                    className="text-[10px] text-text-secondary hover:text-primary transition-colors">
                    Capítulo {item.chapter_number}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <Link to="/" className="text-sm text-primary hover:underline mt-6 inline-block">
          ← Volver al inicio
        </Link>
      </div>
    </>
  )
}

function StatBox({ value, label, color }) {
  return (
    <div className="text-center p-2 rounded-xl bg-surface-hover">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[8px] text-text-secondary mt-0.5 leading-tight">{label}</p>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'}`}>
      {children}
    </button>
  )
}
