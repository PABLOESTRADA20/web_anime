import { verifyAuth, corsHeaders, handleOptions } from '../../_middleware'
import { queryOne, execute } from '../../_db'

export async function onRequest(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight
  const user = await verifyAuth(request, env)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }
  const url = new URL(request.url)
  const { method } = request
  if (method === 'GET') {
    const slug = url.searchParams.get('novel_slug')
    if (!slug) {
      return new Response(JSON.stringify({ error: 'novel_slug required' }), { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }
    const row = await queryOne(env.DB, 'SELECT rating FROM novel_ratings WHERE user_id = ? AND novel_slug = ?', [user.id, slug])
    return new Response(JSON.stringify({ data: row ? { rating: row.rating } : null }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }
  if (method === 'POST') {
    const { novel_slug, rating } = await request.json()
    await execute(env.DB, "INSERT INTO novel_ratings (user_id, novel_slug, rating, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(user_id, novel_slug) DO UPDATE SET rating = ?, updated_at = datetime('now')", [user.id, novel_slug, rating, rating])
    return new Response(JSON.stringify({ data: { rating } }), { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }
  if (method === 'DELETE') {
    const { novel_slug } = await request.json()
    await execute(env.DB, 'DELETE FROM novel_ratings WHERE user_id = ? AND novel_slug = ?', [user.id, novel_slug])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
}
