import { Link } from 'react-router-dom'
import { useI18n } from '../hooks/useI18n'

export default function Footer() {
  const { t } = useI18n()
  return (
    <footer className="border-t border-primary/10 py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-4">
          <Link to="/privacy" className="font-mono text-xs text-text-secondary/60 hover:text-neon-cyan transition-colors">
            {t('footer.privacy', 'Privacidad')}
          </Link>
          <Link to="/terms" className="font-mono text-xs text-text-secondary/60 hover:text-neon-cyan transition-colors">
            {t('footer.terms', 'Términos')}
          </Link>
          <Link to="/dmca" className="font-mono text-xs text-text-secondary/60 hover:text-neon-cyan transition-colors">
            DMCA
          </Link>
          <a
            href="https://github.com/PABLOESTRADA20/web_anime/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-text-secondary/60 hover:text-neon-cyan transition-colors">
            {t('footer.contact', 'Contacto / Reportar')}
          </a>
        </div>
        <div className="text-center">
          <p className="font-mono text-xs text-text-secondary tracking-wider">
            ANIMEVERSE // {t('common.videoDisclaimer', 'Los enlaces de video son proporcionados por terceros.')}
          </p>
          <p className="font-mono text-xs text-text-secondary/60 mt-1">
            {t('common.supportCreators', 'Apoya a los creadores comprando el contenido original.')}
          </p>
        </div>
      </div>
    </footer>
  )
}
