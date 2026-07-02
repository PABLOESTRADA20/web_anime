import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useI18n } from '../hooks/useI18n'

export default function InstallPrompt() {
  const { canInstall, promptInstall } = useInstallPrompt()
  const { t } = useI18n()

  if (!canInstall) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 sm:bottom-4 sm:left-auto sm:right-4 sm:w-80">
      <div className="bg-surface border border-neon-cyan/20 rounded-2xl p-4 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-primary flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">{t('install.title')}</p>
            <p className="text-[11px] text-text-secondary">{t('install.desc')}</p>
          </div>
          <button
            onClick={promptInstall}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/20 transition-colors">
            {t('install.action')}
          </button>
        </div>
      </div>
    </div>
  )
}
