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
    <section className="relative h-[400px] sm:h-[500px] rounded-3xl overflow-hidden mb-10">
      <img
        src={image}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

      <div className="absolute inset-0 aurora-gradient mix-blend-overlay opacity-20" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.02)_2px,rgba(255,255,255,0.02)_4px)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute bottom-0 left-0 right-0 p-6 sm:p-10"
      >
        <span className="text-xs font-semibold text-neon-cyan uppercase tracking-[0.2em]">Tendencia</span>
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-2xl sm:text-4xl font-heading font-bold text-white mt-2 max-w-2xl leading-tight"
          style={{textShadow: '0 0 30px rgba(0,240,255,0.3)'}}
        >
          {title}
        </motion.h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex gap-3 mt-4"
        >
          {anime.genres?.slice(0, 3).map((g) => (
            <span key={g} className="text-xs bg-white/5 px-3 py-1 border border-white/10 rounded-full text-white/80">
              {g}
            </span>
          ))}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <Link
            to={`/anime/${id}`}
            className="inline-block mt-4 px-6 py-2.5 bg-transparent border border-primary text-primary hover:bg-primary hover:text-white rounded-xl font-heading font-medium text-sm transition-all"
            style={{boxShadow: '0 0 15px rgba(255,0,110,0.3)'}}
          >
            Ver detalles
          </Link>
        </motion.div>
      </motion.div>
    </section>
  )
}
