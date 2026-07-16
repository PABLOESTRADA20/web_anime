import { verifyAuth, corsHeaders, handleOptions } from '../_middleware'
import { queryOne, execute } from '../_db'

const DEFAULTS = {
  new_episode: 1,
  new_review: 1,
  comment_reply: 1,
  review_vote: 1,
  weekly_digest: 0,
}

export async function onRequest(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight

  const { method } = request

  if (method === 'GET') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    let row = await queryOne(env.DB, 'SELECT * FROM notification_preferences WHERE user_id = ?', [user.id])
    if (!row) {
      await execute(
        env.DB,
        "INSERT INTO notification_preferences (user_id, new_episode, new_review, comment_reply, review_vote, weekly_digest, updated_at) VALUES (?, 1, 1, 1, 1, 0, datetime('now'))",
        [user.id],
      )
      row = await queryOne(env.DB, 'SELECT * FROM notification_preferences WHERE user_id = ?', [user.id])
    }
    return new Response(JSON.stringify({ data: { ...DEFAULTS, ...row } }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  if (method === 'POST' || method === 'PUT') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const body = await request.json()
    const { new_episode, new_review, comment_reply, review_vote, weekly_digest } = body
    await execute(
      env.DB,
      "INSERT INTO notification_preferences (user_id, new_episode, new_review, comment_reply, review_vote, weekly_digest, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now')) ON CONFLICT(user_id) DO UPDATE SET new_episode = ?, new_review = ?, comment_reply = ?, review_vote = ?, weekly_digest = ?, updated_at = datetime('now')",
      [
        user.id,
        new_episode ?? 1,
        new_review ?? 1,
        comment_reply ?? 1,
        review_vote ?? 1,
        weekly_digest ?? 0,
        new_episode ?? 1,
        new_review ?? 1,
        comment_reply ?? 1,
        review_vote ?? 1,
        weekly_digest ?? 0,
      ],
    )
    const row = await queryOne(env.DB, 'SELECT * FROM notification_preferences WHERE user_id = ?', [user.id])
    return new Response(JSON.stringify({ data: { ...DEFAULTS, ...row } }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
