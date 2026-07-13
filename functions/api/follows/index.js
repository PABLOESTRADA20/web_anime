import { verifyAuth, corsHeaders, handleOptions } from '../../_middleware'
import { query, queryOne, execute } from '../../_db'

export async function onRequest(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight

  const url = new URL(request.url)
  const { method } = request

  if (method === 'GET') {
    const targetId = url.searchParams.get('target_id')

    if (targetId) {
      const user = await verifyAuth(request, env)
      const [followerRes, followingRes] = await Promise.all([
        query(env.DB, 'SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?', [targetId]),
        query(env.DB, 'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?', [targetId]),
      ])
      const followerCount = followerRes?.[0]?.count ?? 0
      const followingCount = followingRes?.[0]?.count ?? 0
      let isFollowing = false

      if (user) {
        const follow = await queryOne(env.DB, 'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?', [user.id, targetId])
        isFollowing = !!follow
      }

      return new Response(JSON.stringify({ data: { isFollowing, followerCount, followingCount } }), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }

    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    const rows = await query(env.DB, 'SELECT following_id FROM user_follows WHERE follower_id = ?', [user.id])
    return new Response(JSON.stringify({ data: (rows || []).map((r) => r.following_id) }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  if (method === 'POST') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    const { target_id } = await request.json()
    if (!target_id) {
      return new Response(JSON.stringify({ error: 'target_id required' }), { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    try {
      await execute(env.DB, 'INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)', [user.id, target_id])
    } catch {
      return new Response(JSON.stringify({ error: 'Already following' }), { status: 409, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  if (method === 'DELETE') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    const targetId = url.searchParams.get('target_id')
    if (!targetId) {
      return new Response(JSON.stringify({ error: 'target_id required' }), { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    await execute(env.DB, 'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?', [user.id, targetId])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
}
