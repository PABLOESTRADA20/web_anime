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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <Link to="/" className="text-xl font-bold text-primary shrink-0">
          ✦ AnimeVerse
        </Link>

        <div className="hidden sm:flex items-center gap-5 text-sm text-text-secondary ml-6">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-text-primary transition-colors">{l.label}</Link>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 max-w-md ml-auto hidden sm:block">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar anime..."
            className="w-full px-4 py-2 rounded-xl bg-surface border border-white/10 text-sm
                       placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50
                       transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="text-lg text-text-secondary hover:text-text-primary transition-colors p-1"
            aria-label="Cambiar tema"
          >
            {dark ? '☀️' : '🌙'}
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
              <Link to="/login" className="text-sm text-primary hover:underline">
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
                         placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50
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
            className="sm:hidden overflow-hidden border-t border-white/5"
          >
            <div className="px-4 py-3 space-y-2">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
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
