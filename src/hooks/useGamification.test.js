import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { useGamification } from './useGamification'

const mockUser = { id: 'user-1', email: 'test@test.com' }

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

function okResponse(data) {
  return {
    ok: true,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  }
}

describe('useGamification', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('carga el perfil al montarse', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      okResponse({ data: { xp: 250, level: 1, achievements: [] } }),
    )

    const { result } = renderHook(() => useGamification())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile).toEqual({ xp: 250, level: 1 })
  })

  it('tiene funciones exportadas', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      okResponse({ data: { xp: 0, level: 1, achievements: [] } }),
    )

    const { result } = renderHook(() => useGamification())
    await waitFor(() => !result.current.loading)
    expect(typeof result.current.addXp).toBe('function')
    expect(typeof result.current.checkAchievements).toBe('function')
    expect(result.current.unlockedSet instanceof Set).toBe(true)
  })
})
