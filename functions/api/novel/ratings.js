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
    const slug = url.searchParams.get('novel_slug')
    const targetUserId = url.searchParams.get('user_id')

    if (targetUserId) {
      const items = await query(env.DB, 'SELECT novel_slug, rating FROM novel_ratings WHERE user_id = ?', [targetUserId])
      return new Response(JSON.stringify({ data: items }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }

    if (!slug) {
      const items = await query(env.DB, 'SELECT novel_slug, rating FROM novel_ratings WHERE user_id = ?', [user.id])
      return new Response(JSON.stringify({ data: items }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    const row = await queryOne(env.DB, 'SELECT rating FROM novel_ratings WHERE user_id = ? AND novel_slug = ?', [user.id, slug])
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
    const { novel_slug, rating } = await request.json()
    await execute(
      env.DB,
      "INSERT INTO novel_ratings (user_id, novel_slug, rating, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(user_id, novel_slug) DO UPDATE SET rating = ?, updated_at = datetime('now')",
      [user.id, novel_slug, rating, rating],
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
    const { novel_slug } = await request.json()
    await execute(env.DB, 'DELETE FROM novel_ratings WHERE user_id = ? AND novel_slug = ?', [user.id, novel_slug])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
