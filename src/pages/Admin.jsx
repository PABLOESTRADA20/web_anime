import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdmin, useModeration } from '../hooks/useAdmin'
import { useAuth } from '../hooks/useAuth'
import SeoHead from '../components/SeoHead'
import GradientHeading from '../components/GradientHeading'
import { useToast } from '../components/Toast'
import { getProviderLabel, getProviderColor, getLanguageLabel } from '../hooks/useCommunityEpisodes'

const STATUS_TABS = [
  { key: 'pending', label: 'Pendientes', color: 'text-yellow-400' },
  { key: 'approved', label: 'Aprobados', color: 'text-green-400' },
  { key: 'rejected', label: 'Rechazados', color: 'text-red-400' },
]

export default function Admin() {
  const { user } = useAuth()
  const { isAdmin, loading: adminLoading, bootstrapAdmin } = useAdmin()
  const { episodes, loading: modLoading, refetch, updateStatus, removeEpisode } = useModeration()
  const toast = useToast()
  const [tab, setTab] = useState('pending')

  async function handleBootstrap() {
    try {
      await bootstrapAdmin()
      toast.success('Ahora eres administrador')
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleApprove(id) {
    try {
      await updateStatus(id, 'approved')
      toast.success('Aprobado')
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleReject(id) {
    try {
      await updateStatus(id, 'rejected')
      toast.success('Rechazado')
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este enlace permanentemente?')) return
    try {
      await removeEpisode(id)
      toast.success('Eliminado')
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (!user) {
    return (
      <>
        <SeoHead title="Admin" />
        <div className="max-w-xl mx-auto py-12 text-center text-text-secondary">Inicia sesión para acceder al panel de administración.</div>
      </>
    )
  }

  if (adminLoading)
    return (
      <div className="max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-surface rounded-lg animate-pulse mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )

  if (!isAdmin) {
    return (
      <>
        <SeoHead title="Admin - Sin acceso" />
        <div className="max-w-xl mx-auto py-12 text-center">
          <GradientHeading variant="pink" size="lg" className="mb-4">
            Acceso restringido
          </GradientHeading>
          <p className="text-text-secondary mb-6">No tienes permisos de administrador.</p>
          <button
            onClick={handleBootstrap}
            className="px-6 py-3 rounded-xl bg-primary text-white text-sm hover:bg-primary-hover transition-colors">
            Hacerme admin (primer usuario)
          </button>
        </div>
      </>
    )
  }

  const filtered = episodes.filter((e) => e.status === tab)

  return (
    <>
      <SeoHead title="Panel de administración" />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <GradientHeading variant="pink" size="lg">
            Administración
          </GradientHeading>
          <button
            onClick={refetch}
            className="px-4 py-2 rounded-lg text-xs bg-surface text-text-secondary hover:text-text-primary border border-white/10 hover:border-primary/30 transition-all">
            Recargar
          </button>
        </div>

        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                tab === t.key ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
              }`}>
              {t.label}{' '}
              <span className={tab === t.key ? 'text-white/70' : t.color}>({episodes.filter((e) => e.status === t.key).length})</span>
            </button>
          ))}
        </div>

        {modLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-text-secondary">
            No hay episodios {tab === 'pending' ? 'pendientes' : tab === 'approved' ? 'aprobados' : 'rechazados'}.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ep) => (
              <div key={ep.id} className="p-4 rounded-2xl bg-surface/50 border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link
                        to={`/watch?anilistId=${ep.anilist_id}&ep=${ep.episode_number}`}
                        className="text-sm font-medium hover:text-primary transition-colors truncate">
                        {ep.title || `Anime #${ep.anilist_id}`}
                      </Link>
                      <span className="text-[10px] text-text-secondary shrink-0">Ep. {ep.episode_number}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getProviderColor(ep.provider_name)}`}>
                        {getProviderLabel(ep.provider_name)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-text-secondary border border-white/10">
                        {getLanguageLabel(ep.language)}
                      </span>
                    </div>
                    <a
                      href={ep.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-text-secondary/60 hover:text-neon-cyan truncate block max-w-md">
                      {ep.url}
                    </a>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-text-secondary">
                      <span>Enviado {new Date(ep.created_at).toLocaleDateString()}</span>
                      {ep.votes > 0 && <span>{ep.votes} votos</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {ep.status !== 'approved' && (
                      <button
                        onClick={() => handleApprove(ep.id)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors">
                        Aprobar
                      </button>
                    )}
                    {ep.status !== 'rejected' && (
                      <button
                        onClick={() => handleReject(ep.id)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                        Rechazar
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(ep.id)}
                      className="p-1.5 rounded-lg text-text-secondary/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Eliminar">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
