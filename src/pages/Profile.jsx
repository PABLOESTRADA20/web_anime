import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import SeoHead from '../components/SeoHead'
import { useWatchlist } from '../hooks/useWatchlist'
import { useAnimeFavorites } from '../hooks/useAnimeFavorites'
import { useHistory } from '../hooks/useHistory'
import { useMangaHistory } from '../hooks/useMangaHistory'
import { useAnimeLists } from '../hooks/useAnimeLists'
import { useAnilistImport } from '../hooks/useAnilistImport'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { useMangaLists } from '../hooks/useMangaLists'
import { useFollows } from '../hooks/useFollows'
import SafeImage from '../components/SafeImage'
import EmptyState from '../components/EmptyState'

function AnilistImportForm({ onImport, importing, result, error }) {
  const [username, setUsername] = useState('')

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Usuario de AniList..."
        className="w-36 px-3 py-1.5 rounded-lg bg-surface text-xs text-text-primary border border-white/10 focus:border-primary/50 outline-none transition-colors"
        onKeyDown={(e) => e.key === 'Enter' && username && onImport(username)}
      />
      <button
        onClick={() => onImport(username)}
        disabled={importing || !username}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-colors disabled:opacity-40">
        {importing ? 'Importando...' : 'Importar'}
      </button>
      {result && (
        <span className="text-[10px] text-green-400">
          +{result.watching} viendo, +{result.plan_to_watch} por ver, +{result.completed} vistos
        </span>
      )}
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  )
}

export default function Profile() {
  const { user, logout } = useAuth()
  const { importByUsername, importing, result, error: importError } = useAnilistImport()
  const push = usePushNotifications()
  const { followerCount, followingCount } = useFollows(user?.id)
  const { watchlist } = useWatchlist()
  const { favorites } = useAnimeFavorites()
  const { history } = useHistory()
  const { mangaHistory } = useMangaHistory()
  const { getUserList } = useAnimeLists()
  const { getUserList: getMangaList } = useMangaLists()

  const watching = getUserList('watching')
  const completed = getUserList('completed')
  const planToWatch = getUserList('plan_to_watch')
  const reading = getMangaList('reading')
  const completedManga = getMangaList('completed')
  const planToRead = getMangaList('plan_to_read')

  const [section, setSection] = useState('watching')

  const tabs = useMemo(
    () => [
      { key: 'watching', label: 'Mirando', count: watching.length },
      { key: 'plan_to_watch', label: 'Por ver', count: planToWatch.length },
      { key: 'completed', label: 'Visto', count: completed.length },
      { key: 'reading', label: 'Leyendo', count: reading.length },
      { key: 'plan_to_read', label: 'Manga pendiente', count: planToRead.length },
      { key: 'completed_manga', label: 'Manga leído', count: completedManga.length },
      { key: 'watchlist', label: 'Mi lista', count: watchlist.length },
      { key: 'favorites', label: 'Favoritos', count: favorites.length },
      { key: 'history', label: 'Historial anime', count: history.length },
      { key: 'manga', label: 'Historial manga', count: mangaHistory.length },
    ],
    [
      watching.length,
      planToWatch.length,
      completed.length,
      reading.length,
      planToRead.length,
      completedManga.length,
      watchlist.length,
      favorites.length,
      history.length,
      mangaHistory.length,
    ],
  )

  return (
    <>
      <SeoHead title={user ? `Perfil de ${user.email?.split('@')[0]}` : 'Perfil'} />
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface rounded-2xl p-6 mb-8">
          <h1 className="text-xl font-bold mb-1">
            <Link to={`/profile/${user.id}`} className="hover:text-primary transition-colors">
              {user.email?.split('@')[0]}
            </Link>
          </h1>
          <p className="text-sm text-text-secondary">{user.email}</p>
          <div className="flex gap-4 mt-2 mb-3">
            <span className="text-xs text-text-secondary">
              <strong className="text-text-primary">{followerCount}</strong> seguidores
            </span>
            <span className="text-xs text-text-secondary">
              <strong className="text-text-primary">{followingCount}</strong> siguiendo
            </span>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={logout}
              className="px-4 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-colors">
              Cerrar sesión
            </button>
            <div className="h-4 w-px bg-white/10 mx-1" />
            <AnilistImportForm onImport={importByUsername} importing={importing} result={result} error={importError} />
          </div>
          {push.supported && (
            <div className="mt-3">
              <button
                onClick={push.subscribed ? push.unsubscribe : push.subscribe}
                disabled={push.loading}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${
                  push.subscribed
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary'
                }`}>
                {push.loading ? '...' : push.subscribed ? 'Notificaciones activadas' : 'Activar notificaciones'}
              </button>
              {push.permission === 'denied' && (
                <p className="text-[10px] text-red-400 mt-1">Permiso denegado. Cambia en la configuración del navegador.</p>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setSection(t.key)}
              className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                section === t.key ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
              }`}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {section === 'watching' && (
          <section>
            {watching.length === 0 ? (
              <EmptyState message='No has marcado ningún anime como "Mirando".' />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {watching.map((item) => (
                  <Link
                    key={item.id}
                    to={`/anime/${item.anilist_id}`}
                    className="group rounded-xl overflow-hidden bg-surface hover:bg-surface-hover transition-colors">
                    <div className="aspect-[3/4] overflow-hidden">
                      <SafeImage src={item.image} alt={item.title} className="w-full h-full object-cover" fallbackText={item.title} />
                    </div>
                    <p className="text-xs p-2 line-clamp-2">{item.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {section === 'plan_to_watch' && (
          <section>
            {planToWatch.length === 0 ? (
              <EmptyState message='No has marcado ningún anime como "Por ver".' />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {planToWatch.map((item) => (
                  <Link
                    key={item.id}
                    to={`/anime/${item.anilist_id}`}
                    className="group rounded-xl overflow-hidden bg-surface hover:bg-surface-hover transition-colors">
                    <div className="aspect-[3/4] overflow-hidden">
                      <SafeImage src={item.image} alt={item.title} className="w-full h-full object-cover" fallbackText={item.title} />
                    </div>
                    <p className="text-xs p-2 line-clamp-2">{item.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {section === 'completed' && (
          <section>
            {completed.length === 0 ? (
              <EmptyState message='No has marcado ningún anime como "Visto".' />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {completed.map((item) => (
                  <Link
                    key={item.id}
                    to={`/anime/${item.anilist_id}`}
                    className="group rounded-xl overflow-hidden bg-surface hover:bg-surface-hover transition-colors">
                    <div className="aspect-[3/4] overflow-hidden">
                      <SafeImage src={item.image} alt={item.title} className="w-full h-full object-cover" fallbackText={item.title} />
                    </div>
                    <p className="text-xs p-2 line-clamp-2">{item.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {section === 'reading' && (
          <section>
            {reading.length === 0 ? (
              <EmptyState message='No has marcado ningún manga como "Leyendo".' />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {reading.map((item) => (
                  <Link
                    key={item.id}
                    to={`/manga/${item.anilist_id}`}
                    className="group rounded-xl overflow-hidden bg-surface hover:bg-surface-hover transition-colors">
                    <div className="aspect-[3/4] overflow-hidden">
                      <SafeImage src={item.image} alt={item.title} className="w-full h-full object-cover" fallbackText={item.title} />
                    </div>
                    <p className="text-xs p-2 line-clamp-2">{item.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {section === 'plan_to_read' && (
          <section>
            {planToRead.length === 0 ? (
              <EmptyState message='No has marcado ningún manga como "Por leer".' />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {planToRead.map((item) => (
                  <Link
                    key={item.id}
                    to={`/manga/${item.anilist_id}`}
                    className="group rounded-xl overflow-hidden bg-surface hover:bg-surface-hover transition-colors">
                    <div className="aspect-[3/4] overflow-hidden">
                      <SafeImage src={item.image} alt={item.title} className="w-full h-full object-cover" fallbackText={item.title} />
                    </div>
                    <p className="text-xs p-2 line-clamp-2">{item.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {section === 'completed_manga' && (
          <section>
            {completedManga.length === 0 ? (
              <EmptyState message='No has marcado ningún manga como "Completado".' />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {completedManga.map((item) => (
                  <Link
                    key={item.id}
                    to={`/manga/${item.anilist_id}`}
                    className="group rounded-xl overflow-hidden bg-surface hover:bg-surface-hover transition-colors">
                    <div className="aspect-[3/4] overflow-hidden">
                      <SafeImage src={item.image} alt={item.title} className="w-full h-full object-cover" fallbackText={item.title} />
                    </div>
                    <p className="text-xs p-2 line-clamp-2">{item.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {section === 'watchlist' && (
          <section>
            {watchlist.length === 0 ? (
              <EmptyState message="No has agregado ningún anime aún." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {watchlist.map((item) => (
                  <Link
                    key={item.id}
                    to={`/anime/${item.anilist_id}`}
                    className="group rounded-xl overflow-hidden bg-surface hover:bg-surface-hover transition-colors">
                    <div className="aspect-[3/4] overflow-hidden">
                      <SafeImage src={item.image} alt={item.title} className="w-full h-full object-cover" fallbackText={item.title} />
                    </div>
                    <p className="text-xs p-2 line-clamp-2">{item.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {section === 'favorites' && (
          <section>
            {favorites.length === 0 ? (
              <EmptyState message="No tienes favoritos aún." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {favorites.map((item) => (
                  <Link
                    key={item.id}
                    to={`/anime/${item.anilist_id}`}
                    className="group rounded-xl overflow-hidden bg-surface hover:bg-surface-hover transition-colors">
                    <div className="aspect-[3/4] overflow-hidden">
                      <SafeImage src={item.image} alt={item.title} className="w-full h-full object-cover" fallbackText={item.title} />
                    </div>
                    <p className="text-xs p-2 line-clamp-2">{item.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {section === 'history' && (
          <section>
            {history.length === 0 ? (
              <EmptyState message="No hay episodios vistos aún." />
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface hover:bg-surface-hover transition-colors group">
                    <Link to={`/anime/${item.anilist_id}`} className="shrink-0">
                      <div className="w-16 aspect-video rounded-lg overflow-hidden bg-surface-hover">
                        <SafeImage src={item.image} alt="" className="w-full h-full object-cover" />
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/anime/${item.anilist_id}`} className="text-sm truncate block">
                        {item.title}
                      </Link>
                      <Link
                        to={`/watch?anilistId=${item.anilist_id}&ep=${item.episode_number}&title=${encodeURIComponent(item.title || '')}&image=${encodeURIComponent(item.image || '')}`}
                        className="text-xs text-text-secondary hover:text-primary transition-colors">
                        Episodio {item.episode_number} → Ver
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {section === 'manga' && (
          <section>
            {mangaHistory.length === 0 ? (
              <EmptyState message="No hay capítulos leídos aún." />
            ) : (
              <div className="space-y-2">
                {mangaHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface hover:bg-surface-hover transition-colors group">
                    <Link to={`/manga/${item.anilist_id}`} className="shrink-0">
                      <div className="w-14 h-20 rounded-lg overflow-hidden bg-surface-hover">
                        <SafeImage src={item.image} alt="" className="w-full h-full object-cover" />
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/manga/${item.anilist_id}`} className="text-sm truncate block">
                        {item.title}
                      </Link>
                      <Link
                        to={`/manga/${item.anilist_id}/read?chapterId=${item.chapter_id}&chapter=${item.chapter_number}&title=${encodeURIComponent(item.title || '')}&image=${encodeURIComponent(item.image || '')}`}
                        className="text-xs text-text-secondary hover:text-primary transition-colors">
                        Capítulo {item.chapter_number} → Leer
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  )
}
