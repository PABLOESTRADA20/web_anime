import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useI18n } from '../hooks/useI18n'

const RANDOM_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total }
      media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
        id
      }
    }
  }`

const ANILIST_API = 'https://graphql.anilist.co'

export default function Random() {
  const { t } = useI18n()
  const [target, setTarget] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function pick() {
      const res = await fetch(ANILIST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: RANDOM_QUERY, variables: { page: 1, perPage: 50 } }),
      })
      const json = await res.json()
      if (cancelled) return
      const pool = json?.data?.Page?.media?.filter(Boolean) || []
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)]
        setTarget(pick.id)
      } else {
        setTarget(1)
      }
    }
    pick().catch(() => {
      if (!cancelled) setTarget(1)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (target) return <Navigate to={`/anime/${target}`} replace />
  return <div className="text-center py-20 text-text-secondary">{t('random.searching')}</div>
}
