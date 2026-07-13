import { verifyAuth, corsHeaders, handleOptions } from '../../_middleware'
import { query, queryOne, execute } from '../../_db'

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

  const { method } = request

  if (method === 'GET') {
    const items = await query(
      env.DB,
      'SELECT * FROM manga_lists WHERE user_id = ? ORDER BY updated_at DESC',
      [user.id],
    )
    return new Response(JSON.stringify({ data: items }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  if (method === 'POST') {
    const { anilist_id, title, image, status } = await request.json()

    const existing = await queryOne(
      env.DB,
      'SELECT id FROM manga_lists WHERE user_id = ? AND anilist_id = ?',
      [user.id, anilist_id],
    )

    if (existing) {
      await execute(
        env.DB,
        'UPDATE manga_lists SET status = ?, updated_at = datetime(\'now\') WHERE id = ?',
        [status, existing.id],
      )
    } else {
      await execute(
        env.DB,
        'INSERT INTO manga_lists (user_id, anilist_id, title, image, status) VALUES (?, ?, ?, ?, ?)',
        [user.id, anilist_id, title, image ?? null, status],
      )
    }

    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  if (method === 'DELETE') {
    const { anilist_id } = await request.json()
    await execute(
      env.DB,
      'DELETE FROM manga_lists WHERE user_id = ? AND anilist_id = ?',
      [user.id, anilist_id],
    )
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
