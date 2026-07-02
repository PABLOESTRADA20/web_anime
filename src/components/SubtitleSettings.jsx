import { useState } from 'react'
import { motion } from 'framer-motion'
import { getSubtitlePrefs, saveGlobalSubtitlePrefs } from '../utils/subtitlePreferences'
import { useI18n } from '../hooks/useI18n'

export function SubtitleSettings({ onClose }) {
  const { t } = useI18n()
  const [prefs, setPrefs] = useState(getSubtitlePrefs)

  function handleChange(key, value) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    saveGlobalSubtitlePrefs(next)
  }

  const sizes = ['sm', 'base', 'lg', 'xl', '2xl']

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute top-full right-0 mt-2 bg-surface rounded-xl border border-white/10 p-4 w-64 shadow-2xl z-50">
      <h3 className="text-sm font-semibold text-white mb-4">{t('video.subtitles')}</h3>

      <div className="mb-4">
        <p className="text-xs text-text-secondary mb-2">Tamaño</p>
        <div className="flex gap-1.5">
          {sizes.map((s) => (
            <button
              key={s}
              onClick={() => handleChange('fontSize', s)}
              className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                prefs.fontSize === s ? 'bg-accent text-white' : 'bg-surface-hover text-text-secondary hover:text-text-primary'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs text-text-secondary mb-2">Posición</p>
        <div className="flex gap-2">
          {[
            ['bottom', '↓ Abajo'],
            ['top', '↑ Arriba'],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => handleChange('position', val)}
              className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                prefs.position === val ? 'bg-accent text-white' : 'bg-surface-hover text-text-secondary hover:text-text-primary'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs text-text-secondary mb-2">
          Sincronización: {prefs.offset > 0 ? '+' : ''}
          {prefs.offset}s
        </p>
        <input
          type="range"
          min="-5"
          max="5"
          step="0.1"
          value={prefs.offset}
          onChange={(e) => handleChange('offset', parseFloat(e.target.value))}
          className="w-full accent-accent"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer mb-4">
        <input
          type="checkbox"
          checked={prefs.enableTransitions}
          onChange={(e) => handleChange('enableTransitions', e.target.checked)}
          className="rounded accent-accent"
        />
        <span className="text-xs text-text-secondary">Transiciones suaves</span>
      </label>

      <button onClick={onClose} className="w-full text-xs py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-colors">
        {t('common.close')}
      </button>
    </motion.div>
  )
}
