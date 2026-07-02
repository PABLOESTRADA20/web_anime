import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import SeoHead from '../components/SeoHead'

export default function Login() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const isReset = searchParams.get('reset') === 'true'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [mode, setMode] = useState(isReset ? 'reset-confirm' : 'login')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login, register, resetPassword, updatePassword, loginWithProvider, isReady } = useAuth()

  useEffect(() => {
    if (isReset) setMode('reset-confirm')
  }, [isReset])

  if (!isReady) {
    return (
      <>
        <SeoHead title={t('auth.login')} />
        <div className="text-center py-20 text-text-secondary">
          <p>{t('auth.errors.notConfigured')}</p>
          <p className="text-sm mt-2">{t('auth.errors.configureHint')}</p>
        </div>
      </>
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
      } else if (mode === 'register') {
        const data = await register(email, password)
        if (data?.user?.identities?.length === 0) {
          setError(t('auth.errors.emailTaken'))
        } else {
          setMessage(t('auth.errors.registerSuccess'))
        }
      } else if (mode === 'reset-request') {
        await resetPassword(email)
        setMessage(t('auth.errors.resetSent'))
      } else if (mode === 'reset-confirm') {
        await updatePassword(newPassword)
        setMessage(t('auth.errors.passwordUpdated'))
        setTimeout(() => setMode('login'), 2000)
      }
    } catch (err) {
      setError(
        err.message === 'New password should be different from the old password.'
          ? t('auth.errors.passwordSame')
          : err.message === 'Password should be at least 6 characters.'
            ? t('auth.errors.passwordMinLength')
            : err.message,
      )
    }
  }

  return (
    <>
      <SeoHead title={mode === 'reset-request' || mode === 'reset-confirm' ? t('auth.resetPassword') : t('auth.login')} />
      <div className="max-w-sm mx-auto pt-20">
        <h1 className="text-2xl font-bold text-center mb-6">
          {mode === 'login'
            ? t('auth.login')
            : mode === 'register'
              ? t('auth.signup')
              : mode === 'reset-request'
                ? t('auth.resetPassword')
                : t('auth.newPassword')}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode !== 'reset-confirm' && (
            <input
              type="email"
              placeholder={t('auth.email')}
              aria-label={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-surface border border-white/10 text-sm
                       focus:outline-none focus:border-primary/50 transition-colors"
            />
          )}
          {mode === 'login' && (
            <input
              type="password"
              placeholder={t('auth.password')}
              aria-label={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-white/10 text-sm
                       focus:outline-none focus:border-primary/50 transition-colors"
            />
          )}
          {mode === 'register' && (
            <input
              type="password"
              placeholder={t('auth.placeholders.passwordHint')}
              aria-label={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-white/10 text-sm
                       focus:outline-none focus:border-primary/50 transition-colors"
            />
          )}
          {mode === 'reset-confirm' && (
            <input
              type="password"
              placeholder={t('auth.placeholders.newPassword')}
              aria-label={t('auth.newPassword')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-white/10 text-sm
                       focus:outline-none focus:border-primary/50 transition-colors"
            />
          )}
          <button
            type="submit"
            aria-label={mode === 'login' ? t('auth.login') : mode === 'register' ? t('auth.signup') : t('auth.send')}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium text-sm transition-colors">
            {mode === 'login'
              ? t('auth.loginAction')
              : mode === 'register'
                ? t('auth.register')
                : mode === 'reset-confirm'
                  ? t('auth.updatePassword')
                  : t('auth.sendEmail')}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-6">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-text-secondary/50">{t('auth.orContinueWith')}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => loginWithProvider('google')}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl bg-surface border border-white/10 hover:bg-surface-hover hover:border-white/20 transition-all text-sm font-medium text-text-secondary hover:text-text-primary">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t('auth.social.google')}
              </button>
              <button
                onClick={() => loginWithProvider('github')}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl bg-surface border border-white/10 hover:bg-surface-hover hover:border-white/20 transition-all text-sm font-medium text-text-secondary hover:text-text-primary">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                {t('auth.social.github')}
              </button>
              <button
                onClick={() => loginWithProvider('discord')}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl bg-surface border border-white/10 hover:bg-surface-hover hover:border-white/20 transition-all text-sm font-medium text-text-secondary hover:text-text-primary">
                <svg className="w-5 h-5" fill="#5865F2" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.0756.0756 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.075.075 0 01-.0416-.0717.075.075 0 01.0071-.0353c.1259-.094.2519-.1921.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.0993.2462.1984.3723.2924a.075.075 0 01.006.107c-.5979.3428-1.2195.6447-1.8722.8923a.075.075 0 00-.0416.1057c.3529.699.7644 1.3638 1.226 1.9942a.076.076 0 00.0842.0286c1.9516-.6066 3.9401-1.5218 5.9929-3.0294a.077.077 0 00.0312-.0547c.5004-5.053-.838-9.5538-3.5485-13.6584a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                </svg>
                {t('auth.social.discord')}
              </button>
            </div>
          </div>
        )}

        {message && <p className="text-sm text-center mt-4 text-green-400">{message}</p>}
        {error && <p className="text-sm text-center mt-4 text-red-400">{error}</p>}

        <div className="text-sm text-center mt-6 space-y-2">
          {mode === 'login' && (
            <>
              <p className="text-text-secondary">
                {t('auth.noAccount')}{' '}
                <button
                  onClick={() => {
                    setMode('register')
                    setError('')
                    setMessage('')
                  }}
                  className="text-primary hover:underline">
                  {t('auth.register')}
                </button>
              </p>
              <p>
                <button
                  onClick={() => {
                    setMode('reset-request')
                    setError('')
                    setMessage('')
                  }}
                  className="text-text-secondary hover:text-primary transition-colors">
                  {t('auth.forgotPassword')}
                </button>
              </p>
            </>
          )}
          {mode === 'register' && (
            <p className="text-text-secondary">
              {t('auth.haveAccount')}{' '}
              <button
                onClick={() => {
                  setMode('login')
                  setError('')
                  setMessage('')
                }}
                className="text-primary hover:underline">
                {t('auth.login')}
              </button>
            </p>
          )}
          {(mode === 'reset-request' || mode === 'reset-confirm') && (
            <p className="text-text-secondary">
              <button
                onClick={() => {
                  setMode('login')
                  setError('')
                  setMessage('')
                }}
                className="text-text-secondary hover:text-primary transition-colors">
                {t('auth.backToLogin')}
              </button>
            </p>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            {t('auth.backToHome')}
          </Link>
        </div>
      </div>
    </>
  )
}
