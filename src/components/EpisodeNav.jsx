import { memo } from 'react'
import { motion } from 'framer-motion'

const EpisodeNav = memo(function EpisodeNav({ sortedEps, goToEpisode, prevEp, nextEp, epNum, showEpisodes, setShowEpisodes }) {
  if (!sortedEps?.length) return null

  return (
    <>
      <div className="flex items-center gap-1.5">
        {prevEp ? (
          <button
            onClick={() => goToEpisode(prevEp)}
            aria-label={`Episodio anterior: ${prevEp.number}`}
            className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-text-secondary hover:text-text-primary transition-colors border border-white/5">
            ← Ep. {prevEp.number}
          </button>
        ) : (
          <div className="px-3 py-1.5 text-xs text-text-secondary/40">← Ep. —</div>
        )}

        <button
          onClick={() => setShowEpisodes((v) => !v)}
          aria-label="Lista de episodios"
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            showEpisodes
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-white/20'
          }`}>
          Ep. {epNum} {showEpisodes ? '↑' : '↓'}
        </button>

        {nextEp ? (
          <button
            onClick={() => goToEpisode(nextEp)}
            aria-label={`Siguiente episodio: ${nextEp.number}`}
            className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-text-secondary hover:text-text-primary transition-colors border border-white/5">
            Ep. {nextEp.number} →
          </button>
        ) : (
          <div className="px-3 py-1.5 text-xs text-text-secondary/40">Ep. — →</div>
        )}
      </div>

      {showEpisodes && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="w-full">
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5 max-h-48 overflow-y-auto p-2 rounded-xl bg-surface/50 border border-white/5">
            {sortedEps.map((ep) => (
              <button
                key={ep.number}
                onClick={() => {
                  goToEpisode(ep)
                  setShowEpisodes(false)
                }}
                aria-label={`Episodio ${ep.number}${ep.title ? `: ${ep.title}` : ''}`}
                className={`aspect-square rounded-lg text-xs font-medium transition-colors border flex items-center justify-center ${
                  ep.number === epNum
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary hover:border-primary/30 hover:bg-surface-hover'
                }`}>
                {ep.number}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </>
  )
})

export default EpisodeNav
