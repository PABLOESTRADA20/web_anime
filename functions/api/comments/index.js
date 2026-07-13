import { verifyAuth, corsHeaders, handleOptions } from '../../_middleware'
import { query, queryOne, execute } from '../../_db'

export async function onRequest(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight

  const url = new URL(request.url)
  const { method } = request

  if (method === 'GET') {
    const anilist_id = parseInt(url.searchParams.get('anilist_id'), 10)
    const media_type = url.searchParams.get('media_type') || 'anime'
    const episode_number = url.searchParams.get('episode_number') ? parseInt(url.searchParams.get('episode_number'), 10) : null

    if (!anilist_id) {
      return new Response(JSON.stringify({ error: 'anilist_id required' }), { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    let sql = 'SELECT * FROM comments WHERE anilist_id = ? AND media_type = ? AND parent_id IS NULL'
    const params = [anilist_id, media_type]

    if (episode_number !== null) {
      sql += ' AND episode_number = ?'
      params.push(episode_number)
    }
    sql += ' ORDER BY created_at DESC'

    const topComments = await query(env.DB, sql, params)

    const commentsWithLikesAndReplies = await Promise.all(
      topComments.map(async (comment) => {
        const likeCount = await queryOne(env.DB, 'SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ?', [comment.id])
        const replies = await query(env.DB, 'SELECT * FROM comments WHERE parent_id = ? ORDER BY created_at ASC', [comment.id])
        return { ...comment, likes_count: likeCount?.count || 0, replies: replies || [] }
      }),
    )

    return new Response(JSON.stringify({ data: commentsWithLikesAndReplies }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  if (method === 'POST') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    const { anilist_id, media_type, content, rating, parent_id, episode_number } = await request.json()
    const email = user.email || ''

    const rateLimit = await queryOne(env.DB, 'SELECT last_at FROM comment_rate_limits WHERE user_id = ?', [user.id])
    if (rateLimit) {
      const elapsed = (new Date().getTime() - new Date(rateLimit.last_at + 'Z').getTime()) / 1000
      if (elapsed < 10) {
        return new Response(JSON.stringify({ error: 'rate_limit', code: 'RATE_LIMIT', message: 'Please wait a few seconds before posting again' }), {
          status: 429, headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        })
      }
    }

    const result = await execute(
      env.DB,
      'INSERT INTO comments (user_id, user_email, anilist_id, media_type, content, rating, parent_id, episode_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user.id, email, anilist_id, media_type || 'anime', content, rating || null, parent_id || null, episode_number || null],
    )

    await execute(env.DB, "INSERT INTO comment_rate_limits (user_id, last_at) VALUES (?, datetime('now')) ON CONFLICT(user_id) DO UPDATE SET last_at = datetime('now')", [user.id])

    const inserted = await queryOne(env.DB, 'SELECT * FROM comments WHERE id = ?', [result.meta.last_row_id])

    return new Response(JSON.stringify({ data: inserted }), {
      status: 201, headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
}
