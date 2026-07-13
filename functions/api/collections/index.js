import { verifyAuth, corsHeaders, handleOptions } from '../../_middleware'
import { query, execute } from '../../_db'

export async function onRequest(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight

  const { method } = request

  if (method === 'GET') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    const rows = await query(env.DB, 'SELECT * FROM collections WHERE user_id = ? ORDER BY updated_at DESC', [user.id])
    return new Response(JSON.stringify({ data: rows || [] }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  if (method === 'POST') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    const { name, description, is_public } = await request.json()
    if (!name) {
      return new Response(JSON.stringify({ error: 'Name required' }), { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    const result = await execute(
      env.DB,
      'INSERT INTO collections (user_id, name, description, is_public) VALUES (?, ?, ?, ?)',
      [user.id, name, description || '', is_public !== undefined ? (is_public ? 1 : 0) : 1],
    )

    const inserted = await query(env.DB, 'SELECT * FROM collections WHERE id = ?', [result.meta.last_row_id])
    return new Response(JSON.stringify({ data: inserted?.[0] }), {
      status: 201, headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
}
