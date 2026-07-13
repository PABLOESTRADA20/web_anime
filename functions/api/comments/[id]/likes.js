import { verifyAuth, corsHeaders, handleOptions } from '../../../_middleware'
import { queryOne, execute } from '../../../_db'

export async function onRequest(context) {
  const { request, env, params } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight

  const user = await verifyAuth(request, env)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }

  if (request.method === 'POST') {
    const commentId = parseInt(params.id, 10)
    const existing = await queryOne(env.DB, 'SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?', [commentId, user.id])

    if (existing) {
      await execute(env.DB, 'DELETE FROM comment_likes WHERE id = ?', [existing.id])
    } else {
      await execute(env.DB, 'INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)', [user.id, commentId])
    }

    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
}
