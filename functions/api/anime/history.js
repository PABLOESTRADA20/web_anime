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
    const items = await query(env.DB, 'SELECT * FROM history WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50', [targetUserId])
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
    const { anilist_id, episode_number, title, image, episode_id, progress, duration } = await request.json()
    const existing = await queryOne(env.DB, 'SELECT id FROM history WHERE user_id = ? AND anilist_id = ? AND episode_number = ?', [
      user.id,
      anilist_id,
      episode_number,
    ])
    if (existing) {
      const updates = { updated_at: new Date().toISOString() }
      if (progress !== undefined) updates.progress = progress
      if (duration !== undefined) updates.duration = duration
      const setClauses = Object.keys(updates)
        .map((k) => `${k} = ?`)
        .join(', ')
      const values = Object.values(updates)
      await execute(env.DB, `UPDATE history SET ${setClauses} WHERE id = ?`, [...values, existing.id])
    } else {
      await execute(
        env.DB,
        'INSERT INTO history (user_id, anilist_id, episode_number, episode_id, title, image, progress, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [user.id, anilist_id, episode_number, episode_id, title ?? null, image ?? null, progress ?? 0, duration ?? 0],
      )
    }
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
