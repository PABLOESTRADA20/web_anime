import { verifyAuth, corsHeaders, handleOptions } from '../../_middleware'
import { queryOne } from '../../_db'

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

  const row = await queryOne(env.DB, 'SELECT id FROM admin_users WHERE user_id = ?', [user.id])
  return new Response(JSON.stringify({ data: { is_admin: !!row } }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
}
