import { verifyAuth, corsHeaders, handleOptions } from '../../../../_middleware'
import { query, queryOne, execute } from '../../../../_db'

export async function onRequest(context) {
  const { request, env, params } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight

  const { method } = request
  const collectionId = parseInt(params.id, 10)
  const url = new URL(request.url)

  const collection = await queryOne(env.DB, 'SELECT * FROM collections WHERE id = ?', [collectionId])
  if (!collection) {
    return new Response(JSON.stringify({ error: 'Collection not found' }), { status: 404, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }

  const user = await verifyAuth(request, env)
  if (!collection.is_public && (!user || collection.user_id !== user.id)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }

  if (method === 'GET') {
    const anilist_id = url.searchParams.get('anilist_id') ? parseInt(url.searchParams.get('anilist_id'), 10) : null
    const media_type = url.searchParams.get('media_type')

    if (anilist_id && media_type) {
      const item = await queryOne(env.DB, 'SELECT * FROM collection_items WHERE collection_id = ? AND anilist_id = ? AND media_type = ?', [collectionId, anilist_id, media_type])
      return new Response(JSON.stringify({ data: item || null }), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }

    const rows = await query(env.DB, 'SELECT * FROM collection_items WHERE collection_id = ? ORDER BY added_at DESC', [collectionId])
    return new Response(JSON.stringify({ data: rows || [] }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  if (method === 'POST') {
    if (!user || collection.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    const { anilist_id, media_type, note } = await request.json()
    try {
      const result = await execute(
        env.DB,
        'INSERT INTO collection_items (collection_id, anilist_id, media_type, note) VALUES (?, ?, ?, ?)',
        [collectionId, anilist_id, media_type || 'anime', note || ''],
      )
      const inserted = await queryOne(env.DB, 'SELECT * FROM collection_items WHERE id = ?', [result.meta.last_row_id])
      return new Response(JSON.stringify({ data: inserted }), {
        status: 201, headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    } catch {
      return new Response(JSON.stringify({ error: 'Item already in collection' }), { status: 409, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }
  }

  if (method === 'DELETE') {
    if (!user || collection.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }
    const anilist_id = url.searchParams.get('anilist_id') ? parseInt(url.searchParams.get('anilist_id'), 10) : null
    const media_type = url.searchParams.get('media_type')
    if (anilist_id && media_type) {
      await execute(env.DB, 'DELETE FROM collection_items WHERE collection_id = ? AND anilist_id = ? AND media_type = ?', [collectionId, anilist_id, media_type])
    }
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
}
