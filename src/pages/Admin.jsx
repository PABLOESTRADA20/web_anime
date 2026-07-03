import { useState } from 'react'
import { useAdmin, useModeration, useMangaModeration, useNovelModeration } from '../hooks/useAdmin'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'
import SeoHead from '../components/SeoHead'
import GradientHeading from '../components/GradientHeading'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { getProviderLabel, getProviderColor, getLanguageLabel } from '../hooks/useCommunityEpisodes'
import { getMangaProviderLabel, getMangaProviderColor } from '../hooks/useCommunityManga'
import { getNovelProviderLabel, getNovelProviderColor } from '../hooks/useCommunityNovels'

const SECTIONS = [
  { key: 'anime', label: 'Anime' },
  { key: 'manga', label: 'Manga' },
  { key: 'novels', label: 'Novelas' },
]

function EpisodeList({ episodes, loading, updateStatus, removeItem, tab, getLabel, getColor }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const filtered = episodes.filter((e) => e.status === tab)

  if (filtered.length === 0) {
    return (
      <EmptyState
        message={
          tab === 'pending' ? 'Sin elementos pendientes' : tab === 'approved' ? 'Sin elementos aprobados' : 'Sin elementos rechazados'
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      {filtered.map((ep) => (
        <div key={ep.id} className="p-4 rounded-2xl bg-surface/50 border border-white/5 hover:border-white/10 transition-all">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-medium truncate">{ep.title || `${ep.anilist_id || ep.novel_slug || '#' + ep.id}`}</span>
                {ep.episode_number && <span className="text-[10px] text-text-secondary shrink-0">Ep. {ep.episode_number}</span>}
                {ep.chapter_number && <span className="text-[10px] text-text-secondary shrink-0">Cap. {ep.chapter_number}</span>}
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${(getColor || getProviderColor)(ep.provider_name)}`}>
                  {(getLabel || getProviderLabel)(ep.provider_name)}
                </span>
                {ep.language && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-text-secondary border border-white/10">
                    {getLanguageLabel(ep.language)}
                  </span>
                )}
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
                  onClick={() => updateStatus(ep.id, 'approved')}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors">
                  Aprobar
                </button>
              )}
              {ep.status !== 'rejected' && (
                <button
                  onClick={() => updateStatus(ep.id, 'rejected')}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                  Rechazar
                </button>
              )}
              <button
                onClick={() => removeItem(ep.id)}
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
  )
}

function MangaModeration() {
  const { items, loading, updateStatus, removeItem, refetch } = useMangaModeration()
  const [tab, setTab] = useState('pending')
  const STATUS_TABS = [
    { key: 'pending', label: 'Pendientes', color: 'text-yellow-400' },
    { key: 'approved', label: 'Aprobados', color: 'text-green-400' },
    { key: 'rejected', label: 'Rechazados', color: 'text-red-400' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold">Capítulos de Manga</h2>
        <button
          onClick={refetch}
          className="px-3 py-1.5 rounded-lg text-[11px] bg-surface text-text-secondary hover:text-text-primary border border-white/10 hover:border-primary/30 transition-all">
          Refrescar
        </button>
      </div>
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              tab === t.key ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
            }`}>
            {t.label} <span className={tab === t.key ? 'text-white/70' : t.color}>({items.filter((e) => e.status === t.key).length})</span>
          </button>
        ))}
      </div>
      <EpisodeList
        episodes={items}
        loading={loading}
        updateStatus={updateStatus}
        removeItem={removeItem}
        tab={tab}
        getLabel={getMangaProviderLabel}
        getColor={getMangaProviderColor}
      />
    </div>
  )
}

function NovelModeration() {
  const { items, loading, updateStatus, removeItem, refetch } = useNovelModeration()
  const [tab, setTab] = useState('pending')
  const STATUS_TABS = [
    { key: 'pending', label: 'Pendientes', color: 'text-yellow-400' },
    { key: 'approved', label: 'Aprobados', color: 'text-green-400' },
    { key: 'rejected', label: 'Rechazados', color: 'text-red-400' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold">Capítulos de Novela</h2>
        <button
          onClick={refetch}
          className="px-3 py-1.5 rounded-lg text-[11px] bg-surface text-text-secondary hover:text-text-primary border border-white/10 hover:border-primary/30 transition-all">
          Refrescar
        </button>
      </div>
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              tab === t.key ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
            }`}>
            {t.label} <span className={tab === t.key ? 'text-white/70' : t.color}>({items.filter((e) => e.status === t.key).length})</span>
          </button>
        ))}
      </div>
      <EpisodeList
        episodes={items}
        loading={loading}
        updateStatus={updateStatus}
        removeItem={removeItem}
        tab={tab}
        getLabel={getNovelProviderLabel}
        getColor={getNovelProviderColor}
      />
    </div>
  )
}

export default function Admin() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { isAdmin, loading: adminLoading, bootstrapAdmin } = useAdmin()
  const { items: animeItems, loading: modLoading, updateStatus, removeItem, refetch } = useModeration()
  const toast = useToast()
  const [section, setSection] = useState('anime')
  const [tab, setTab] = useState('pending')

  const STATUS_TABS = [
    { key: 'pending', label: t('admin.pending'), color: 'text-yellow-400' },
    { key: 'approved', label: t('admin.approved'), color: 'text-green-400' },
    { key: 'rejected', label: t('admin.rejected'), color: 'text-red-400' },
  ]

  async function handleBootstrap() {
    try {
      await bootstrapAdmin()
      toast.success(t('admin.bootstrapSuccess'))
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (!user) {
    return (
      <>
        <SeoHead title={t('admin.title')} />
        <div className="max-w-xl mx-auto py-12 text-center text-text-secondary">{t('admin.loginRequired')}</div>
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
        <SeoHead title={`${t('admin.title')} - ${t('common.error')}`} />
        <div className="max-w-xl mx-auto py-12 text-center">
          <GradientHeading variant="pink" size="lg" className="mb-4">
            {t('admin.notAuthorized')}
          </GradientHeading>
          <p className="text-text-secondary mb-6">{t('admin.notAuthorizedDesc')}</p>
          <button
            onClick={handleBootstrap}
            className="px-6 py-3 rounded-xl bg-primary text-white text-sm hover:bg-primary-hover transition-colors">
            {t('admin.bootstrap')}
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <SeoHead title={t('admin.title')} />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <GradientHeading variant="pink" size="lg">
            {t('admin.title')}
          </GradientHeading>
          <button
            onClick={section === 'anime' ? refetch : undefined}
            className="px-4 py-2 rounded-lg text-xs bg-surface text-text-secondary hover:text-text-primary border border-white/10 hover:border-primary/30 transition-all">
            {t('common.refresh')}
          </button>
        </div>

        <div className="flex gap-1 mb-6">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                section === s.key ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
              }`}>
              {s.label}
            </button>
          ))}
        </div>

        {section === 'anime' && (
          <>
            <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
              {STATUS_TABS.map((st) => (
                <button
                  key={st.key}
                  onClick={() => setTab(st.key)}
                  className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                    tab === st.key ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
                  }`}>
                  {st.label}{' '}
                  <span className={tab === st.key ? 'text-white/70' : st.color}>
                    ({animeItems.filter((e) => e.status === st.key).length})
                  </span>
                </button>
              ))}
            </div>
            <EpisodeList
              episodes={animeItems}
              loading={modLoading}
              updateStatus={updateStatus}
              removeItem={removeItem}
              tab={tab}
              refetch={refetch}
            />
          </>
        )}

        {section === 'manga' && <MangaModeration />}

        {section === 'novels' && <NovelModeration />}
      </div>
    </>
  )
}
