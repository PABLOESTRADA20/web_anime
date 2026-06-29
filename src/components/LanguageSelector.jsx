import { memo } from 'react'
import { motion } from 'framer-motion'
import { FLAG_MAP } from './FlagIcon'

const LANG_INFO = {
  japanese: { label: 'Japonés', sublabel: 'Sub', desc: 'Audio original con subtítulos' },
  english: { label: 'Inglés', sublabel: 'Dub', desc: 'Doblaje al inglés' },
  spanish: { label: 'Español', sublabel: 'LATAM', desc: 'Doblaje latino, sin subtítulos' },
}

function StatusIcon({ available, error }) {
  if (error) {
    return (
      <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    )
  }
  if (available) {
    return (
      <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )
  }
  return null
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-6 flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-10 rounded-lg bg-white/10" />
          <div className="w-20 h-4 rounded bg-white/10" />
          <div className="w-24 h-3 rounded bg-white/5" />
          <div className="w-32 h-3 rounded bg-white/5" />
        </div>
      ))}
    </div>
  )
}

const LanguageSelector = memo(function LanguageSelector({ options, loading, animeInfo, onSelect, onSkip }) {
  const hasOptions = options && Object.values(options).some((o) => o.available || o.error)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-gray-950 via-gray-900 to-black flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-3xl mx-auto text-center space-y-8">
        {animeInfo?.image && (
          <motion.img
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            src={animeInfo.image}
            alt=""
            className="w-24 h-32 rounded-xl object-cover mx-auto shadow-2xl shadow-black/50 ring-1 ring-white/10"
          />
        )}

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-white">{animeInfo?.title || 'Cargando...'}</h1>
          <p className="text-sm text-text-secondary">Episodio {animeInfo?.episode || '?'}</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-medium text-text-secondary">Selecciona idioma de audio</h2>

          {loading ? (
            <LoadingSkeleton />
          ) : hasOptions ? (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                {Object.entries(options).map(([key, opt], idx) => {
                  const info = LANG_INFO[key]
                  const Flag = FLAG_MAP[opt.flag]
                  const disabled = !opt.available

                  return (
                    <motion.button
                      key={key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + idx * 0.08 }}
                      onClick={() => !disabled && onSelect(key)}
                      disabled={disabled}
                      className={`relative rounded-2xl p-6 flex flex-col items-center gap-3 transition-all border ${
                        disabled
                          ? 'bg-white/[0.02] border-white/5 opacity-40 cursor-not-allowed'
                          : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 cursor-pointer group'
                      }`}>
                      {Flag && (
                        <div className="relative">
                          <Flag className="w-16 h-10 rounded-md shadow-lg" />
                        </div>
                      )}

                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-base font-semibold text-white">{info.label}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-text-secondary uppercase tracking-wider">
                            {info.sublabel}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary/60 mt-1">{info.desc}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusIcon available={opt.available} error={opt.error} />
                        <span className={`text-xs ${opt.available ? 'text-green-400' : 'text-red-400'}`}>
                          {opt.available ? 'Disponible' : opt.error || 'No disponible'}
                        </span>
                      </div>

                      {opt.provider && opt.available && <span className="text-[10px] text-text-secondary/40 mt-1">{opt.provider}</span>}
                    </motion.button>
                  )
                })}
              </div>
              {Object.values(options).every((o) => !o.available) && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => onSkip?.()}
                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white rounded-xl text-sm font-medium transition-colors border border-white/10 hover:border-white/20">
                    Continuar con Sub (Japonés) por defecto
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-text-secondary">Verificando opciones de audio...</p>
            </div>
          )}
        </div>

        <p className="text-[10px] text-text-secondary/30">Los subtítulos en español se activarán automáticamente si están disponibles</p>
      </div>
    </motion.div>
  )
})

export default LanguageSelector
