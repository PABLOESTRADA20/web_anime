import { verifyAuth, corsHeaders, handleOptions } from '../../_middleware'
import { query, execute } from '../../_db'

export async function onRequest(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight

  const { method } = request
  const url = new URL(request.url)

  if (method === 'GET') {
    const user = await verifyAuth(request, env)
    const targetUserId = url.searchParams.get('user_id') || user?.id
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const items = await query(env.DB, 'SELECT * FROM watchlist WHERE user_id = ? ORDER BY created_at DESC', [targetUserId])
    return new Response(JSON.stringify({ data: items }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }

  if (method === 'POST') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { anilist_id, title, image } = await request.json()
    await execute(env.DB, 'INSERT OR IGNORE INTO watchlist (user_id, anilist_id, title, image) VALUES (?, ?, ?, ?)', [
      user.id,
      anilist_id,
      title,
      image ?? null,
    ])
    return new Response(null, { status: 204, headers: corsHeaders() })
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
    await execute(env.DB, 'DELETE FROM watchlist WHERE user_id = ? AND anilist_id = ?', [user.id, anilist_id])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
