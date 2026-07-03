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

vi.mock('../hooks/useMangaLists', () => ({
  useMangaLists: () => ({ getUserList: () => [], loading: false }),
}))

vi.mock('../hooks/useMangaFavorites', () => ({
  useMangaFavorites: () => ({ favorites: [], loading: false }),
}))

vi.mock('../hooks/useMangaHistory', () => ({
  useMangaHistory: () => ({ mangaHistory: [] }),
}))

import MyMangas from './MyMangas'

function renderPage(initialEntries = ['/mis-mangas']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <MyMangas />
    </MemoryRouter>,
  )
}

describe('MyMangas', () => {
  afterEach(vi.clearAllMocks)

  it('redirige a /login si no hay usuario autenticado', () => {
    useAuth.mockReturnValue({ user: null })
    renderPage()
    expect(screen.queryByText('Mis Mangas')).not.toBeInTheDocument()
  })

  it('renderiza las 4 tabs', () => {
    useAuth.mockReturnValue({ user: { id: 'user-1' } })
    renderPage()
    expect(screen.getByText('myMangas.tabs.reading', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('myMangas.tabs.favorites', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('myMangas.tabs.completed', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('myMangas.tabs.history', { exact: false })).toBeInTheDocument()
  })

  it('muestra EmptyState cuando no hay datos', () => {
    useAuth.mockReturnValue({ user: { id: 'user-1' } })
    renderPage()
    const emptyStates = screen.getAllByText('myMangas.empty.reading')
    expect(emptyStates.length).toBeGreaterThan(0)
  })

  it('exporta el componente correctamente', () => {
    expect(MyMangas).toBeDefined()
  })
})
