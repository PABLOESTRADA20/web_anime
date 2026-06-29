import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ErrorBoundary from './ErrorBoundary'

afterEach(cleanup)

function Bomb({ shouldThrow }) {
  if (shouldThrow) throw new Error('Test error!')
  return <p>Todo bien</p>
}

function renderBoundary(shouldThrow = false) {
  return render(
    <MemoryRouter>
      <ErrorBoundary>
        <Bomb shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </MemoryRouter>,
  )
}

describe('ErrorBoundary', () => {
  it('renderiza children cuando no hay error', () => {
    renderBoundary(false)
    expect(screen.getByText('Todo bien')).toBeInTheDocument()
  })

  it('renderiza fallback cuando hay error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderBoundary(true)
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    expect(screen.getByText('Test error!')).toBeInTheDocument()
    expect(screen.getByText('Recargar página')).toBeInTheDocument()
    expect(screen.getByText('Volver al inicio')).toBeInTheDocument()
    console.error.mockRestore()
  })

  it('el link Volver al inicio apunta a /', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderBoundary(true)
    const links = screen.getAllByText('Volver al inicio')
    expect(links[0]).toHaveAttribute('href', '/')
    console.error.mockRestore()
  })
})
