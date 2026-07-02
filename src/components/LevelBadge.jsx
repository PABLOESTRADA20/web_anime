import { useI18n } from '../hooks/useI18n'

export function LevelBadge({ level, size = 'md' }) {
  const { t } = useI18n()
  const sizeClasses = { sm: 'text-[10px] px-1.5 py-0.5', md: 'text-xs px-2 py-1', lg: 'text-sm px-3 py-1.5' }
  return (
    <span
      className={`${sizeClasses[size] || sizeClasses.md} font-bold font-mono bg-gradient-to-r from-neon-cyan/20 to-primary/20 text-neon-cyan border border-neon-cyan/30 rounded-full inline-flex items-center gap-1`}>
      <svg className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {t('common.level')} {level}
    </span>
  )
}

export function XpProgressBar({ xp, showLabel = true }) {
  const { t } = useI18n()
  const xpForLevel = (lvl) => lvl * lvl * 100
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 100)))
  const current = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const progress = Math.min(100, Math.round(((xp - current) / (next - current)) * 100))

  return (
    <div className="flex items-center gap-3">
      {showLabel && <span className="text-[10px] text-text-secondary font-mono whitespace-nowrap">{t('common.xp', { count: xp })}</span>}
      <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] text-text-secondary font-mono whitespace-nowrap">
          {t('common.level')} {level}
        </span>
      )}
    </div>
  )
}
