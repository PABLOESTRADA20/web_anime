import { verifyAuth, corsHeaders, handleOptions } from '../../_middleware'
import { query, execute } from '../../_db'

export async function onRequest(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight
  const user = await verifyAuth(request, env)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }
  const { method } = request
  if (method === 'GET') {
    const items = await query(env.DB, 'SELECT * FROM novel_favorites WHERE user_id = ? ORDER BY created_at DESC', [user.id])
    return new Response(JSON.stringify({ data: items }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }
  if (method === 'POST') {
    const { novel_slug, title, cover } = await request.json()
    await execute(env.DB, 'INSERT OR IGNORE INTO novel_favorites (user_id, novel_slug, title, cover) VALUES (?, ?, ?, ?)', [user.id, novel_slug, title ?? '', cover ?? ''])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (method === 'DELETE') {
    const { novel_slug } = await request.json()
    await execute(env.DB, 'DELETE FROM novel_favorites WHERE user_id = ? AND novel_slug = ?', [user.id, novel_slug])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
}
