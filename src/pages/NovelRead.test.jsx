import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { getChapterContent, getNovelChapters } from '../lib/novels'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
  },
}))

vi.mock('dompurify', () => ({ default: { sanitize: (s) => s } }))

vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('../hooks/useI18n', () => ({
  useI18n: () => ({ t: (k) => k, locale: 'es', localeNames: { es: 'Español' } }),
}))
vi.mock('../hooks/useNovelHistory', () => ({
  useNovelHistory: () => ({ history: [], saveProgress: vi.fn(), getChapterProgress: vi.fn() }),
}))
vi.mock('../hooks/useGamification', () => ({
  useGamification: () => ({ profile: null, addXp: vi.fn(), checkAchievements: vi.fn(), loading: false }),
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
vi.mock('../components/SeoHead', () => ({ default: () => null }))
vi.mock('../components/EmptyState', () => ({
  default: ({ message, action }) => (
    <div data-testid="empty-state">
      <p>{message}</p>
      {action && <button onClick={action.onClick}>{action.label}</button>}
    </div>
  ),
}))
vi.mock('../components/CommunityNovelChapters', () => ({
  default: ({ novelSlug }) => <div data-testid="community-novel-chapters" data-slug={novelSlug} />,
}))

vi.mock('../lib/novels', () => ({ getChapterContent: vi.fn(), getNovelChapters: vi.fn() }))
vi.mock('../utils/downloads', () => ({ addDownload: vi.fn(), isNovelCached: vi.fn().mockResolvedValue(false), cacheNovelContent: vi.fn() }))
vi.mock('../lib/achievements', () => ({ XP_VALUES: { READ_CHAPTER: 5 } }))

import NovelRead from './NovelRead'

function renderNovelRead(initialEntries = ['/novel/test-novel/read?chapter=1']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <NovelRead />
    </MemoryRouter>,
  )
}

describe('NovelRead', () => {
  afterEach(vi.clearAllMocks)

  it('exporta el componente correctamente', () => {
    expect(NovelRead).toBeDefined()
  })

  it('renderiza loading state inicial', () => {
    getChapterContent.mockReturnValue(new Promise(() => {}))
    getNovelChapters.mockReturnValue(new Promise(() => {}))
    renderNovelRead()
    expect(screen.getByText('novel.reader.loading')).toBeInTheDocument()
  })

  it('renderiza error state via EmptyState cuando falla la carga', async () => {
    getChapterContent.mockRejectedValue(new Error('Failed to load'))
    getNovelChapters.mockResolvedValue([])
    renderNovelRead()
    expect(await screen.findByTestId('empty-state')).toBeInTheDocument()
  })

  it('renderiza contenido cuando la carga es exitosa', async () => {
    getChapterContent.mockResolvedValue({ content: '<p>Test content</p>' })
    getNovelChapters.mockResolvedValue([])
    renderNovelRead()
    expect(await screen.findByText('Test content')).toBeInTheDocument()
  })

  it('renderiza botones de bookmark y tema', async () => {
    getChapterContent.mockResolvedValue({ content: '<p>Test content</p>' })
    getNovelChapters.mockResolvedValue([])
    renderNovelRead()
    const bookmarks = await screen.findAllByTitle('novel.reader.saveBookmark')
    expect(bookmarks.length).toBeGreaterThan(0)
    const goTos = screen.getAllByTitle('novel.reader.goToBookmark')
    expect(goTos.length).toBeGreaterThan(0)
    const themes = screen.getAllByTitle('novel.reader.cycleTheme')
    expect(themes.length).toBeGreaterThan(0)
    expect(screen.getAllByTitle('novel.reader.decreaseFont').length).toBeGreaterThan(0)
    expect(screen.getAllByTitle('novel.reader.increaseFont').length).toBeGreaterThan(0)
    expect(screen.getAllByTitle('novel.reader.moreSettings').length).toBeGreaterThan(0)
  })

  it('renderiza boton de A- para disminuir fuente', async () => {
    getChapterContent.mockResolvedValue({ content: '<p>Test content</p>' })
    getNovelChapters.mockResolvedValue([])
    renderNovelRead()
    const minusBtns = await screen.findAllByText('A-')
    expect(minusBtns.length).toBeGreaterThan(0)
    const plusBtns = screen.getAllByText('A+')
    expect(plusBtns.length).toBeGreaterThan(0)
  })

  it('renderiza CommunityNovelChapters', async () => {
    getChapterContent.mockResolvedValue({ content: '<p>Test content</p>' })
    getNovelChapters.mockResolvedValue([])
    renderNovelRead()
    const chapters = await screen.findAllByTestId('community-novel-chapters')
    expect(chapters.length).toBeGreaterThan(0)
  })

  it('renderiza enlaces de navegacion entre capitulos cuando hay varios', async () => {
    getChapterContent.mockResolvedValue({ content: '<p>Test content</p>' })
    getNovelChapters.mockResolvedValue([
      { number: 1, title: 'Chapter 1' },
      { number: 2, title: 'Chapter 2' },
    ])
    renderNovelRead()
    const links = await screen.findAllByText('novel.reader.chapterX', { exact: false })
    expect(links.length).toBeGreaterThan(0)
  })
})
