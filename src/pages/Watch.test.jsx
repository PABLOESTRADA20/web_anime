import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
  },
}))

vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('../hooks/useI18n', () => ({
  useI18n: () => ({ t: (k) => k, locale: 'es', localeNames: { es: 'Español' } }),
}))
vi.mock('../hooks/useHistory', () => ({ useHistory: () => ({ saveProgress: vi.fn() }) }))
vi.mock('../hooks/useWatchParty', () => ({
  useWatchParty: () => ({
    join: vi.fn(),
    leave: vi.fn(),
    broadcast: vi.fn(),
    participants: [],
    connected: false,
    partyId: null,
  }),
}))
vi.mock('../hooks/useGamification', () => ({
  useGamification: () => ({ profile: null, addXp: vi.fn(), loading: false }),
}))
vi.mock('../components/Toast', () => ({
  useToast: () => {
    const f = vi.fn()
    f.success = vi.fn()
    f.error = vi.fn()
    f.info = vi.fn()
    return f
  },
}))
vi.mock('../components/LanguageSelector', () => ({ default: () => <div data-testid="language-selector" /> }))
vi.mock('../components/SeoHead', () => ({ default: () => null }))
vi.mock('../lib/anivexa', () => ({ parseEpisodeId: vi.fn() }))
vi.mock('../lib/api', () => ({
  getAnimeEpisodes: vi.fn().mockResolvedValue({}),
  getWatchWithFallback: vi.fn().mockReturnValue(new Promise(() => {})),
}))
vi.mock('../lib/anilist', () => ({ getAnimeInfo: vi.fn().mockResolvedValue({}) }))
vi.mock('../lib/providers/registry', () => ({ PROVIDER_LABELS: {}, MIRURO_LABELS: {}, AUTO_FALLBACK_ORDER: [] }))
vi.mock('../utils/subtitles', () => ({ subtitleLangLabel: vi.fn(), isCloudflareBlock: vi.fn(), isSpanishSub: vi.fn() }))
vi.mock('../utils/proxy', () => ({ fetchSubtitle: vi.fn() }))
vi.mock('../utils/videoDownload', () => ({ downloadVideoEpisode: vi.fn(), isVideoCached: vi.fn() }))
vi.mock('../utils/downloads', () => ({ formatSize: vi.fn() }))
vi.mock('../utils/videoCacheLoader', () => ({ VideoCacheLoader: vi.fn() }))
vi.mock('../utils/detectAudio', () => ({ detectAudioOptions: vi.fn().mockReturnValue(new Promise(() => {})) }))
vi.mock('../utils/subtitlePreferences', () => ({ getSubtitlePrefs: vi.fn() }))
vi.mock('../hooks/useCommunityEpisodes', () => ({ getProviderLabel: vi.fn() }))
vi.mock('../lib/achievements', () => ({ XP_VALUES: {} }))

import Watch from './Watch'

describe('Watch', () => {
  afterEach(vi.clearAllMocks)

  it('exporta el componente correctamente', () => {
    expect(Watch).toBeDefined()
  })

  it('renderiza LanguageSelector inicialmente', () => {
    useAuth.mockReturnValue({ user: { id: 'user-1' } })
    render(
      <MemoryRouter initialEntries={['/watch']}>
        <Watch />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('language-selector')).toBeInTheDocument()
  })
})
