import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { useGamification } from './useGamification'

const mockUser = { id: 'user-1', email: 'test@test.com' }

function createChain() {
  const chain = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    then: vi.fn(),
    insert: vi.fn(),
    upsert: vi.fn(),
    catch: vi.fn(),
  }
  chain.from.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.single.mockReturnValue(chain)
  chain.insert.mockReturnValue(chain)
  chain.upsert.mockReturnValue(chain)
  return chain
}

vi.mock('../lib/supabase', () => ({
  supabase: createChain(),
}))

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

describe('useGamification', () => {
  afterEach(cleanup)

  beforeEach(async () => {
    vi.clearAllMocks()
    const { supabase } = await import('../lib/supabase')
    supabase.from.mockReturnValue(supabase)
    supabase.select.mockReturnValue(supabase)
    supabase.eq.mockReturnValue(supabase)
    supabase.single.mockReturnValue(supabase)
    supabase.insert.mockReturnValue(supabase)
    supabase.upsert.mockReturnValue(supabase)
    let callCount = 0
    supabase.then.mockImplementation((fn) => {
      callCount++
      if (callCount === 1) {
        fn({ data: { xp: 250, level: 1 }, error: null })
      } else {
        fn({ data: [] })
      }
      return { catch: vi.fn() }
    })
  })

  it('carga el perfil al montarse', async () => {
    const { result } = renderHook(() => useGamification())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile).toEqual({ xp: 250, level: 1 })
  })

  it('tiene funciones exportadas', async () => {
    const { result } = renderHook(() => useGamification())
    await waitFor(() => !result.current.loading)
    expect(typeof result.current.addXp).toBe('function')
    expect(typeof result.current.checkAchievements).toBe('function')
    expect(result.current.unlockedSet instanceof Set).toBe(true)
  })
})
