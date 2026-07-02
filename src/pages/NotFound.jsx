import { Link } from 'react-router-dom'
import SeoHead from '../components/SeoHead'
import { useI18n } from '../hooks/useI18n'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <>
      <SeoHead title={t('errors.notFound404')} />
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-text-secondary mb-6">{t('errors.pageNotFound')}</p>
        <Link to="/" className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm hover:bg-primary-hover transition-colors">
          {t('errors.goHome')}
        </Link>
      </div>
    </>
  )
}
