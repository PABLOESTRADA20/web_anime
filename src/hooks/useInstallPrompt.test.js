import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInstallPrompt } from './useInstallPrompt'

describe('useInstallPrompt', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({ matches: false })),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('retorna canInstall false e isInstalled false inicialmente', () => {
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.canInstall).toBe(false)
    expect(result.current.isInstalled).toBe(false)
  })

  it('detecta cuando la app ya está instalada', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({ matches: true })),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.isInstalled).toBe(true)
    expect(result.current.canInstall).toBe(false)
  })

  it('registra beforeinstallprompt event listener', () => {
    const addEventListener = vi.fn()
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({ matches: false })),
      addEventListener,
      removeEventListener: vi.fn(),
    })
    renderHook(() => useInstallPrompt())
    expect(addEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    expect(addEventListener).toHaveBeenCalledWith('appinstalled', expect.any(Function))
  })

  it('actualiza canInstall cuando se dispara beforeinstallprompt', () => {
    let bpHandler
    const addEventListener = vi.fn((event, handler) => {
      if (event === 'beforeinstallprompt') bpHandler = handler
    })
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({ matches: false })),
      addEventListener,
      removeEventListener: vi.fn(),
    })
    const { result } = renderHook(() => useInstallPrompt())
    act(() => {
      bpHandler({ preventDefault: vi.fn(), prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) })
    })
    expect(result.current.canInstall).toBe(true)
  })

  it('promptInstall llama a prompt y maneja accepted', async () => {
    let bpHandler
    const addEventListener = vi.fn((event, handler) => {
      if (event === 'beforeinstallprompt') bpHandler = handler
    })
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({ matches: false })),
      addEventListener,
      removeEventListener: vi.fn(),
    })
    const { result } = renderHook(() => useInstallPrompt())
    const mockPrompt = vi.fn()
    act(() => {
      bpHandler({ preventDefault: vi.fn(), prompt: mockPrompt, userChoice: Promise.resolve({ outcome: 'accepted' }) })
    })
    expect(result.current.canInstall).toBe(true)
    await act(async () => {
      await result.current.promptInstall()
    })
    expect(mockPrompt).toHaveBeenCalledOnce()
    expect(result.current.canInstall).toBe(false)
    expect(result.current.isInstalled).toBe(true)
  })

  it('limpieza remueve event listeners', () => {
    const removeEventListener = vi.fn()
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({ matches: false })),
      addEventListener: vi.fn(),
      removeEventListener,
    })
    const { unmount } = renderHook(() => useInstallPrompt())
    unmount()
    expect(removeEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    expect(removeEventListener).toHaveBeenCalledWith('appinstalled', expect.any(Function))
  })
})
