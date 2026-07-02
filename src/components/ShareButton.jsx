import { memo } from 'react'
import { useToast } from './Toast'
import { useI18n } from '../hooks/useI18n'

const ShareButton = memo(function ShareButton({ title, url, className = '' }) {
  const toast = useToast()
  const { t } = useI18n()
  const fullUrl = url || window.location.href

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: fullUrl })
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(fullUrl)
        toast(t('common.copied'), 'success', 3000)
      } catch {
        toast(t('common.copyError'), 'error', 3000)
      }
    }
  }

  return (
    <button
      onClick={handleShare}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium bg-surface text-text-secondary border border-white/10 hover:bg-surface-hover hover:text-text-primary transition-colors flex items-center gap-1.5 ${className}`}
      aria-label={t('common.share')}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        />
      </svg>
      {t('common.share')}
    </button>
  )
})

export default ShareButton
