import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function AnimeCard({ anime, index = 0 }) {
  const id = anime.anilistId || anime.id
  const title = anime.title?.romaji || anime.title?.english || anime.title?.native || anime.name || 'Sin título'
  const image = anime.image || anime.posterImage
  const score = anime.score || anime.averageScore
  const format = anime.format

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link
        to={`/anime/${id}`}
        className="group relative rounded-2xl overflow-hidden bg-surface hover:bg-surface-hover
                   transition-all duration-300 border border-transparent hover:border-neon-cyan/30"
      >
      <div className="aspect-[3/4] overflow-hidden">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {score && (
        <span className="absolute top-2 right-2 bg-neon-cyan/20 text-neon-cyan font-mono text-xs font-bold px-2 py-1 rounded-lg" style={{boxShadow: '0 0 8px rgba(0,240,255,0.3)'}}>
          {score}
        </span>
      )}

      {format && (
        <span className="absolute top-2 left-2 bg-primary/20 text-primary text-xs font-mono font-medium px-2 py-1 rounded-lg tracking-wider">
          {format}
        </span>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="text-sm font-heading font-medium text-white line-clamp-2 leading-tight">
          {title}
        </h3>
      </div>
      </Link>
    </motion.div>
  )
}
