import { useMemo } from 'react'
import { Link, useSearchParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import { useNovelLists } from '../hooks/useNovelLists'
import { useNovelFavorites } from '../hooks/useNovelFavorites'
import { useNovelHistory } from '../hooks/useNovelHistory'
import { GridSkeleton } from '../components/Skeletons'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'
import SafeImage from '../components/SafeImage'

const TABS = [
  { key: 'reading', emptyKey: 'myNovels.empty.reading', icon: '📖' },
  { key: 'favorites', emptyKey: 'myNovels.empty.favorites', icon: '❤️' },
  { key: 'completed', emptyKey: 'myNovels.empty.completed', icon: '✅' },
  { key: 'history', emptyKey: 'myNovels.empty.history', icon: '📚' },
]

function NovelCard({ item, index = 0 }) {
  const slug = item.novel_slug || item.slug
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
      <Link
        to={`/novel/${slug}`}
        className="group relative rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all duration-300 border border-transparent hover:border-neon-cyan/30 block">
        <div className="aspect-[3/4] overflow-hidden">
          <SafeImage
            src={item.cover || item.image}
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
  const slug = item.novel_slug
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
      <Link
        to={`/novel/${slug}/read?chapter=${item.chapter_number}`}
        className="group relative rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover transition-all duration-300 border border-transparent hover:border-neon-cyan/30 block">
        <div className="aspect-[3/4] overflow-hidden">
          <SafeImage
            src={item.cover || item.image}
            alt={item.novel_title || item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            fallbackText={item.novel_title || item.title}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-heading font-medium text-white line-clamp-2 leading-tight">{item.novel_title || item.title}</h3>
          <p className="text-[11px] text-neon-cyan mt-1">{t('myNovels.progress', { chapter: item.chapter_number })}</p>
        </div>
      </Link>
    </motion.div>
  )
}

export default function MyNovels() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'reading'

  const { getUserList, loading: listsLoading } = useNovelLists()
  const { favorites, loading: favsLoading } = useNovelFavorites()
  const { history, loading: histLoading } = useNovelHistory()

  const readingList = useMemo(() => (user ? getUserList('reading') : []), [getUserList, user])
  const completedList = useMemo(() => (user ? getUserList('completed') : []), [getUserList, user])
  if (!user) return <Navigate to="/login" replace />

  const tabData = {
    reading: { items: readingList, loading: listsLoading },
    favorites: { items: favorites, loading: favsLoading },
    completed: { items: completedList, loading: listsLoading },
    history: { items: history, loading: histLoading },
  }

  const current = tabData[activeTab] || tabData.reading

  return (
    <>
      <SeoHead title={t('myNovels.title')} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-bold mb-6">{t('myNovels.title')}</h1>

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
              {tab.icon} {t(`myNovels.tabs.${tab.key}`)}
            </button>
          ))}
        </div>

        {current.loading ? (
          <GridSkeleton count={12} />
        ) : current.items.length === 0 ? (
          <EmptyState
            icon={TABS.find((t) => t.key === activeTab)?.icon || '📭'}
            message={t(TABS.find((t) => t.key === activeTab)?.emptyKey || 'myNovels.empty.reading')}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {current.items.map((item, i) =>
              activeTab === 'history' ? (
                <HistoryCard key={`${item.novel_slug}-${item.chapter_number}`} item={item} index={i} t={t} />
              ) : (
                <NovelCard key={item.novel_slug || item.slug} item={item} index={i} />
              ),
            )}
          </div>
        )}
      </motion.div>
    </>
  )
}
