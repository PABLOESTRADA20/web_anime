import { verifyAuth, corsHeaders, handleOptions } from '../../_middleware'
import { query, queryOne, execute } from '../../_db'

export async function onRequest(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight

  const { method } = request
  const url = new URL(request.url)

  if (method === 'GET') {
    const user = await verifyAuth(request, env)
    const targetUserId = url.searchParams.get('user_id') || user?.id
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const items = await query(env.DB, 'SELECT * FROM manga_history WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50', [targetUserId])
    return new Response(JSON.stringify({ data: items }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }

  if (method === 'POST') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { anilist_id, chapter_number, chapter_id, title, image, page } = await request.json()
    const existing = await queryOne(env.DB, 'SELECT id FROM manga_history WHERE user_id = ? AND anilist_id = ? AND chapter_number = ?', [
      user.id,
      anilist_id,
      chapter_number,
    ])
    if (existing) {
      await execute(env.DB, "UPDATE manga_history SET updated_at = datetime('now'), page = ? WHERE id = ?", [page ?? 1, existing.id])
    } else {
      await execute(
        env.DB,
        'INSERT INTO manga_history (user_id, anilist_id, chapter_number, chapter_id, title, image, page) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user.id, anilist_id, chapter_number, chapter_id, title ?? null, image ?? null, page ?? 1],
      )
    }
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
