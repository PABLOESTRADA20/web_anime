import { verifyAuth, corsHeaders, handleOptions } from '../../../_middleware'
import { query, queryOne, execute } from '../../../_db'

export async function onRequest(context) {
  const { request, env, params } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight

  const { method } = request
  const collectionId = parseInt(params.id, 10)

  const user = await verifyAuth(request, env)
  const collection = await queryOne(env.DB, 'SELECT * FROM collections WHERE id = ?', [collectionId])

  if (!collection) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }

  if (method === 'GET') {
    if (!collection.is_public && (!user || collection.user_id !== user.id)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ data: collection }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  if (!user || collection.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }

  if (method === 'PUT') {
    const { name, description, is_public } = await request.json()
    await execute(
      env.DB,
      "UPDATE collections SET name = COALESCE(?, name), description = COALESCE(?, description), is_public = COALESCE(?, is_public), updated_at = datetime('now') WHERE id = ?",
      [name || null, description !== undefined ? description : null, is_public !== undefined ? (is_public ? 1 : 0) : null, collectionId],
    )
    const updated = await queryOne(env.DB, 'SELECT * FROM collections WHERE id = ?', [collectionId])
    return new Response(JSON.stringify({ data: updated }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  if (method === 'DELETE') {
    await execute(env.DB, 'DELETE FROM collections WHERE id = ?', [collectionId])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
}
