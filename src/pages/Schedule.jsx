import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getSchedule } from '../lib/anilist'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { ScheduleSkeleton } from '../components/Skeletons'
import SafeImage from '../components/SafeImage'
import { useI18n } from '../hooks/useI18n'

export default function Schedule() {
  const { t, locale } = useI18n()
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const toast = useToast()

  function formatAiringTime(timestamp) {
    const d = new Date(timestamp * 1000)
    const now = new Date()
    const diff = d - now
    if (diff < 0) return t('schedule.aired')
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
    return `${hours}h ${minutes}m`
  }

  function formatDate(timestamp) {
    const d = new Date(timestamp * 1000)
    return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    getSchedule(1, 50)
      .then((res) => {
        if (!ac.signal.aborted) {
          setSchedule(res.data || [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          setLoading(false)
          toast(t('errors.unexpected'), 'error')
        }
      })
    return () => ac.abort()
  }, [toast, t])

  const filtered =
    filter === 'all'
      ? schedule
      : schedule.filter((s) => {
          const d = new Date(s.airingAt * 1000)
          return d.getDay() === Number(filter)
        })

  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

  return (
    <>
      <SeoHead
        title={filter !== 'all' ? `${t('schedule.title')} — ${t(`schedule.days.${dayKeys[Number(filter)]}`)}` : t('schedule.title')}
      />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-bold mb-6">{t('schedule.title')}</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'all' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
            }`}>
            {t('schedule.all')}
          </button>
          {dayKeys.map((day, i) => (
            <button
              key={day}
              onClick={() => setFilter(String(i))}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === String(i) ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
              }`}>
              {t(`schedule.days.${day}`)}
            </button>
          ))}
        </div>

        {loading ? (
          <ScheduleSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState message={t('schedule.noData')} />
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => {
              const anime = s.media
              const title = anime?.title?.romaji || anime?.title?.english || t('common.untitled')
              return (
                <Link
                  key={s.id}
                  to={`/anime/${anime.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface hover:bg-surface-hover transition-colors group">
                  <div className="shrink-0 w-10 h-14 rounded-lg overflow-hidden bg-surface-hover">
                    <SafeImage src={anime?.coverImage?.large} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{title}</p>
                    <p className="text-xs text-text-secondary">{t('episode.number', { n: s.episode })}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-primary">{formatAiringTime(s.airingAt)}</p>
                    <p className="text-[10px] text-text-secondary">{formatDate(s.airingAt)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </motion.div>
    </>
  )
}
