import { useMemo } from 'react'
import { Link, useSearchParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { useMangaLists } from '../hooks/useMangaLists'
import { useMangaFavorites } from '../hooks/useMangaFavorites'
import { useMangaHistory } from '../hooks/useMangaHistory'
import { GridSkeleton } from '../components/Skeletons'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'
import SafeImage from '../components/SafeImage'

const TABS = [
  { key: 'reading', emptyKey: 'myMangas.empty.reading', icon: '📖' },
  { key: 'favorites', emptyKey: 'myMangas.empty.favorites', icon: '❤️' },
  { key: 'completed', emptyKey: 'myMangas.empty.completed', icon: '✅' },
  { key: 'history', emptyKey: 'myMangas.empty.history', icon: '📚' },
]

function MangaCard({ item, index = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
      <Link
        to={`/manga/${item.anilist_id}`}
        className="group relative rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all duration-300 border border-transparent hover:border-neon-cyan/30 block">
        <div className="aspect-[3/4] overflow-hidden">
          <SafeImage
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            fallbackText={item.title}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-heading font-medium text-white line-clamp-2 leading-tight">{item.title}</h3>
        </div>
      </Link>
    </motion.div>
  )
}

function HistoryCard({ item, index = 0, t }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
      <Link
        to={`/manga/${item.anilist_id}/read?chapterId=${item.chapter_id}&chapter=${item.chapter_number}&title=${encodeURIComponent(item.title)}&image=${encodeURIComponent(item.image || '')}`}
        className="group relative rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all duration-300 border border-transparent hover:border-neon-cyan/30 block">
        <div className="aspect-[3/4] overflow-hidden">
          <SafeImage
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            fallbackText={item.title}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-heading font-medium text-white line-clamp-2 leading-tight">{item.title}</h3>
          <p className="text-[11px] text-neon-cyan mt-1">
            {t('myMangas.progress', { chapter: item.chapter_number, page: item.page || 1 })}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}

export default function MyMangas() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'reading'

  const { getUserList, loading: listsLoading } = useMangaLists()
  const { favorites, loading: favsLoading } = useMangaFavorites()
  const { mangaHistory } = useMangaHistory()

  const readingList = useMemo(() => (user ? getUserList('reading') : []), [getUserList, user])
  const completedList = useMemo(() => (user ? getUserList('completed') : []), [getUserList, user])
  if (!user) return <Navigate to="/login" replace />

  const tabData = {
    reading: { items: readingList, loading: listsLoading },
    favorites: { items: favorites, loading: favsLoading },
    completed: { items: completedList, loading: listsLoading },
    history: { items: mangaHistory, loading: false },
  }

  const current = tabData[activeTab] || tabData.reading

  return (
    <>
      <SeoHead title={t('myMangas.title')} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-bold mb-6">{t('myMangas.title')}</h1>

        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSearchParams({ tab: tab.key })}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-surface text-text-secondary border border-white/10 hover:text-text-primary hover:border-white/20'
              }`}>
              {tab.icon} {t(`myMangas.tabs.${tab.key}`)}
            </button>
          ))}
        </div>

        {current.loading ? (
          <GridSkeleton count={12} />
        ) : current.items.length === 0 ? (
          <EmptyState
            icon={TABS.find((t) => t.key === activeTab)?.icon || '📭'}
            message={t(TABS.find((t) => t.key === activeTab)?.emptyKey || 'myMangas.empty.reading')}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {current.items.map((item, i) =>
              activeTab === 'history' ? (
                <HistoryCard key={`${item.anilist_id}-${item.chapter_number}`} item={item} index={i} t={t} />
              ) : (
                <MangaCard key={item.anilist_id} item={item} index={i} />
              ),
            )}
          </div>
        )}
      </motion.div>
    </>
  )
}
