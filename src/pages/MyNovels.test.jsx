import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../hooks/useI18n', () => ({
  useI18n: () => ({ t: (k) => k, locale: 'es' }),
}))

vi.mock('../hooks/useNovelLists', () => ({
  useNovelLists: () => ({ getUserList: () => [], loading: false }),
}))

vi.mock('../hooks/useNovelFavorites', () => ({
  useNovelFavorites: () => ({ favorites: [], loading: false }),
}))

vi.mock('../hooks/useNovelHistory', () => ({
  useNovelHistory: () => ({ history: [], loading: false }),
}))

import MyNovels from './MyNovels'

function renderPage(initialEntries = ['/mis-novelas']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <MyNovels />
    </MemoryRouter>,
  )
}

describe('MyNovels', () => {
  afterEach(vi.clearAllMocks)

  it('redirige a /login si no hay usuario autenticado', () => {
    useAuth.mockReturnValue({ user: null })
    renderPage()
    expect(screen.queryByText('myNovels.title')).not.toBeInTheDocument()
  })

  it('renderiza las 4 tabs', () => {
    useAuth.mockReturnValue({ user: { id: 'user-1' } })
    renderPage()
    expect(screen.getByText('myNovels.tabs.reading', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('myNovels.tabs.favorites', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('myNovels.tabs.completed', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('myNovels.tabs.history', { exact: false })).toBeInTheDocument()
  })

  it('muestra EmptyState cuando no hay datos', () => {
    useAuth.mockReturnValue({ user: { id: 'user-1' } })
    renderPage()
    const emptyStates = screen.getAllByText('myNovels.empty.reading')
    expect(emptyStates.length).toBeGreaterThan(0)
  })

  it('exporta el componente correctamente', () => {
    expect(MyNovels).toBeDefined()
  })
})
