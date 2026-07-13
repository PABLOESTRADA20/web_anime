import { verifyAuth, corsHeaders, handleOptions } from '../../_middleware'
import { query, queryOne, execute } from '../../_db'

export async function onRequest(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight

  const url = new URL(request.url)
  const { method } = request

  if (method === 'GET') {
    const anilist_id = url.searchParams.get('anilist_id') ? parseInt(url.searchParams.get('anilist_id'), 10) : null
    const user_id = url.searchParams.get('user_id')
    const media_type = url.searchParams.get('media_type')
    const limit = parseInt(url.searchParams.get('limit'), 10) || 50

    let sql = 'SELECT * FROM reviews'
    const params = []
    const clauses = []

    if (anilist_id) {
      clauses.push('anilist_id = ?')
      params.push(anilist_id)
      if (media_type) {
        clauses.push('media_type = ?')
        params.push(media_type)
      }
    }
    if (user_id) {
      clauses.push('user_id = ?')
      params.push(user_id)
    }

    if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ')
    sql += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit)

    const items = await query(env.DB, sql, params)

    const withVotes = await Promise.all(
      items.map(async (review) => {
        const voteSum = await queryOne(env.DB, 'SELECT COALESCE(SUM(vote), 0) as sum FROM review_votes WHERE review_id = ?', [review.id])
        return { ...review, votes_sum: voteSum?.sum || 0 }
      }),
    )

    return new Response(JSON.stringify({ data: withVotes }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  if (method === 'POST') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    const { anilist_id, media_type, score, content, has_spoilers } = await request.json()
    const email = user.email || ''

    const existing = await queryOne(env.DB, 'SELECT id FROM reviews WHERE user_id = ? AND anilist_id = ?', [user.id, anilist_id])

    if (existing) {
      await execute(env.DB, "UPDATE reviews SET score = ?, content = ?, has_spoilers = ?, user_email = ?, updated_at = datetime('now') WHERE id = ?", [score, content, has_spoilers ? 1 : 0, email, existing.id])
    } else {
      await execute(env.DB, 'INSERT INTO reviews (user_id, user_email, anilist_id, media_type, score, content, has_spoilers) VALUES (?, ?, ?, ?, ?, ?, ?)', [user.id, email, anilist_id, media_type || 'anime', score, content, has_spoilers ? 1 : 0])
    }

    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
}
