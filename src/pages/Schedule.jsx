import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getSchedule } from '../lib/anilist'
import SeoHead from '../components/SeoHead'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'
import SafeImage from '../components/SafeImage'

function formatAiringTime(timestamp) {
  const d = new Date(timestamp * 1000)
  const now = new Date()
  const diff = d - now
  if (diff < 0) return 'Emitido'
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  return `${hours}h ${minutes}m`
}

function formatDate(timestamp) {
  const d = new Date(timestamp * 1000)
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function Schedule() {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const toast = useToast()

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
          toast('Error al cargar el calendario', 'error')
        }
      })
    return () => ac.abort()
  }, [toast])

  const filtered =
    filter === 'all'
      ? schedule
      : schedule.filter((s) => {
          const d = new Date(s.airingAt * 1000)
          const day = d.getDay()
          const dayMap = { 0: 'dom', 1: 'lun', 2: 'mar', 3: 'mié', 4: 'jue', 5: 'vie', 6: 'sáb' }
          return dayMap[day] === filter
        })

  const days = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

  return (
    <>
      <SeoHead title={filter !== 'all' ? `Calendario — ${filter}` : 'Calendario de emisión'} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-bold mb-6">Calendario de emisión</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === 'all' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
            }`}>
            Todos
          </button>
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setFilter(day)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === day ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
              }`}>
              {day}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState message="No hay episodios programados." />
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => {
              const anime = s.media
              const title = anime?.title?.romaji || anime?.title?.english || 'Sin título'
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
                    <p className="text-xs text-text-secondary">Episodio {s.episode}</p>
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
