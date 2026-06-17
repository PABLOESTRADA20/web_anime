import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login, register, isReady } = useAuth()

  if (!isReady) {
    return (
      <div className="text-center py-20 text-text-secondary">
        <p>Sistema de usuarios no configurado.</p>
        <p className="text-sm mt-2">Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env</p>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setError('')

    try {
      if (mode === 'login') {
        await login(email, password)
        navigate('/profile')
      } else {
        await register(email, password)
        setMessage('Registro exitoso. Revisa tu correo para verificar la cuenta.')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-sm mx-auto pt-20">
      <h1 className="text-2xl font-bold text-center mb-6">
        {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl bg-surface border border-white/10 text-sm
                     focus:outline-none focus:border-primary/50 transition-colors"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-3 rounded-xl bg-surface border border-white/10 text-sm
                     focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button
          type="submit"
          className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium text-sm transition-colors"
        >
          {mode === 'login' ? 'Entrar' : 'Registrarse'}
        </button>
      </form>

      {message && <p className="text-sm text-center mt-4 text-green-400">{message}</p>}
      {error && <p className="text-sm text-center mt-4 text-red-400">{error}</p>}

      <p className="text-sm text-center mt-6 text-text-secondary">
        {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
        <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setMessage('') }}
          className="text-primary hover:underline">
          {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
        </button>
      </p>

      <div className="mt-8 text-center">
        <Link to="/" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
          ← Volver al inicio
        </Link>
      </div>
    </div>
  )
}
