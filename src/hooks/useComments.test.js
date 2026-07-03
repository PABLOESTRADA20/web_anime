import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { useComments } from './useComments'

const mockUser = { id: 'user-1', email: 'test@test.com' }

function createChain() {
  const chain = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    then: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    catch: vi.fn(),
  }
  chain.from.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.is.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  chain.insert.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  return chain
}

vi.mock('../lib/supabase', () => ({
  supabase: createChain(),
  isSupabaseReady: () => true,
  attachUserEmails: (data) => Promise.resolve(data || []),
}))

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

describe('useComments', () => {
  let supabase

  afterEach(cleanup)

  beforeEach(async () => {
    vi.clearAllMocks()
    supabase = (await import('../lib/supabase')).supabase
    supabase.from.mockReturnValue(supabase)
    supabase.select.mockReturnValue(supabase)
    supabase.eq.mockReturnValue(supabase)
    supabase.is.mockReturnValue(supabase)
    supabase.order.mockReturnValue(supabase)
    supabase.insert.mockReturnValue(supabase)
    supabase.delete.mockReturnValue(supabase)
    supabase.then.mockImplementation((fn) => {
      fn({ data: [], error: null })
      return { catch: vi.fn() }
    })
  })

  it('addComment lanza RATE_LIMIT cuando el trigger lo rechaza', async () => {
    const { result } = renderHook(() => useComments(1, 'anime'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    supabase.single.mockResolvedValue({ data: null, error: { message: 'rate_limit: Please wait', hint: 'rate_limit_exceeded' } })

    await expect(result.current.addComment('test', null)).rejects.toHaveProperty('code', 'RATE_LIMIT')
  })

  it('addComment lanza UNKNOWN para otros errores', async () => {
    const { result } = renderHook(() => useComments(1, 'anime'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    supabase.single.mockResolvedValue({ data: null, error: { message: 'Database error' } })

    await expect(result.current.addComment('test', null)).rejects.toHaveProperty('code', 'UNKNOWN')
  })

  it('addComment retorna datos si no hay error', async () => {
    const { result } = renderHook(() => useComments(1, 'anime'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    supabase.single.mockResolvedValue({ data: { id: 42, content: 'test' }, error: null })

    const data = await result.current.addComment('test', null)
    expect(data).toEqual({ id: 42, content: 'test' })
  })

  it('exporta las funciones esperadas', async () => {
    const { result } = renderHook(() => useComments(1, 'anime'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(typeof result.current.addComment).toBe('function')
    expect(typeof result.current.deleteComment).toBe('function')
    expect(typeof result.current.toggleLike).toBe('function')
    expect(typeof result.current.refresh).toBe('function')
  })
})
