import { useState, useCallback } from 'react'

const API_URL = import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/animeflv-scraper` : null

export function useAnimeflvScraper() {
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState([])
  const [error, setError] = useState(null)

  const scrape = useCallback(async (slug) => {
    if (!API_URL) {
      setError('API no configurada')
      return
    }
    setLoading(true)
    setError(null)
    setSources([])
    try {
      const res = await fetch(`${API_URL}?slug=${encodeURIComponent(slug)}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      if (json.count > 0) {
        setSources(json.data)
      } else {
        setError('No se encontraron fuentes en AnimeFLV')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const scrapeById = useCallback(async (anilistId, episodeNumber) => {
    if (!API_URL) {
      setError('API no configurada')
      return
    }
    setLoading(true)
    setError(null)
    setSources([])
    try {
      const res = await fetch(`${API_URL}?anilist_id=${anilistId}&episode_number=${episodeNumber}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      if (json.count > 0) {
        setSources(json.data)
      } else {
        setError('No se encontraron fuentes en AnimeFLV')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { scrape, scrapeById, sources, loading, error }
}
