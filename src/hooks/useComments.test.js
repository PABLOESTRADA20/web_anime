import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { useComments } from './useComments'

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

function errResponse(status, body) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }
}

describe('useComments', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('addComment lanza RATE_LIMIT cuando el API lo rechaza', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(okResponse({ data: [] }))
      .mockResolvedValueOnce(errResponse(429, { code: 'RATE_LIMIT', message: 'Please wait' }))

    const { result } = renderHook(() => useComments(1, 'anime'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.addComment('test', null)).rejects.toHaveProperty('code', 'RATE_LIMIT')
  })

  it('addComment lanza UNKNOWN para otros errores', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(okResponse({ data: [] }))
      .mockResolvedValueOnce(errResponse(500, { error: 'Database error' }))

    const { result } = renderHook(() => useComments(1, 'anime'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.addComment('test', null)).rejects.toHaveProperty('code', 'UNKNOWN')
  })

  it('addComment retorna datos si no hay error', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(okResponse({ data: [] }))
      .mockResolvedValueOnce(okResponse({ data: { id: 42, content: 'test' } }))

    const { result } = renderHook(() => useComments(1, 'anime'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const data = await result.current.addComment('test', null)
    expect(data).toEqual({ id: 42, content: 'test' })
  })

  it('exporta las funciones esperadas', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({ data: [] }))

    const { result } = renderHook(() => useComments(1, 'anime'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(typeof result.current.addComment).toBe('function')
    expect(typeof result.current.deleteComment).toBe('function')
    expect(typeof result.current.toggleLike).toBe('function')
    expect(typeof result.current.refresh).toBe('function')
  })
})
