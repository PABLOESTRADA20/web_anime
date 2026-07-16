import { verifyAuth, corsHeaders, handleOptions } from '../../_middleware'
import { execute, queryOne } from '../../_db'

export async function onRequest(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  const user = await verifyAuth(request, env)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  const existing = await queryOne(env.DB, 'SELECT id FROM admin_users WHERE user_id = ?', [user.id])
  if (existing) {
    return new Response(JSON.stringify({ data: { is_admin: true } }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }

  await execute(env.DB, 'INSERT INTO admin_users (user_id) VALUES (?)', [user.id])
  return new Response(JSON.stringify({ data: { is_admin: true } }), {
    status: 201,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
