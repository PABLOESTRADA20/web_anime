import { useState, useEffect, useRef, useCallback } from 'react'
import { getCached, setCache } from '../lib/cache'

export function useCache(key, fetcher, options = {}) {
  const { store = 'anilist' } = options
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const [data, setData] = useState(() => getCached(key, store))
  const [loading, setLoading] = useState(!data)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const cached = getCached(key, store)
    if (cached) {
      setData(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    fetcherRef
      .current()
      .then((result) => {
        if (!cancelled) {
          setCache(key, result, store)
          setData(result)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [key, store])

  const refetch = useCallback(() => {
    setData(null)
    setLoading(true)
  }, [])

  return { data, loading, error, refetch }
}
