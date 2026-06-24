import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useNotificationPreferences } from '../hooks/useNotificationPreferences'
import { usePushNotifications } from '../hooks/usePushNotifications'
import SeoHead from '../components/SeoHead'
import GradientHeading from '../components/GradientHeading'
import { useToast } from '../components/Toast'
import SafeImage from '../components/SafeImage'

const profileSchema = z.object({
  display_name: z.string().max(100, 'Máximo 100 caracteres').optional(),
  bio: z.string().max(500, 'Máximo 500 caracteres').optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  avatar_url: z.string().url('URL de avatar inválida').optional().or(z.literal('')),
})

export default function Settings() {
  const { user } = useAuth()
  const { profile, loading, updateProfile, ensureProfile } = useProfile()
  const { prefs, ensurePrefs, updatePref } = useNotificationPreferences()
  const push = usePushNotifications()
  const toast = useToast()

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState('')

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setBio(profile.bio || '')
      setWebsite(profile.website || '')
      setAvatarUrl(profile.avatar_url || '')
      setAvatarPreview(profile.avatar_url || '')
    }
  }, [profile])

  useEffect(() => {
    if (user && !profile && !loading) {
      ensureProfile(user.id).then((p) => {
        if (p) {
          setDisplayName(p.display_name || '')
          setBio(p.bio || '')
          setWebsite(p.website || '')
          setAvatarUrl(p.avatar_url || '')
        }
      })
    }
  }, [user, profile, loading, ensureProfile])

  const [errors, setErrors] = useState({})

  async function handleSave(e) {
    e.preventDefault()
    setErrors({})

    const parsed = profileSchema.safeParse({
      display_name: displayName.trim() || undefined,
      bio: bio.trim() || undefined,
      website: website.trim(),
      avatar_url: avatarUrl.trim(),
    })

    if (!parsed.success) {
      const fieldErrors = {}
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0]] = issue.message
      }
      setErrors(fieldErrors)
      const first = Object.values(fieldErrors)[0]
      if (first) toast.error(first)
      return
    }

    setSaving(true)
    try {
      await updateProfile({
        display_name: parsed.data.display_name || null,
        bio: parsed.data.bio || null,
        website: parsed.data.website || null,
        avatar_url: parsed.data.avatar_url || null,
      })
      toast.success('Perfil actualizado')
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  function handleAvatarChange(url) {
    setAvatarUrl(url)
    setAvatarPreview(url)
  }

  if (!user) {
    return (
      <>
        <SeoHead title="Configuración" />
        <div className="max-w-xl mx-auto py-12 text-center text-text-secondary">Inicia sesión para editar tu perfil.</div>
      </>
    )
  }

  return (
    <>
      <SeoHead title="Configuración del perfil" />
      <div className="max-w-xl mx-auto">
        <GradientHeading variant="pink" size="lg" className="mb-8">
          Configuración del perfil
        </GradientHeading>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-hover shrink-0">
              {avatarPreview ? (
                <SafeImage src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-text-secondary bg-gradient-to-br from-primary to-neon-cyan">
                  {(displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="text-sm text-text-secondary">
              <p className="font-medium text-text-primary">{displayName || user.email?.split('@')[0]}</p>
              <p>{user.email}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">URL del avatar</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => {
                setErrors((p) => ({ ...p, avatar_url: undefined }))
                handleAvatarChange(e.target.value)
              }}
              placeholder="https://ejemplo.com/avatar.jpg"
              className={`w-full px-4 py-2.5 rounded-xl bg-surface border text-sm placeholder:text-text-secondary/40 focus:outline-none transition-all ${errors.avatar_url ? 'border-red-400 focus:border-red-400' : 'border-white/10 focus:border-primary/50'}`}
            />
            {errors.avatar_url && <p className="text-red-400 text-[11px] mt-1">{errors.avatar_url}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Nombre público</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => {
                setErrors((p) => ({ ...p, display_name: undefined }))
                setDisplayName(e.target.value)
              }}
              placeholder="Tu nombre"
              maxLength={100}
              className={`w-full px-4 py-2.5 rounded-xl bg-surface border text-sm placeholder:text-text-secondary/40 focus:outline-none transition-all ${errors.display_name ? 'border-red-400 focus:border-red-400' : 'border-white/10 focus:border-primary/50'}`}
            />
            {errors.display_name && <p className="text-red-400 text-[11px] mt-1">{errors.display_name}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Biografía <span className="text-text-secondary/50">({bio.length}/500)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => {
                setErrors((p) => ({ ...p, bio: undefined }))
                setBio(e.target.value)
              }}
              placeholder="Cuéntanos sobre ti..."
              maxLength={500}
              rows={4}
              className={`w-full px-4 py-2.5 rounded-xl bg-surface border text-sm placeholder:text-text-secondary/40 focus:outline-none transition-all resize-none ${errors.bio ? 'border-red-400 focus:border-red-400' : 'border-white/10 focus:border-primary/50'}`}
            />
            {errors.bio && <p className="text-red-400 text-[11px] mt-1">{errors.bio}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Sitio web</label>
            <input
              type="url"
              value={website}
              onChange={(e) => {
                setErrors((p) => ({ ...p, website: undefined }))
                setWebsite(e.target.value)
              }}
              placeholder="https://tusitio.com"
              className={`w-full px-4 py-2.5 rounded-xl bg-surface border text-sm placeholder:text-text-secondary/40 focus:outline-none transition-all ${errors.website ? 'border-red-400 focus:border-red-400' : 'border-white/10 focus:border-primary/50'}`}
            />
            {errors.website && <p className="text-red-400 text-[11px] mt-1">{errors.website}</p>}
          </div>

          <button
            type="submit"
            disabled={saving || loading}
            className="w-full py-3 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>

        <div className="mt-12">
          <GradientHeading variant="pink" size="md" className="mb-4">
            Notificaciones push
          </GradientHeading>
          <div className="bg-surface rounded-2xl p-6 space-y-2">
            {push.supported ? (
              <button
                onClick={push.subscribed ? push.unsubscribe : push.subscribe}
                disabled={push.loading}
                className={`w-full py-3 rounded-xl text-sm font-medium transition-colors border disabled:opacity-40 ${
                  push.subscribed
                    ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                    : 'bg-surface text-text-secondary border-white/10 hover:text-text-primary'
                }`}>
                {push.loading ? '...' : push.subscribed ? '🔔 Notificaciones activadas' : '🔕 Activar notificaciones'}
              </button>
            ) : (
              <p className="text-sm text-text-secondary text-center py-2">
                Las notificaciones push no están disponibles en este navegador.
              </p>
            )}
            {push.permission === 'denied' && (
              <p className="text-xs text-red-400 text-center">Permiso denegado. Actívalo en la configuración del navegador.</p>
            )}
          </div>
        </div>

        <div className="mt-10 mb-12">
          <GradientHeading variant="pink" size="md" className="mb-4">
            Preferencias de notificación
          </GradientHeading>
          <div className="bg-surface rounded-2xl p-6 space-y-4">
            {[
              { key: 'new_episode', label: 'Nuevo episodio', desc: 'Cuando un anime que estás viendo estrena episodio' },
              { key: 'new_review', label: 'Nueva reseña', desc: 'Cuando alguien reseña un anime que has visto' },
              { key: 'comment_reply', label: 'Respuesta a comentario', desc: 'Cuando alguien responde tu comentario' },
              { key: 'review_vote', label: 'Voto en reseña', desc: 'Cuando alguien vota tu reseña' },
              { key: 'weekly_digest', label: 'Resumen semanal', desc: 'Resumen de actividad de la semana' },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between gap-4 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{item.label}</p>
                  <p className="text-xs text-text-secondary/60">{item.desc}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={prefs?.[item.key] ?? true}
                  onClick={async () => {
                    try {
                      if (!prefs) await ensurePrefs()
                      const newVal = !(prefs?.[item.key] ?? true)
                      await updatePref(item.key, newVal)
                    } catch {
                      toast.error('Error al actualizar')
                    }
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                    (prefs?.[item.key] ?? true) ? 'bg-primary' : 'bg-surface-hover'
                  }`}>
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      (prefs?.[item.key] ?? true) ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
