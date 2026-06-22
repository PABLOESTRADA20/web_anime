import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getTopAnime } from '../lib/api'

export default function Hero() {
  const [anime, setAnime] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTopAnime('trending', 1).then((res) => {
      if (res?.data?.length) setAnime(res.data[0])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading || !anime) return null

  const title = anime.title?.romaji || anime.title?.english || ''
  const image = anime.bannerImage || anime.image
  const id = anime.anilistId

  return (
    <section className="relative h-[420px] sm:h-[520px] rounded-3xl overflow-hidden mb-12 group">
      <img
        src={image}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.015)_2px,rgba(255,255,255,0.015)_4px)] pointer-events-none" />

      <div className="absolute inset-0 opacity-[0.15]" style={{
        background: 'radial-gradient(ellipse at 30% 50%, oklch(0.65 0.25 330 / 0.4) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, oklch(0.75 0.18 210 / 0.2) 0%, transparent 50%)'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute bottom-0 left-0 right-0 p-6 sm:p-10"
      >
        <motion.span
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-xs font-semibold text-neon-cyan uppercase tracking-[0.25em] inline-block mb-2"
        >
          ★ Tendencia #1
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-3xl sm:text-5xl lg:text-6xl font-heading font-bold leading-tight max-w-3xl"
          style={{textShadow: '0 4px 24px rgba(0,0,0,0.5)'}}
        >
          <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
            {title}
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="flex flex-wrap gap-2 mt-4"
        >
          {anime.genres?.slice(0, 4).map((g) => (
            <span key={g} className="text-xs px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur-sm">
              {g}
            </span>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-5"
        >
          <Link
            to={`/anime/${id}`}
            aria-label={`Ver detalles de ${title}`}
            className="group/btn relative inline-flex items-center gap-2 px-6 py-3 rounded-xl font-heading font-medium text-sm transition-all duration-300 overflow-hidden"
            style={{boxShadow: '0 0 20px oklch(0.65 0.25 330 / 0.3)'}}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary-hover" />
            <span className="absolute inset-[-1px] rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"
              style={{background: 'conic-gradient(from 0deg, oklch(0.65 0.25 330), oklch(0.75 0.18 210), oklch(0.65 0.25 330))'}}
            />
            <span className="absolute inset-[2px] rounded-[11px] bg-background/90 group-hover/btn:bg-background/70 transition-colors duration-300" />
            <span className="relative z-10 text-white flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              Ver detalles
            </span>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  )
}
