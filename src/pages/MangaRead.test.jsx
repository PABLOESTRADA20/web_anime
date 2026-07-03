import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  mockSaveChapterProgress: vi.fn(),
  mockAddXp: vi.fn(),
  mockGetDownload: vi.fn().mockReturnValue(null),
  mockGetMangaChapterPages: vi.fn(),
  mockGetMangaChapters: vi.fn(),
  mockAddDownload: vi.fn(),
  mockCacheUrls: vi.fn().mockResolvedValue([]),
  mockT: vi.fn((k) => k),
}))

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }) => <div>{children}</div>, span: ({ children }) => <span>{children}</span> },
}))
vi.mock('../hooks/useI18n', () => ({ useI18n: () => ({ t: mocks.mockT, locale: 'es' }) }))
vi.mock('../hooks/useMangaHistory', () => ({
  useMangaHistory: () => ({ mangaHistory: [], saveChapterProgress: mocks.mockSaveChapterProgress }),
}))
vi.mock('../hooks/useGamification', () => ({ useGamification: () => ({ profile: null, addXp: mocks.mockAddXp, loading: false }) }))
vi.mock('../components/Toast', () => ({
  useToast: () => {
    const f = vi.fn()
    f.success = vi.fn()
    f.error = vi.fn()
    f.info = vi.fn()
    return f
  },
}))
vi.mock('../components/SeoHead', () => ({ default: () => null }))
vi.mock('../components/EmptyState', () => ({
  default: ({ message, action }) => (
    <div data-testid="empty-state">
      <p>{message}</p>
      {action && <button onClick={action.onClick}>{action.label}</button>}
    </div>
  ),
}))
vi.mock('../lib/manga', () => ({ getMangaChapterPages: mocks.mockGetMangaChapterPages, getMangaChapters: mocks.mockGetMangaChapters }))
vi.mock('../utils/downloads', () => ({
  addDownload: mocks.mockAddDownload,
  cacheUrls: mocks.mockCacheUrls,
  getDownload: mocks.mockGetDownload,
}))
vi.mock('../lib/achievements', () => ({ XP_VALUES: { READ_MANGA_CHAPTER: 5 } }))
vi.mock('../components/CommunityMangaChapters', () => ({ default: () => null }))

import MangaRead from './MangaRead'

function renderMangaRead(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <MangaRead />
    </MemoryRouter>,
  )
}

describe('MangaRead', () => {
  afterEach(vi.clearAllMocks)

  it('exporta el componente', () => {
    expect(MangaRead).toBeDefined()
  })

  it('renderiza loading state', () => {
    mocks.mockGetMangaChapterPages.mockReturnValue(new Promise(() => {}))
    mocks.mockGetMangaChapters.mockReturnValue(new Promise(() => {}))
    renderMangaRead('/manga/12345/read?chapterId=ch-1&chapter=1')
    expect(screen.getByText('manga.reader.scroll')).toBeInTheDocument()
  })

  it('renderiza error state via EmptyState cuando falla la carga', async () => {
    mocks.mockGetMangaChapterPages.mockRejectedValue(new Error('Failed to load'))
    mocks.mockGetMangaChapters.mockResolvedValue([])
    renderMangaRead('/manga/12345/read?chapterId=ch-1&chapter=1')

    const emptyState = await screen.findByTestId('empty-state')
    expect(emptyState).toBeInTheDocument()
    expect(emptyState).toHaveTextContent('manga.reader.error')
  })

  it('muestra botones de scroll/single mode', async () => {
    mocks.mockGetMangaChapterPages.mockResolvedValue([])
    mocks.mockGetMangaChapters.mockResolvedValue([{ chapterId: 'ch-1', chapterNumber: 1 }])
    renderMangaRead('/manga/12345/read?chapterId=ch-1&chapter=1')

    const scrollBtns = await screen.findAllByText('manga.reader.scroll')
    expect(scrollBtns.length).toBeGreaterThanOrEqual(1)

    fireEvent.click(scrollBtns[0])
    expect(await screen.findByText('manga.reader.singlePage')).toBeInTheDocument()
  })

  it('muestra boton de download offline cuando hay paginas', async () => {
    mocks.mockGetMangaChapterPages.mockResolvedValue([{ url: 'https://example.com/page1.jpg', pageNumber: 1 }])
    mocks.mockGetMangaChapters.mockResolvedValue([{ chapterId: 'ch-1', chapterNumber: 1 }])
    mocks.mockGetDownload.mockReturnValue(null)
    renderMangaRead('/manga/12345/read?chapterId=ch-1&chapter=1')

    const downloadBtns = await screen.findAllByText('manga.reader.downloadOffline')
    expect(downloadBtns.length).toBeGreaterThanOrEqual(1)
  })
})
