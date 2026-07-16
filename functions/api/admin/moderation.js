import { verifyAuth, corsHeaders, handleOptions } from '../../_middleware'
import { query, queryOne, execute } from '../../_db'

const ALLOWED_TABLES = ['community_episodes', 'community_manga_chapters', 'community_novel_chapters']

export async function onRequest(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight

  const user = await verifyAuth(request, env)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  const admin = await queryOne(env.DB, 'SELECT id FROM admin_users WHERE user_id = ?', [user.id])
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(request.url)
  const table = url.searchParams.get('table')

  if (!table || !ALLOWED_TABLES.includes(table)) {
    return new Response(JSON.stringify({ error: 'Invalid table' }), {
      status: 400,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  const { method } = request

  if (method === 'GET') {
    const items = await query(env.DB, `SELECT * FROM ${table} ORDER BY created_at DESC`, [])
    return new Response(JSON.stringify({ data: items }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }

  if (method === 'PATCH') {
    const { id, status } = await request.json()
    await execute(env.DB, `UPDATE ${table} SET status = ? WHERE id = ?`, [status, id])
    const item = await queryOne(env.DB, `SELECT * FROM ${table} WHERE id = ?`, [id])
    return new Response(JSON.stringify({ data: item }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }

  if (method === 'DELETE') {
    const { id } = await request.json()
    await execute(env.DB, `DELETE FROM ${table} WHERE id = ?`, [id])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
