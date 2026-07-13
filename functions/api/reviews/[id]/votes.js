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
    const reviewId = parseInt(params.id, 10)
    const { vote } = await request.json()

    const existing = await queryOne(env.DB, 'SELECT id, vote FROM review_votes WHERE review_id = ? AND user_id = ?', [reviewId, user.id])

    if (existing) {
      if (existing.vote === vote) {
        await execute(env.DB, 'DELETE FROM review_votes WHERE id = ?', [existing.id])
      } else {
        await execute(env.DB, 'UPDATE review_votes SET vote = ? WHERE id = ?', [vote, existing.id])
      }
    } else {
      await execute(env.DB, 'INSERT INTO review_votes (user_id, review_id, vote) VALUES (?, ?, ?)', [user.id, reviewId, vote])
    }

    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
}
