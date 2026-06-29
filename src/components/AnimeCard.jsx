import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const AnimeCard = memo(function AnimeCard({ anime, index = 0, progress }) {
  const id = anime.anilistId || anime.id
  const title = anime.title_es || anime.title?.romaji || anime.title?.english || anime.title?.native || anime.name || 'Sin título'
  const image = anime.image || anime.posterImage
  const score = anime.score || anime.averageScore
  const format = anime.format
  const watchEp = anime.watchEp
  const [imgFailed, setImgFailed] = useState(false)

  const linkTo = watchEp
    ? `/watch?anilistId=${id}&ep=${watchEp}&title=${encodeURIComponent(title)}&image=${encodeURIComponent(image || '')}`
    : `/anime/${id}`

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
      <Link to={linkTo} className="group relative rounded-2xl overflow-hidden bg-surface card-hover block">
        <div className="aspect-[3/4] overflow-hidden relative">
          {imgFailed ? (
            <div className="w-full h-full flex items-center justify-center bg-surface text-text-secondary/40 text-xs p-4 text-center">
              {title}
            </div>
          ) : image ? (
            <img
              src={image}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface text-text-secondary/40 text-xs p-4 text-center">
              {title}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        {score && (
          <span className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-neon-cyan font-mono text-xs font-bold px-2 py-1 rounded-lg border border-neon-cyan/20">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {score}
          </span>
        )}

        {anime.title_es && (
          <span className="absolute top-2 left-2 bg-accent/80 backdrop-blur-sm text-white text-[10px] font-mono font-semibold px-2 py-1 rounded-lg border border-accent/40 tracking-wider uppercase z-10">
            ES
          </span>
        )}
        {format && (
          <span
            className={`absolute ${anime.title_es ? 'top-10' : 'top-2'} left-2 bg-black/60 backdrop-blur-sm text-primary text-[10px] font-mono font-semibold px-2 py-1 rounded-lg border border-primary/20 tracking-wider uppercase`}>
            {format}
          </span>
        )}

        {watchEp && (
          <span className="absolute bottom-10 right-2 bg-primary/90 backdrop-blur-sm text-white text-[10px] font-mono font-semibold px-2 py-1 rounded-lg border border-primary/40">
            Ep. {watchEp}
          </span>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-heading font-semibold text-white line-clamp-2 leading-tight drop-shadow-lg">{title}</h3>
        </div>

        {progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div className="h-full bg-neon-cyan transition-all duration-300" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
          </div>
        )}

        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/0 group-hover:ring-primary/30 transition-all duration-300" />
      </Link>
    </motion.div>
  )
})

export default AnimeCard
