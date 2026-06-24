import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function WatchParty({ participants, connected, partyId, onJoin, onLeave }) {
  const [showPanel, setShowPanel] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyLink = useCallback(() => {
    if (partyId) {
      const url = `${window.location.origin}${window.location.pathname}${window.location.search}&party=${partyId}`
      navigator.clipboard?.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }, [partyId])

  if (!connected && participants.length === 0) {
    return (
      <button
        onClick={onJoin}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/20 transition-colors">
        Iniciar Watch Party
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 ${
          connected ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-surface text-text-secondary border-white/10'
        }`}>
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-text-secondary'}`} />
        {connected ? `${participants.length} viendo` : 'Watch Party'}
      </button>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-full mb-2 left-0 w-64 p-4 rounded-xl bg-surface border border-white/10 shadow-xl">
            <p className="text-xs font-medium text-text-primary mb-2">Watch Party</p>

            {connected && (
              <div className="space-y-1.5 mb-3">
                <p className="text-[10px] text-text-secondary">Participantes:</p>
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs text-text-secondary">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                      {p.email[0].toUpperCase()}
                    </div>
                    {p.email}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {connected ? (
                <>
                  <button
                    onClick={copyLink}
                    className="flex-1 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-surface-hover text-text-secondary hover:text-text-primary transition-colors">
                    {copied ? 'Copiado' : 'Copiar link'}
                  </button>
                  <button
                    onClick={onLeave}
                    className="flex-1 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                    Salir
                  </button>
                </>
              ) : (
                <button
                  onClick={onJoin}
                  className="flex-1 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 transition-colors">
                  Unirse
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
