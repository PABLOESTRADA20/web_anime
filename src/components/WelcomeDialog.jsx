import { useState, useEffect } from 'react'
import { useI18n } from '../hooks/useI18n'

const KEY = 'animeverse-onboarding-seen'

export default function WelcomeDialog() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [slide, setSlide] = useState(0)

  const slides = [
    {
      icon: (
        <svg className="w-12 h-12 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
      title: t('home.welcome.title'),
      description: t('home.welcome.desc'),
    },
    {
      icon: (
        <svg className="w-12 h-12 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      ),
      title: t('home.welcome.step1Title'),
      description: t('home.welcome.step1Desc'),
    },
    {
      icon: (
        <svg className="w-12 h-12 text-neon-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
        </svg>
      ),
      title: t('home.welcome.step2Title'),
      description: t('home.welcome.step2Desc'),
    },
    {
      icon: (
        <svg className="w-12 h-12 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
      ),
      title: t('home.welcome.step3Title'),
      description: t('home.welcome.step3Desc'),
    },
  ]

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setOpen(true)
  }, [])

  function close() {
    localStorage.setItem(KEY, 'true')
    setOpen(false)
  }

  if (!open) return null

  const s = slides[slide]
  const isLast = slide === slides.length - 1

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative bg-surface rounded-2xl border border-white/10 p-6 sm:p-8 max-w-sm w-full shadow-2xl">
        <button
          onClick={close}
          className="absolute top-3 right-3 text-text-secondary hover:text-text-primary transition-colors"
          aria-label={t('common.closeDialog')}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex justify-center mb-6 mt-2">{s.icon}</div>

        <h2 className="text-lg font-bold text-center mb-2">{s.title}</h2>
        <p className="text-sm text-text-secondary text-center mb-8 leading-relaxed">{s.description}</p>

        <div className="flex items-center justify-center gap-1.5 mb-6">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? 'w-6 bg-primary' : 'w-1.5 bg-white/20'}`}
            />
          ))}
        </div>

        <div className="flex justify-between">
          {slide > 0 ? (
            <button
              onClick={() => setSlide((s) => s - 1)}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors px-4 py-2">
              {t('home.welcome.back')}
            </button>
          ) : (
            <div />
          )}
          {isLast ? (
            <button
              onClick={close}
              className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors">
              {t('home.welcome.start')}
            </button>
          ) : (
            <button
              onClick={() => setSlide((s) => s + 1)}
              className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors">
              {t('home.welcome.next')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
