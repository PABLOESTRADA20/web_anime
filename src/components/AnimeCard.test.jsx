import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...props }) => <div {...props}>{children}</div> },
}))

import AnimeCard from './AnimeCard'

afterEach(cleanup)

function renderCard(anime, props = {}) {
  return render(
    <MemoryRouter>
      <AnimeCard anime={anime} {...props} />
    </MemoryRouter>,
  )
}

describe('AnimeCard', () => {
  const baseAnime = {
    anilistId: 21,
    title: { romaji: 'One Piece' },
    image: 'https://cdn.com/onepiece.jpg',
    score: 85,
    format: 'TV',
  }

  it('renderiza el título', () => {
    renderCard(baseAnime)
    expect(screen.getByText('One Piece')).toBeInTheDocument()
  })

  it('usa title_es como prioridad', () => {
    renderCard({ ...baseAnime, title_es: 'One Piece Español', title: { romaji: 'One Piece' } })
    expect(screen.getByText('One Piece Español')).toBeInTheDocument()
  })

  it('renderiza el score cuando existe', () => {
    renderCard(baseAnime)
    expect(screen.getByText('85')).toBeInTheDocument()
  })

  it('no renderiza score si no existe', () => {
    renderCard({ ...baseAnime, score: null, averageScore: null })
    expect(screen.queryByText('85')).not.toBeInTheDocument()
  })

  it('renderiza badge ES cuando hay title_es', () => {
    renderCard({ ...baseAnime, title_es: 'One Piece ES' })
    expect(screen.getByText('ES')).toBeInTheDocument()
  })

  it('renderiza badge de formato', () => {
    renderCard(baseAnime)
    expect(screen.getByText('TV')).toBeInTheDocument()
  })

  it('enlaza a /anime/:id por defecto', () => {
    renderCard(baseAnime)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/anime/21')
  })

  it('enlaza a /watch cuando hay watchEp', () => {
    renderCard({ ...baseAnime, watchEp: 5 })
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', expect.stringContaining('/watch'))
  })

  it('muestra fallback textual si no hay imagen', () => {
    renderCard({ ...baseAnime, image: null })
    expect(screen.getAllByText('One Piece')).toHaveLength(2)
  })

  it('renderiza barra de progreso cuando progress está definido', () => {
    const { container } = renderCard(baseAnime, { progress: 0.5 })
    const progressBar = container.querySelector('[style*="width"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('no renderiza barra de progreso si no está definido', () => {
    const { container } = renderCard(baseAnime)
    expect(container.querySelector('[style*="width"]')).not.toBeInTheDocument()
  })

  it('usa fallback "Sin título" si no hay title', () => {
    renderCard({ anilistId: 1 })
    expect(screen.getAllByText('Sin título')).toHaveLength(2)
  })
})
