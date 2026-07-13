import { verifyAuth, corsHeaders, handleOptions } from '../../../_middleware'
import { execute } from '../../../_db'

export async function onRequest(context) {
  const { request, env, params } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight

  const user = await verifyAuth(request, env)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }

  if (request.method === 'DELETE') {
    await execute(env.DB, 'DELETE FROM reviews WHERE id = ? AND user_id = ?', [parseInt(params.id, 10), user.id])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
}
