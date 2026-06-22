import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'

export default function Navbar() {
  const [query, setQuery] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isReady, logout } = useAuth()
  const { dark, toggle: toggleTheme } = useTheme()

  function handleSubmit(e) {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      setSearchOpen(false)
      setMenuOpen(false)
    }
  }

  const links = [
    { to: '/', label: 'Inicio' },
    { to: '/directorio', label: 'Directorio' },
    { to: '/search', label: 'Buscar' },
    { to: '/manga', label: 'Manga' },
    { to: '/seasonal', label: 'Temporada' },
    { to: '/schedule', label: 'Calendario' },
    { to: '/characters', label: 'Personajes' },
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
                }`}
              >
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

        <form onSubmit={handleSubmit} className="flex-1 max-w-md ml-auto hidden sm:block">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar anime..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-white/10 text-sm
                         placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50
                         transition-all duration-300"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-text-secondary hover:text-neon-cyan hover:bg-surface-hover transition-all"
            aria-label="Cambiar tema"
          >
            {dark ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {isReady && (
            user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="Menú de usuario"
                  aria-expanded={userMenuOpen}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-neon-cyan flex items-center justify-center text-[10px] font-bold text-white">
                    {(user.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <span className="hidden sm:inline">{user.email?.split('@')[0] || 'Usuario'}</span>
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-44 bg-background/90 backdrop-blur-xl border border-white/10 rounded-xl py-2 shadow-2xl z-20">
                      <Link to="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-hover transition-colors" onClick={() => setUserMenuOpen(false)}>
                        <svg className="w-4 h-4 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        Mi perfil
                      </Link>
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false) }}
                        className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-surface-hover transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                        Cerrar sesión
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to="/login" className="px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all">
                Entrar
              </Link>
            )
          )}

          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="sm:hidden p-2 rounded-lg text-text-secondary hover:bg-surface-hover transition-colors"
            aria-label="Buscar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden p-2 rounded-lg text-text-secondary hover:bg-surface-hover transition-colors"
            aria-label="Menú"
          >
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
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="sm:hidden overflow-hidden border-t border-primary/10"
          >
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
                    }`}
                  >
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
