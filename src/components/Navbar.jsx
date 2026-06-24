import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useI18n } from '../hooks/useI18n'
import { searchAnime } from '../lib/api'
import SafeImage from './SafeImage'

export default function Navbar() {
  const [query, setQuery] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const searchRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isReady, logout } = useAuth()
  const { dark, toggle: toggleTheme } = useTheme()
  const { locale, setLocale, locales, localeNames, t } = useI18n()

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      setSuggestionsLoading(true)
      try {
        const res = await searchAnime(query.trim(), 1, {}, new AbortController().signal)
        setSuggestions((res?.data || []).slice(0, 6))
      } catch {
        setSuggestions([])
      }
      setSuggestionsLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    setSelectedSuggestion(-1)
    setSuggestions([])
  }, [location.pathname])

  function handleSubmit(e) {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      setSearchOpen(false)
      setMenuOpen(false)
      setSuggestions([])
    }
  }

  function handleSuggestionClick(anime) {
    navigate(`/anime/${anime.anilistId || anime.id}`)
    setQuery('')
    setSuggestions([])
    setSearchOpen(false)
  }

  function handleKeyDown(e) {
    if (suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestion((prev) => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && selectedSuggestion >= 0) {
      e.preventDefault()
      handleSuggestionClick(suggestions[selectedSuggestion])
    }
  }

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/directorio', label: t('nav.directory') },
    { to: '/search', label: t('nav.search') },
    { to: '/manga', label: t('nav.manga') },
    { to: '/seasonal', label: t('nav.seasonal') },
    { to: '/schedule', label: t('nav.schedule') },
    { to: '/characters', label: t('nav.characters') },
    { to: '/downloads', label: t('nav.downloads') },
    { to: '/activity', label: 'Actividad' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-primary/10">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <Link to="/" className="text-xl font-heading font-bold shrink-0 tracking-wider">
          <span className="text-gradient bg-gradient-to-r from-primary to-primary-hover">Anime</span>
          <span className="text-white/90">Verse</span>
        </Link>

        <div className="hidden sm:flex items-center gap-1 text-sm ml-6">
          {links.map((l) => {
            const isActive = location.pathname === l.to || (l.to !== '/' && location.pathname.startsWith(l.to))
            return (
              <Link
                key={l.to}
                to={l.to}
                aria-current={isActive ? 'page' : undefined}
                className={`relative px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
                }`}>
                {l.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 bg-primary/10 rounded-lg border border-primary/20"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </Link>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 max-w-md ml-auto hidden sm:block relative" ref={searchRef}>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(() => setSuggestions([]), 200)}
              onFocus={() => {
                if (suggestions.length > 0) setSuggestions([...suggestions])
              }}
              placeholder="Buscar anime..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-white/10 text-sm
                         placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50
                         transition-all duration-300"
            />
            {suggestionsLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
              {suggestions.map((anime, i) => {
                const img = anime.image || anime.coverImage?.large
                const title = anime.title_es || anime.title?.romaji || anime.title?.english || anime.title?.native || ''
                return (
                  <button
                    key={anime.anilistId || anime.id || i}
                    type="button"
                    onMouseDown={() => handleSuggestionClick(anime)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                      i === selectedSuggestion
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`}>
                    <SafeImage src={img} alt="" className="w-8 h-11 rounded object-cover shrink-0" />
                    <span className="truncate">{title}</span>
                    {anime.format && <span className="shrink-0 text-[10px] text-text-secondary/50 font-mono">{anime.format}</span>}
                  </button>
                )
              })}
              <button
                type="button"
                onMouseDown={() => handleSubmit({ preventDefault: () => {} })}
                className="w-full text-center py-2 text-xs text-neon-cyan hover:bg-surface-hover transition-colors border-t border-white/5">
                Ver todos los resultados →
              </button>
            </div>
          )}
        </form>

        <div className="flex items-center gap-1 shrink-0">
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="bg-transparent text-[10px] text-text-secondary border border-white/10 rounded-lg px-1.5 py-1 outline-none hover:border-primary/30 cursor-pointer"
            aria-label="Idioma">
            {locales.map((l) => (
              <option key={l} value={l} className="bg-background">
                {localeNames[l]}
              </option>
            ))}
          </select>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-text-secondary hover:text-neon-cyan hover:bg-surface-hover transition-all"
            aria-label="Cambiar tema">
            {dark ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          {isReady &&
            (user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="Menú de usuario"
                  aria-expanded={userMenuOpen}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-neon-cyan flex items-center justify-center text-[10px] font-bold text-white">
                    {(user.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <span className="hidden sm:inline">{user.email?.split('@')[0] || 'Usuario'}</span>
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-44 bg-background/90 backdrop-blur-xl border border-white/10 rounded-xl py-2 shadow-2xl z-20">
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-hover transition-colors"
                        onClick={() => setUserMenuOpen(false)}>
                        <svg className="w-4 h-4 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        Mi perfil
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-hover transition-colors"
                        onClick={() => setUserMenuOpen(false)}>
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Configuración
                      </Link>
                      <Link
                        to="/collections"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-hover transition-colors"
                        onClick={() => setUserMenuOpen(false)}>
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
                        </svg>
                        Colecciones
                      </Link>
                      <Link
                        to="/admin"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-hover transition-colors"
                        onClick={() => setUserMenuOpen(false)}>
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        Admin
                      </Link>
                      <button
                        onClick={() => {
                          logout()
                          setUserMenuOpen(false)
                        }}
                        className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-surface-hover transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Cerrar sesión
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all">
                Entrar
              </Link>
            ))}

          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="sm:hidden p-2 rounded-lg text-text-secondary hover:bg-surface-hover transition-colors"
            aria-label="Buscar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden p-2 rounded-lg text-text-secondary hover:bg-surface-hover transition-colors"
            aria-label="Menú">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="sm:hidden px-4 pb-4">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar anime..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-white/10 text-sm placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>
          </form>
        </div>
      )}

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden overflow-hidden border-t border-primary/10">
            <div className="px-4 py-3 space-y-1">
              {links.map((l) => {
                const isActive = location.pathname === l.to
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-4 py-2.5 rounded-lg text-sm transition-all ${
                      isActive
                        ? 'text-primary bg-primary/10 border border-primary/20'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                    }`}>
                    {l.label}
                  </Link>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
