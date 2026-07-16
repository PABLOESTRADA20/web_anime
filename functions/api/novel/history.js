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
    const items = await query(env.DB, 'SELECT * FROM novel_history WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50', [targetUserId])
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
    const { novel_slug, chapter_number, chapter_title, novel_title, cover, scroll_percent } = await request.json()
    const existing = await queryOne(
      env.DB,
      'SELECT id, scroll_percent FROM novel_history WHERE user_id = ? AND novel_slug = ? AND chapter_number = ?',
      [user.id, novel_slug, chapter_number],
    )
    if (existing) {
      const newScroll = Math.max(scroll_percent ?? 0, existing.scroll_percent ?? 0)
      await execute(env.DB, "UPDATE novel_history SET updated_at = datetime('now'), scroll_percent = ? WHERE id = ?", [
        newScroll,
        existing.id,
      ])
    } else {
      await execute(
        env.DB,
        'INSERT INTO novel_history (user_id, novel_slug, chapter_number, chapter_title, novel_title, cover, scroll_percent) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user.id, novel_slug, chapter_number, chapter_title ?? '', novel_title ?? '', cover ?? '', scroll_percent ?? 0],
      )
    }
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
