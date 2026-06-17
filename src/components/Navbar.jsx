import { Link, useNavigate } from 'react-router-dom'
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
    { to: '/search', label: 'Buscar' },
    { to: '/manga', label: 'Manga' },
    { to: '/seasonal', label: 'Temporada' },
    { to: '/schedule', label: 'Calendario' },
    { to: '/characters', label: 'Personajes' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-primary/20">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <Link to="/" className="text-xl font-heading font-bold text-primary shrink-0 tracking-wider" style={{textShadow: '0 0 20px rgba(255,0,110,0.4)'}}>
          AnimeVerse
        </Link>

        <div className="hidden sm:flex items-center gap-5 text-sm text-text-secondary ml-6">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-neon-cyan transition-colors">{l.label}</Link>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 max-w-md ml-auto hidden sm:block">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar anime..."
            className="w-full px-4 py-2 rounded-xl bg-surface border border-white/10 text-sm
                       placeholder:text-text-secondary/50 focus:outline-none focus:border-neon-cyan/70
                       transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="text-text-secondary hover:text-neon-cyan transition-colors p-1"
            aria-label="Cambiar tema"
          >
            {dark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {isReady && (
            user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  {user.email?.split('@')[0] || 'Usuario'}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-40 bg-surface border border-white/10 rounded-xl py-2 shadow-xl">
                    <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-surface-hover" onClick={() => setUserMenuOpen(false)}>
                      Mi perfil
                    </Link>
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false) }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-surface-hover"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="text-sm text-primary hover:text-neon-cyan transition-colors">
                Entrar
              </Link>
            )
          )}

          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="sm:hidden text-text-secondary"
            aria-label="Buscar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden text-text-secondary"
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

      {/* Mobile search */}
      {searchOpen && (
        <div className="sm:hidden px-4 pb-4">
          <form onSubmit={handleSubmit}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar anime..."
              className="w-full px-4 py-2 rounded-xl bg-surface border border-white/10 text-sm
                         placeholder:text-text-secondary/50 focus:outline-none focus:border-neon-cyan/70
                         transition-colors"
            />
          </form>
        </div>
      )}

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden overflow-hidden border-t border-primary/20"
          >
            <div className="px-4 py-3 space-y-2">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-neon-cyan hover:bg-surface-hover transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
