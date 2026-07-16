import { verifyAuth, corsHeaders, handleOptions } from '../../_middleware'
import { query, queryOne, execute } from '../../_db'

export async function onRequest(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight

  const url = new URL(request.url)
  const { method } = request

  if (method === 'GET') {
    const profileId = url.searchParams.get('id')
    const user = await verifyAuth(request, env)
    const targetId = profileId || user?.id

    if (!targetId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }

    const profile = await queryOne(env.DB, 'SELECT * FROM user_profiles WHERE id = ?', [targetId])

    if (user && (!profileId || profileId === user.id)) {
      const achievements = await query(env.DB, 'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?', [user.id])
      return new Response(JSON.stringify({ data: { ...profile, achievements: achievements || [] } }), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ data: profile || null }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  if (method === 'PUT') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }

    const body = await request.json()
    const { display_name, bio, avatar_url, website, xp, achievement_id, preferred_audio, preferred_subtitle_lang } = body

    if (achievement_id) {
      await execute(env.DB, 'INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)', [user.id, achievement_id])
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    if (xp !== undefined && xp !== null) {
      const current = await queryOne(env.DB, 'SELECT xp, level FROM user_profiles WHERE id = ?', [user.id])
      const oldXp = current?.xp ?? 0
      const newXp = Math.max(0, oldXp + xp)
      const newLevel = Math.max(1, Math.floor(Math.sqrt(newXp / 100)))

      await execute(env.DB, "UPDATE user_profiles SET xp = ?, level = ?, xp_updated_at = datetime('now') WHERE id = ?", [
        newXp,
        newLevel,
        user.id,
      ])
      return new Response(JSON.stringify({ data: { xp: newXp, level: newLevel } }), {
        status: 200,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }

    await execute(
      env.DB,
      "INSERT INTO user_profiles (id, display_name, bio, avatar_url, website, preferred_audio, preferred_subtitle_lang) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET display_name = COALESCE(?, display_name), bio = COALESCE(?, bio), avatar_url = COALESCE(?, avatar_url), website = COALESCE(?, website), preferred_audio = COALESCE(?, preferred_audio), preferred_subtitle_lang = COALESCE(?, preferred_subtitle_lang), updated_at = datetime('now')",
      [
        user.id,
        display_name || '',
        bio || '',
        avatar_url || '',
        website || '',
        preferred_audio || 'sub',
        preferred_subtitle_lang || 'es',
        display_name || null,
        bio || null,
        avatar_url || null,
        website || null,
        preferred_audio || null,
        preferred_subtitle_lang || null,
      ],
    )

    const updated = await queryOne(env.DB, 'SELECT * FROM user_profiles WHERE id = ?', [user.id])
    return new Response(JSON.stringify({ data: updated }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
