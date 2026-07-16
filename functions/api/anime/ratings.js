import { verifyAuth, corsHeaders, handleOptions } from '../../_middleware'
import { query, queryOne, execute } from '../../_db'

export async function onRequest(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight

  const url = new URL(request.url)
  const { method } = request

  if (method === 'GET') {
    const user = await verifyAuth(request, env)
    const anilistId = url.searchParams.get('anilist_id')
    const targetUserId = url.searchParams.get('user_id')

    if (targetUserId) {
      const items = await query(env.DB, 'SELECT anilist_id, rating FROM anime_ratings WHERE user_id = ?', [targetUserId])
      return new Response(JSON.stringify({ data: items }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }

    if (!anilistId) {
      const items = await query(env.DB, 'SELECT anilist_id, rating FROM anime_ratings WHERE user_id = ?', [user.id])
      return new Response(JSON.stringify({ data: items }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    const row = await queryOne(env.DB, 'SELECT rating FROM anime_ratings WHERE user_id = ? AND anilist_id = ?', [
      user.id,
      parseInt(anilistId, 10),
    ])
    return new Response(JSON.stringify({ data: row ? { rating: row.rating } : null }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  if (method === 'POST') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { anilist_id, rating } = await request.json()
    await execute(
      env.DB,
      "INSERT INTO anime_ratings (user_id, anilist_id, rating, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(user_id, anilist_id) DO UPDATE SET rating = ?, updated_at = datetime('now')",
      [user.id, anilist_id, rating, rating],
    )
    return new Response(JSON.stringify({ data: { rating } }), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  if (method === 'DELETE') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { anilist_id } = await request.json()
    await execute(env.DB, 'DELETE FROM anime_ratings WHERE user_id = ? AND anilist_id = ?', [user.id, anilist_id])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
