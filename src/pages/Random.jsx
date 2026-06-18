import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

const RANDOM_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
        id
      }
    }
  }`

const ANILIST_API = 'https://graphql.anilist.co'

async function getTotalPages() {
  const res = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: RANDOM_QUERY, variables: { page: 1, perPage: 1 } }),
  })
  const json = await res.json()
  return json.data?.Page?.media?.[0]?.id || 0
}

export default function Random() {
  const [target, setTarget] = useState(null)

  useEffect(() => {
    let cancelled = false
    getTotalPages().then((maxId) => {
      if (cancelled) return
      const randomId = Math.floor(Math.random() * maxId) + 1
      setTarget(randomId)
    }).catch(() => {
      if (!cancelled) setTarget(1)
    })
    return () => { cancelled = true }
  }, [])

  if (target) return <Navigate to={`/anime/${target}`} replace />
  return (
    <div className="text-center py-20 text-text-secondary">
      Buscando un anime aleatorio...
    </div>
  )
}
