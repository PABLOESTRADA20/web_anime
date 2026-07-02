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
import { useI18n } from '../hooks/useI18n'
import SafeImage from '../components/SafeImage'
import EmptyState from '../components/EmptyState'
import { useGamification } from '../hooks/useGamification'
import { LevelBadge, XpProgressBar } from '../components/LevelBadge'
import { ACHIEVEMENTS } from '../lib/achievements'

function AnilistImportForm({ onImport, importing, result, error }) {
  const { t } = useI18n()
  const [username, setUsername] = useState('')

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder={t('profile.importPlaceholder')}
        className="w-36 px-3 py-1.5 rounded-lg bg-surface text-xs text-text-primary border border-white/10 focus:border-primary/50 outline-none transition-colors"
        onKeyDown={(e) => e.key === 'Enter' && username && onImport(username)}
      />
      <button
        onClick={() => onImport(username)}
        disabled={importing || !username}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-colors disabled:opacity-40">
        {importing ? t('profile.importing') : t('profile.import')}
      </button>
      {result && (
        <span className="text-[10px] text-green-400">
          {t('profile.importResult', { watching: result.watching, planToWatch: result.plan_to_watch, completed: result.completed })}
        </span>
      )}
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  )
}

export default function Profile() {
  const { t } = useI18n()
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
  const { profile: gProfile, progress: gProgress, unlockedSet, loading: gLoading } = useGamification()

  const watching = getUserList('watching')
  const completed = getUserList('completed')
  const planToWatch = getUserList('plan_to_watch')
  const reading = getMangaList('reading')
  const completedManga = getMangaList('completed')
  const planToRead = getMangaList('plan_to_read')

  const [section, setSection] = useState('watching')

  const tabs = useMemo(
    () => [
      { key: 'watching', label: t('anime.listStatus.watching'), count: watching.length },
      { key: 'plan_to_watch', label: t('anime.listStatus.plan_to_watch'), count: planToWatch.length },
      { key: 'completed', label: t('anime.listStatus.completed'), count: completed.length },
      { key: 'reading', label: t('manga.listStatus.reading'), count: reading.length },
      { key: 'plan_to_read', label: t('manga.listStatus.plan_to_read'), count: planToRead.length },
      { key: 'completed_manga', label: t('manga.listStatus.completed'), count: completedManga.length },
      { key: 'watchlist', label: t('profile.watchlist'), count: watchlist.length },
      { key: 'favorites', label: t('profile.favorites'), count: favorites.length },
      { key: 'history', label: t('profile.history'), count: history.length },
      { key: 'manga', label: t('profile.mangaHistory'), count: mangaHistory.length },
      { key: 'achievements', label: t('common.achievements'), count: unlockedSet.size },
    ],
    [
      watching.length,
      planToWatch.length,
      completed.length,
      reading.length,
      planToRead.length,
      t,
      completedManga.length,
      watchlist.length,
      favorites.length,
      history.length,
      mangaHistory.length,
      unlockedSet.size,
    ],
  )

  return (
    <>
      <SeoHead title={user ? t('profile.titleWithUser', { name: user.email?.split('@')[0] }) : t('profile.title')} />
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
              <strong className="text-text-primary">{followerCount}</strong> {t('profile.followers')}
            </span>
            <span className="text-xs text-text-secondary">
              <strong className="text-text-primary">{followingCount}</strong> {t('profile.following')}
            </span>
          </div>
          {gProfile && !gLoading && (
            <div className="mb-4 p-3 rounded-xl bg-surface-hover/50 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <LevelBadge level={gProgress?.level || 1} size="md" />
                <span className="text-[10px] text-text-secondary font-mono">
                  {t('common.achievementsCount', { count: unlockedSet.size, total: ACHIEVEMENTS.length })}
                </span>
              </div>
              <XpProgressBar xp={gProfile.xp || 0} showLabel />
            </div>
          )}
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={logout}
              className="px-4 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-colors">
              {t('profile.logout')}
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
                {push.loading ? '...' : push.subscribed ? t('profile.notificationsOn') : t('profile.notificationsOff')}
              </button>
              {push.permission === 'denied' && <p className="text-[10px] text-red-400 mt-1">{t('profile.notificationsDenied')}</p>}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSection(tab.key)}
              className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                section === tab.key ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
              }`}>
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {section === 'watching' && (
          <section>
            {watching.length === 0 ? (
              <EmptyState message={t('profile.empty.watching')} />
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
              <EmptyState message={t('profile.empty.planToWatch')} />
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
              <EmptyState message={t('profile.empty.completed')} />
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
              <EmptyState message={t('profile.empty.readingManga')} />
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
              <EmptyState message={t('profile.empty.planToReadManga')} />
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
              <EmptyState message={t('profile.empty.completedManga')} />
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
              <EmptyState message={t('profile.empty.watchlist')} />
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
              <EmptyState message={t('profile.empty.favorites')} />
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
              <EmptyState message={t('profile.empty.history')} />
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
                        {t('profile.watchEpisode', { number: item.episode_number })}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {section === 'achievements' && (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ACHIEVEMENTS.map((ach) => {
                const earned = unlockedSet.has(ach.id)
                return (
                  <div
                    key={ach.id}
                    className={`p-4 rounded-xl border transition-all ${
                      earned ? 'bg-neon-cyan/5 border-neon-cyan/20' : 'bg-surface border-white/5 opacity-50'
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{ach.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${earned ? 'text-text-primary' : 'text-text-secondary'}`}>{t(ach.nameKey)}</p>
                        <p className="text-[11px] text-text-secondary">{t(ach.descKey)}</p>
                      </div>
                      {earned ? (
                        <svg className="w-5 h-5 text-neon-cyan shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-text-secondary/30 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {section === 'manga' && (
          <section>
            {mangaHistory.length === 0 ? (
              <EmptyState message={t('profile.empty.mangaHistory')} />
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
                        {t('profile.readChapter', { number: item.chapter_number })}
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
