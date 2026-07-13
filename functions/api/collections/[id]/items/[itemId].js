import { verifyAuth, corsHeaders, handleOptions } from '../../../../_middleware'
import { execute } from '../../../../_db'

export async function onRequest(context) {
  const { request, env, params } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight

  const user = await verifyAuth(request, env)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }

  const itemId = parseInt(params.itemId, 10)

  if (request.method === 'DELETE') {
    await execute(env.DB, 'DELETE FROM collection_items WHERE id = ?', [itemId])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  if (request.method === 'PATCH') {
    const { note } = await request.json()
    await execute(env.DB, 'UPDATE collection_items SET note = ? WHERE id = ?', [note || '', itemId])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
}
