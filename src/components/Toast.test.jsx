import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from './Toast'

vi.useFakeTimers()

function TestHarness({ msg, type, duration }) {
  const toast = useToast()
  return <button onClick={() => toast(msg, type, duration)}>show toast</button>
}

function renderToast(initialMsg, type, duration) {
  return render(
    <ToastProvider>
      <TestHarness msg={initialMsg} type={type} duration={duration} />
    </ToastProvider>,
  )
}

describe('ToastProvider / useToast', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('lanza error si useToast se usa fuera del provider', () => {
    expect(() => render(<TestHarness />)).toThrow('useToast must be used within ToastProvider')
  })

  it('renderiza toast al hacer click', () => {
    renderToast('Hola mundo')
    act(() => {
      screen.getByText('show toast').click()
    })
    expect(screen.getByText('Hola mundo')).toBeInTheDocument()
  })

  it('remueve toast al hacer click en él', () => {
    renderToast('Mensaje')
    act(() => {
      screen.getByText('show toast').click()
    })
    act(() => {
      screen.getByText('Mensaje').click()
    })
    expect(screen.queryByText('Mensaje')).not.toBeInTheDocument()
  })

  it('remueve toast después del duration', () => {
    renderToast('Auto', 'info', 5000)
    act(() => {
      screen.getByText('show toast').click()
    })
    expect(screen.getByText('Auto')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.queryByText('Auto')).not.toBeInTheDocument()
  })

  it('renderiza toast de tipo success', () => {
    renderToast('Éxito', 'success')
    act(() => {
      screen.getByText('show toast').click()
    })
    const toast = screen.getByText('Éxito')
    expect(toast).toBeInTheDocument()
    expect(toast.className).toContain('bg-green-600')
  })

  it('renderiza toast de tipo error', () => {
    renderToast('Error!', 'error')
    act(() => {
      screen.getByText('show toast').click()
    })
    const toast = screen.getByText('Error!')
    expect(toast).toBeInTheDocument()
    expect(toast.className).toContain('bg-red-600')
  })

  it('renderiza toast de tipo info', () => {
    renderToast('Info', 'info')
    act(() => {
      screen.getByText('show toast').click()
    })
    const toast = screen.getByText('Info')
    expect(toast).toBeInTheDocument()
    expect(toast.className).toContain('bg-surface')
  })
})
