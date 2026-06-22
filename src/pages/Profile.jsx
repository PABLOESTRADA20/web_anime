import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import SeoHead from '../components/SeoHead'
import { useWatchlist } from '../hooks/useWatchlist'
import { useAnimeFavorites } from '../hooks/useAnimeFavorites'
import { useHistory } from '../hooks/useHistory'
import { useMangaHistory } from '../hooks/useMangaHistory'
import { useAnimeLists } from '../hooks/useAnimeLists'

export default function Profile() {
  const { user, logout } = useAuth()
  const { watchlist } = useWatchlist()
  const { favorites } = useAnimeFavorites()
  const { history } = useHistory()
  const { mangaHistory } = useMangaHistory()
  const { getUserList } = useAnimeLists()

  const watching = getUserList('watching')
  const completed = getUserList('completed')
  const planToWatch = getUserList('plan_to_watch')

  const [section, setSection] = useState('watching')

  const tabs = useMemo(() => [
    { key: 'watching', label: 'Mirando', count: watching.length },
    { key: 'plan_to_watch', label: 'Por ver', count: planToWatch.length },
    { key: 'completed', label: 'Visto', count: completed.length },
    { key: 'watchlist', label: 'Mi lista', count: watchlist.length },
    { key: 'favorites', label: 'Favoritos', count: favorites.length },
    { key: 'history', label: 'Historial anime', count: history.length },
    { key: 'manga', label: 'Historial manga', count: mangaHistory.length },
  ], [watching.length, planToWatch.length, completed.length, watchlist.length, favorites.length, history.length, mangaHistory.length])

  return (
    <>
      <SeoHead title={user ? `Perfil de ${user.email?.split('@')[0]}` : 'Perfil'} />
      <div className="max-w-3xl mx-auto">
      <div className="bg-surface rounded-2xl p-6 mb-8">
        <h1 className="text-xl font-bold mb-1">{user.email?.split('@')[0]}</h1>
        <p className="text-sm text-text-secondary">{user.email}</p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={logout}
            className="px-4 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSection(t.key)}
            className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              section === t.key
                ? 'bg-primary text-white'
                : 'bg-surface text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {section === 'watching' && (
        <section>
          {watching.length === 0 ? (
            <p className="text-text-secondary text-sm">No has marcado ningún anime como "Mirando".</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {watching.map((item) => (
                <Link
                  key={item.id}
                  to={`/anime/${item.anilist_id}`}
                  className="group rounded-xl overflow-hidden bg-surface hover:bg-surface-hover transition-colors"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
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
            <p className="text-text-secondary text-sm">No has marcado ningún anime como "Por ver".</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {planToWatch.map((item) => (
                <Link
                  key={item.id}
                  to={`/anime/${item.anilist_id}`}
                  className="group rounded-xl overflow-hidden bg-surface hover:bg-surface-hover transition-colors"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
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
            <p className="text-text-secondary text-sm">No has marcado ningún anime como "Visto".</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {completed.map((item) => (
                <Link
                  key={item.id}
                  to={`/anime/${item.anilist_id}`}
                  className="group rounded-xl overflow-hidden bg-surface hover:bg-surface-hover transition-colors"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
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
            <p className="text-text-secondary text-sm">No has agregado ningún anime aún.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {watchlist.map((item) => (
                <Link
                  key={item.id}
                  to={`/anime/${item.anilist_id}`}
                  className="group rounded-xl overflow-hidden bg-surface hover:bg-surface-hover transition-colors"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
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
            <p className="text-text-secondary text-sm">No tienes favoritos aún.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {favorites.map((item) => (
                <Link
                  key={item.id}
                  to={`/anime/${item.anilist_id}`}
                  className="group rounded-xl overflow-hidden bg-surface hover:bg-surface-hover transition-colors"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
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
            <p className="text-text-secondary text-sm">No hay episodios vistos aún.</p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface hover:bg-surface-hover transition-colors group"
                >
                  <Link to={`/anime/${item.anilist_id}`} className="shrink-0">
                    <div className="w-16 aspect-video rounded-lg overflow-hidden bg-surface-hover">
                      {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/anime/${item.anilist_id}`} className="text-sm truncate block">
                      {item.title}
                    </Link>
                    <Link
                      to={`/watch?anilistId=${item.anilist_id}&ep=${item.episode_number}&title=${encodeURIComponent(item.title || '')}&image=${encodeURIComponent(item.image || '')}`}
                      className="text-xs text-text-secondary hover:text-primary transition-colors"
                    >
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
            <p className="text-text-secondary text-sm">No hay capítulos leídos aún.</p>
          ) : (
            <div className="space-y-2">
              {mangaHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface hover:bg-surface-hover transition-colors group"
                >
                  <Link to={`/manga/${item.anilist_id}`} className="shrink-0">
                    <div className="w-14 h-20 rounded-lg overflow-hidden bg-surface-hover">
                      {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/manga/${item.anilist_id}`} className="text-sm truncate block">
                      {item.title}
                    </Link>
                    <Link
                      to={`/manga/${item.anilist_id}/read?chapterId=${item.chapter_id}&chapter=${item.chapter_number}&title=${encodeURIComponent(item.title || '')}&image=${encodeURIComponent(item.image || '')}`}
                      className="text-xs text-text-secondary hover:text-primary transition-colors"
                    >
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
