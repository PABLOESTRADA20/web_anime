import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'animeverse_locale'

const LOCALES = {
  es: () => import('../i18n/es.js'),
  en: () => import('../i18n/en.js'),
  pt: () => import('../i18n/pt.js'),
}

const LOCALE_NAMES = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  const [locale, setLocaleState] = useState(stored || 'es')
  const [strings, setStrings] = useState(null)

  useEffect(() => {
    LOCALES[locale]().then(m => setStrings(m.default || m))
  }, [locale])

  const setLocale = useCallback((l) => {
    if (LOCALES[l]) {
      setLocaleState(l)
      localStorage.setItem(STORAGE_KEY, l)
    }
  }, [])

  const t = useCallback((path, params) => {
    if (!strings) return path
    const keys = path.split('.')
    let val = strings
    for (const k of keys) {
      if (!val || typeof val !== 'object') return path
      val = val[k]
    }
    if (val === undefined || val === null) return path
    if (typeof val === 'string' && params) {
      return val.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`)
    }
    return val
  }, [strings])

  return (
    <I18nContext.Provider value={{ locale, setLocale, locales: Object.keys(LOCALES), localeNames: LOCALE_NAMES, t, strings }}>
      {strings ? children : null}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be inside I18nProvider')
  return ctx
}
