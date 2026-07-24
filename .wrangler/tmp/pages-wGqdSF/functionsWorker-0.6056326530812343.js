var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, 'name', { value, configurable: true })

// _middleware.js
async function verifyAuth(request, env) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  if (!token) return null
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5e3)
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apiKey: env.SUPABASE_ANON_KEY,
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    const user = await res.json()
    return { id: user.id, email: user.email }
  } catch {
    return null
  }
}
__name(verifyAuth, 'verifyAuth')
function corsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
__name(corsHeaders, 'corsHeaders')
async function handleOptions(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders(),
    })
  }
  return null
}
__name(handleOptions, 'handleOptions')

// _db.js
async function query(db, sql, params = []) {
  const { results } = await db
    .prepare(sql)
    .bind(...params)
    .all()
  return results
}
__name(query, 'query')
async function queryOne(db, sql, params = []) {
  return await db
    .prepare(sql)
    .bind(...params)
    .first()
}
__name(queryOne, 'queryOne')
async function execute(db, sql, params = []) {
  return await db
    .prepare(sql)
    .bind(...params)
    .run()
}
__name(execute, 'execute')

// api/collections/[id]/items/[itemId].js
async function onRequest(context) {
  const { request, env, params } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight
  const user = await verifyAuth(request, env)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  const itemId = parseInt(params.itemId, 10)
  if (request.method === 'DELETE') {
    await execute(env.DB, 'DELETE FROM collection_items WHERE id = ?', [itemId])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (request.method === 'PATCH') {
    const { note } = await request.json()
    await execute(env.DB, 'UPDATE collection_items SET note = ? WHERE id = ?', [note || '', itemId])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest, 'onRequest')

// api/collections/[id]/items/index.js
async function onRequest2(context) {
  const { request, env, params } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight
  const { method } = request
  const collectionId = parseInt(params.id, 10)
  const url = new URL(request.url)
  const collection = await queryOne(env.DB, 'SELECT * FROM collections WHERE id = ?', [collectionId])
  if (!collection) {
    return new Response(JSON.stringify({ error: 'Collection not found' }), {
      status: 404,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  const user = await verifyAuth(request, env)
  if (!collection.is_public && (!user || collection.user_id !== user.id)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  if (method === 'GET') {
    const anilist_id = url.searchParams.get('anilist_id') ? parseInt(url.searchParams.get('anilist_id'), 10) : null
    const media_type = url.searchParams.get('media_type')
    if (anilist_id && media_type) {
      const item = await queryOne(env.DB, 'SELECT * FROM collection_items WHERE collection_id = ? AND anilist_id = ? AND media_type = ?', [
        collectionId,
        anilist_id,
        media_type,
      ])
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
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
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
        status: 201,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    } catch {
      return new Response(JSON.stringify({ error: 'Item already in collection' }), {
        status: 409,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
  }
  if (method === 'DELETE') {
    if (!user || collection.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const anilist_id = url.searchParams.get('anilist_id') ? parseInt(url.searchParams.get('anilist_id'), 10) : null
    const media_type = url.searchParams.get('media_type')
    if (anilist_id && media_type) {
      await execute(env.DB, 'DELETE FROM collection_items WHERE collection_id = ? AND anilist_id = ? AND media_type = ?', [
        collectionId,
        anilist_id,
        media_type,
      ])
    }
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest2, 'onRequest')

// api/comments/[id]/likes.js
async function onRequest3(context) {
  const { request, env, params } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight
  const user = await verifyAuth(request, env)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  if (request.method === 'POST') {
    const commentId = parseInt(params.id, 10)
    const existing = await queryOne(env.DB, 'SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?', [commentId, user.id])
    if (existing) {
      await execute(env.DB, 'DELETE FROM comment_likes WHERE id = ?', [existing.id])
    } else {
      await execute(env.DB, 'INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)', [user.id, commentId])
    }
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest3, 'onRequest')

// api/reviews/[id]/votes.js
async function onRequest4(context) {
  const { request, env, params } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight
  const user = await verifyAuth(request, env)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  if (request.method === 'POST') {
    const reviewId = parseInt(params.id, 10)
    const { vote } = await request.json()
    const existing = await queryOne(env.DB, 'SELECT id, vote FROM review_votes WHERE review_id = ? AND user_id = ?', [reviewId, user.id])
    if (existing) {
      if (existing.vote === vote) {
        await execute(env.DB, 'DELETE FROM review_votes WHERE id = ?', [existing.id])
      } else {
        await execute(env.DB, 'UPDATE review_votes SET vote = ? WHERE id = ?', [vote, existing.id])
      }
    } else {
      await execute(env.DB, 'INSERT INTO review_votes (user_id, review_id, vote) VALUES (?, ?, ?)', [user.id, reviewId, vote])
    }
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest4, 'onRequest')

// api/admin/bootstrap.js
async function onRequest5(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  const user = await verifyAuth(request, env)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  const existing = await queryOne(env.DB, 'SELECT id FROM admin_users WHERE user_id = ?', [user.id])
  if (existing) {
    return new Response(JSON.stringify({ data: { is_admin: true } }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }
  await execute(env.DB, 'INSERT INTO admin_users (user_id) VALUES (?)', [user.id])
  return new Response(JSON.stringify({ data: { is_admin: true } }), {
    status: 201,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest5, 'onRequest')

// api/admin/check.js
async function onRequest6(context) {
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
  const row = await queryOne(env.DB, 'SELECT id FROM admin_users WHERE user_id = ?', [user.id])
  return new Response(JSON.stringify({ data: { is_admin: !!row } }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
}
__name(onRequest6, 'onRequest')

// api/admin/moderation.js
var ALLOWED_TABLES = ['community_episodes', 'community_manga_chapters', 'community_novel_chapters']
async function onRequest7(context) {
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
  const admin = await queryOne(env.DB, 'SELECT id FROM admin_users WHERE user_id = ?', [user.id])
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  const url = new URL(request.url)
  const table = url.searchParams.get('table')
  if (!table || !ALLOWED_TABLES.includes(table)) {
    return new Response(JSON.stringify({ error: 'Invalid table' }), {
      status: 400,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  const { method } = request
  if (method === 'GET') {
    const items = await query(env.DB, `SELECT * FROM ${table} ORDER BY created_at DESC`, [])
    return new Response(JSON.stringify({ data: items }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }
  if (method === 'PATCH') {
    const { id, status } = await request.json()
    await execute(env.DB, `UPDATE ${table} SET status = ? WHERE id = ?`, [status, id])
    const item = await queryOne(env.DB, `SELECT * FROM ${table} WHERE id = ?`, [id])
    return new Response(JSON.stringify({ data: item }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }
  if (method === 'DELETE') {
    const { id } = await request.json()
    await execute(env.DB, `DELETE FROM ${table} WHERE id = ?`, [id])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest7, 'onRequest')

// api/anime/favorites.js
async function onRequest8(context) {
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
    const items = await query(env.DB, 'SELECT * FROM anime_favorites WHERE user_id = ? ORDER BY created_at DESC', [targetUserId])
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
    const { anilist_id, title, image } = await request.json()
    await execute(env.DB, 'INSERT OR IGNORE INTO anime_favorites (user_id, anilist_id, title, image) VALUES (?, ?, ?, ?)', [
      user.id,
      anilist_id,
      title,
      image ?? null,
    ])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (method === 'DELETE') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { anilist_id } = await request.json()
    await execute(env.DB, 'DELETE FROM anime_favorites WHERE user_id = ? AND anilist_id = ?', [user.id, anilist_id])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest8, 'onRequest')

// api/anime/history.js
async function onRequest9(context) {
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
      const updates = { updated_at: /* @__PURE__ */ new Date().toISOString() }
      if (progress !== void 0) updates.progress = progress
      if (duration !== void 0) updates.duration = duration
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
__name(onRequest9, 'onRequest')

// api/anime/lists.js
async function onRequest10(context) {
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
    const items = await query(env.DB, 'SELECT * FROM anime_lists WHERE user_id = ? ORDER BY updated_at DESC', [targetUserId])
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
    const { anilist_id, title, image, status } = await request.json()
    const existing = await queryOne(env.DB, 'SELECT id FROM anime_lists WHERE user_id = ? AND anilist_id = ?', [user.id, anilist_id])
    if (existing) {
      await execute(env.DB, "UPDATE anime_lists SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, existing.id])
    } else {
      await execute(env.DB, 'INSERT INTO anime_lists (user_id, anilist_id, title, image, status) VALUES (?, ?, ?, ?, ?)', [
        user.id,
        anilist_id,
        title,
        image ?? null,
        status,
      ])
    }
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (method === 'PATCH') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { anilist_id, status } = await request.json()
    await execute(env.DB, "UPDATE anime_lists SET status = ?, updated_at = datetime('now') WHERE user_id = ? AND anilist_id = ?", [
      status,
      user.id,
      anilist_id,
    ])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (method === 'DELETE') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { anilist_id } = await request.json()
    await execute(env.DB, 'DELETE FROM anime_lists WHERE user_id = ? AND anilist_id = ?', [user.id, anilist_id])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest10, 'onRequest')

// api/anime/ratings.js
async function onRequest11(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight
  const url = new URL(request.url)
  const { method } = request
  if (method === 'GET') {
    const user = await verifyAuth(request, env)
    const anilistId = url.searchParams.get('anilist_id')
    const targetUserId = url.searchParams.get('user_id')
    if (targetUserId) {
      const items = await query(env.DB, 'SELECT anilist_id, rating FROM anime_ratings WHERE user_id = ?', [targetUserId])
      return new Response(JSON.stringify({ data: items }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    if (!anilistId) {
      const items = await query(env.DB, 'SELECT anilist_id, rating FROM anime_ratings WHERE user_id = ?', [user.id])
      return new Response(JSON.stringify({ data: items }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }
    const row = await queryOne(env.DB, 'SELECT rating FROM anime_ratings WHERE user_id = ? AND anilist_id = ?', [
      user.id,
      parseInt(anilistId, 10),
    ])
    return new Response(JSON.stringify({ data: row ? { rating: row.rating } : null }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  if (method === 'POST') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { anilist_id, rating } = await request.json()
    await execute(
      env.DB,
      "INSERT INTO anime_ratings (user_id, anilist_id, rating, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(user_id, anilist_id) DO UPDATE SET rating = ?, updated_at = datetime('now')",
      [user.id, anilist_id, rating, rating],
    )
    return new Response(JSON.stringify({ data: { rating } }), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  if (method === 'DELETE') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { anilist_id } = await request.json()
    await execute(env.DB, 'DELETE FROM anime_ratings WHERE user_id = ? AND anilist_id = ?', [user.id, anilist_id])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest11, 'onRequest')

// api/anime/watchlist.js
async function onRequest12(context) {
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
    const items = await query(env.DB, 'SELECT * FROM watchlist WHERE user_id = ? ORDER BY created_at DESC', [targetUserId])
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
    const { anilist_id, title, image } = await request.json()
    await execute(env.DB, 'INSERT OR IGNORE INTO watchlist (user_id, anilist_id, title, image) VALUES (?, ?, ?, ?)', [
      user.id,
      anilist_id,
      title,
      image ?? null,
    ])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (method === 'DELETE') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { anilist_id } = await request.json()
    await execute(env.DB, 'DELETE FROM watchlist WHERE user_id = ? AND anilist_id = ?', [user.id, anilist_id])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest12, 'onRequest')

// api/manga/favorites.js
async function onRequest13(context) {
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
    const items = await query(env.DB, 'SELECT * FROM manga_favorites WHERE user_id = ? ORDER BY created_at DESC', [targetUserId])
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
    const { anilist_id, title, image } = await request.json()
    await execute(env.DB, 'INSERT OR IGNORE INTO manga_favorites (user_id, anilist_id, title, image) VALUES (?, ?, ?, ?)', [
      user.id,
      anilist_id,
      title,
      image ?? null,
    ])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (method === 'DELETE') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { anilist_id } = await request.json()
    await execute(env.DB, 'DELETE FROM manga_favorites WHERE user_id = ? AND anilist_id = ?', [user.id, anilist_id])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest13, 'onRequest')

// api/manga/history.js
async function onRequest14(context) {
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
__name(onRequest14, 'onRequest')

// api/manga/lists.js
async function onRequest15(context) {
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
    const items = await query(env.DB, 'SELECT * FROM manga_lists WHERE user_id = ? ORDER BY updated_at DESC', [user.id])
    return new Response(JSON.stringify({ data: items }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  if (method === 'POST') {
    const { anilist_id, title, image, status } = await request.json()
    const existing = await queryOne(env.DB, 'SELECT id FROM manga_lists WHERE user_id = ? AND anilist_id = ?', [user.id, anilist_id])
    if (existing) {
      await execute(env.DB, "UPDATE manga_lists SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, existing.id])
    } else {
      await execute(env.DB, 'INSERT INTO manga_lists (user_id, anilist_id, title, image, status) VALUES (?, ?, ?, ?, ?)', [
        user.id,
        anilist_id,
        title,
        image ?? null,
        status,
      ])
    }
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (method === 'DELETE') {
    const { anilist_id } = await request.json()
    await execute(env.DB, 'DELETE FROM manga_lists WHERE user_id = ? AND anilist_id = ?', [user.id, anilist_id])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest15, 'onRequest')

// api/novel/favorites.js
async function onRequest16(context) {
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
    const items = await query(env.DB, 'SELECT * FROM novel_favorites WHERE user_id = ? ORDER BY created_at DESC', [targetUserId])
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
    const { novel_slug, title, cover } = await request.json()
    await execute(env.DB, 'INSERT OR IGNORE INTO novel_favorites (user_id, novel_slug, title, cover) VALUES (?, ?, ?, ?)', [
      user.id,
      novel_slug,
      title ?? '',
      cover ?? '',
    ])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (method === 'DELETE') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { novel_slug } = await request.json()
    await execute(env.DB, 'DELETE FROM novel_favorites WHERE user_id = ? AND novel_slug = ?', [user.id, novel_slug])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest16, 'onRequest')

// api/novel/history.js
async function onRequest17(context) {
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
__name(onRequest17, 'onRequest')

// api/novel/lists.js
async function onRequest18(context) {
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
    const items = await query(env.DB, 'SELECT * FROM novel_lists WHERE user_id = ? ORDER BY updated_at DESC', [user.id])
    return new Response(JSON.stringify({ data: items }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
  }
  if (method === 'POST') {
    const { novel_slug, title, cover, status } = await request.json()
    const existing = await queryOne(env.DB, 'SELECT id FROM novel_lists WHERE user_id = ? AND novel_slug = ?', [user.id, novel_slug])
    if (existing) {
      await execute(env.DB, "UPDATE novel_lists SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, existing.id])
    } else {
      await execute(env.DB, 'INSERT INTO novel_lists (user_id, novel_slug, title, cover, status) VALUES (?, ?, ?, ?, ?)', [
        user.id,
        novel_slug,
        title ?? '',
        cover ?? '',
        status,
      ])
    }
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (method === 'DELETE') {
    const { novel_slug } = await request.json()
    await execute(env.DB, 'DELETE FROM novel_lists WHERE user_id = ? AND novel_slug = ?', [user.id, novel_slug])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest18, 'onRequest')

// api/novel/ratings.js
async function onRequest19(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight
  const url = new URL(request.url)
  const { method } = request
  if (method === 'GET') {
    const user = await verifyAuth(request, env)
    const slug = url.searchParams.get('novel_slug')
    const targetUserId = url.searchParams.get('user_id')
    if (targetUserId) {
      const items = await query(env.DB, 'SELECT novel_slug, rating FROM novel_ratings WHERE user_id = ?', [targetUserId])
      return new Response(JSON.stringify({ data: items }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    if (!slug) {
      const items = await query(env.DB, 'SELECT novel_slug, rating FROM novel_ratings WHERE user_id = ?', [user.id])
      return new Response(JSON.stringify({ data: items }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }
    const row = await queryOne(env.DB, 'SELECT rating FROM novel_ratings WHERE user_id = ? AND novel_slug = ?', [user.id, slug])
    return new Response(JSON.stringify({ data: row ? { rating: row.rating } : null }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  if (method === 'POST') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { novel_slug, rating } = await request.json()
    await execute(
      env.DB,
      "INSERT INTO novel_ratings (user_id, novel_slug, rating, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(user_id, novel_slug) DO UPDATE SET rating = ?, updated_at = datetime('now')",
      [user.id, novel_slug, rating, rating],
    )
    return new Response(JSON.stringify({ data: { rating } }), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  if (method === 'DELETE') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { novel_slug } = await request.json()
    await execute(env.DB, 'DELETE FROM novel_ratings WHERE user_id = ? AND novel_slug = ?', [user.id, novel_slug])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest19, 'onRequest')

// api/collections/[id]/index.js
async function onRequest20(context) {
  const { request, env, params } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight
  const { method } = request
  const collectionId = parseInt(params.id, 10)
  const user = await verifyAuth(request, env)
  const collection = await queryOne(env.DB, 'SELECT * FROM collections WHERE id = ?', [collectionId])
  if (!collection) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  if (method === 'GET') {
    if (!collection.is_public && (!user || collection.user_id !== user.id)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ data: collection }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  if (!user || collection.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  if (method === 'PUT') {
    const { name, description, is_public } = await request.json()
    await execute(
      env.DB,
      "UPDATE collections SET name = COALESCE(?, name), description = COALESCE(?, description), is_public = COALESCE(?, is_public), updated_at = datetime('now') WHERE id = ?",
      [name || null, description !== void 0 ? description : null, is_public !== void 0 ? (is_public ? 1 : 0) : null, collectionId],
    )
    const updated = await queryOne(env.DB, 'SELECT * FROM collections WHERE id = ?', [collectionId])
    return new Response(JSON.stringify({ data: updated }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  if (method === 'DELETE') {
    await execute(env.DB, 'DELETE FROM collections WHERE id = ?', [collectionId])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest20, 'onRequest')

// api/comments/[id]/index.js
async function onRequest21(context) {
  const { request, env, params } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight
  const user = await verifyAuth(request, env)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  if (request.method === 'DELETE') {
    await execute(env.DB, 'DELETE FROM comments WHERE id = ? AND user_id = ?', [parseInt(params.id, 10), user.id])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest21, 'onRequest')

// api/reviews/[id]/index.js
async function onRequest22(context) {
  const { request, env, params } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight
  const user = await verifyAuth(request, env)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  if (request.method === 'DELETE') {
    await execute(env.DB, 'DELETE FROM reviews WHERE id = ? AND user_id = ?', [parseInt(params.id, 10), user.id])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest22, 'onRequest')

// api/ai-recommend.js
var VALID_LANGS = { es: 'Espa\xF1ol', en: 'English', pt: 'Portugu\xEAs' }
async function onRequest23(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }
  const url = new URL(request.url)
  const genres = url.searchParams.get('genres') || ''
  const count = Math.min(parseInt(url.searchParams.get('count') || '6', 10), 12)
  const lang = url.searchParams.get('lang') || 'es'
  const langName = VALID_LANGS[lang] || VALID_LANGS.es
  if (!genres.trim()) {
    return new Response(JSON.stringify({ error: 'Missing genres parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
  const ai = env.AI || env['AI '] || env['AI\xA0']
  if (!ai) {
    return new Response(JSON.stringify({ recommendations: [], note: 'AI binding not available' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
  try {
    const prompt = `You are an anime recommendation expert. The user enjoys these genres: ${genres}.
Generate ${count} distinct anime recommendations they would likely enjoy.
For each, provide: title (real existing anime), genres (array of 2-4 genre strings), score (0-10), and a reason in ${langName} (1 sentence why this user would like it based on the genres).

Respond ONLY with a valid JSON array. No markdown, no code fences, no extra text.
Format: [{"title": "Anime Name", "genres": ["Action", "Fantasy"], "score": 9, "reason": "..."}]
Ensure titles are real, popular anime that match the given genres.`
    const result = await ai.run('@cf/meta/llama-3.2-3b-instruct', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2e3,
      temperature: 0.7,
    })
    if (result == null) {
      return new Response(JSON.stringify({ error: 'Workers AI not available on this account', recommendations: [] }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
    let text = ''
    if (typeof result === 'string') {
      text = result
    } else if (result?.response) {
      text = result.response
    } else if (result?.choices?.[0]?.message?.content) {
      text = result.choices[0].message.content
    } else {
      text = JSON.stringify(result)
    }
    if (typeof text !== 'string') text = String(text)
    text = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()
    let recommendations
    try {
      recommendations = JSON.parse(text)
      if (!Array.isArray(recommendations)) throw new Error('Not an array')
      recommendations = recommendations.slice(0, count)
    } catch {
      const match2 = text.match(/\[[\s\S]*\]/)
      if (match2) {
        try {
          recommendations = JSON.parse(match2[0])
          if (!Array.isArray(recommendations)) throw new Error('Not an array')
          recommendations = recommendations.slice(0, count)
        } catch {
          recommendations = []
        }
      } else {
        recommendations = []
      }
    }
    return new Response(JSON.stringify({ recommendations, genres }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, recommendations: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
__name(onRequest23, 'onRequest')

// api/ai-test.js
async function onRequest24(context) {
  const { env } = context
  const aiKey = Object.keys(env).find((k) => k.trim() === 'AI' || k.startsWith('AI'))
  const ai = aiKey ? env[aiKey] : null
  return new Response(
    JSON.stringify(
      {
        bindingFound: !!ai,
        bindingName: aiKey,
        envKeys: Object.keys(env).filter((k) => k.startsWith('AI') || k.includes('AI')),
        message: ai ? 'AI binding OK - ready to translate' : 'No AI binding found',
      },
      null,
      2,
    ),
    {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
    },
  )
}
__name(onRequest24, 'onRequest')

// api/check-site.js
async function onRequest25(context) {
  const url = new URL(context.request.url)
  const target = url.searchParams.get('url') || ''
  try {
    const res = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(2e4),
      redirect: 'follow',
    })
    const text = await res.text()
    const scripts = []
    const re = /<script[^>]*>([\s\S]*?)<\/script>/gi
    let m
    while ((m = re.exec(text)) !== null) {
      const c = m[1].trim()
      if (c.length > 20) scripts.push({ len: c.length, htmlPos: m.index, content: c })
    }
    const evalScript = scripts.find((s) => s.content.includes('eval(') || s.content.includes('newImgs'))
    const varsScript = scripts.find((s) => s.content.includes('comicid'))
    return new Response(
      JSON.stringify({
        status: res.status,
        size: text.length,
        totalScripts: scripts.length,
        evalScript: evalScript
          ? {
              len: evalScript.len,
              htmlPos: evalScript.htmlPos,
              content: evalScript.content.slice(0, 5e3),
            }
          : null,
        varsScript: varsScript ? varsScript.content.slice(0, 1e3) : null,
        // Also send all scripts for analysis (first 1000 chars each)
        allScripts: scripts.map((s) => ({
          len: s.len,
          pos: s.htmlPos,
          preview: s.content.slice(0, 200),
        })),
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
__name(onRequest25, 'onRequest')

// api/collections/index.js
async function onRequest26(context) {
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
    const rows = await query(env.DB, 'SELECT * FROM collections WHERE user_id = ? ORDER BY updated_at DESC', [user.id])
    return new Response(JSON.stringify({ data: rows || [] }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  if (method === 'POST') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { name, description, is_public } = await request.json()
    if (!name) {
      return new Response(JSON.stringify({ error: 'Name required' }), {
        status: 400,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const result = await execute(env.DB, 'INSERT INTO collections (user_id, name, description, is_public) VALUES (?, ?, ?, ?)', [
      user.id,
      name,
      description || '',
      is_public !== void 0 ? (is_public ? 1 : 0) : 1,
    ])
    const inserted = await query(env.DB, 'SELECT * FROM collections WHERE id = ?', [result.meta.last_row_id])
    return new Response(JSON.stringify({ data: inserted?.[0] }), {
      status: 201,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest26, 'onRequest')

// api/comments/index.js
async function onRequest27(context) {
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
      return new Response(JSON.stringify({ error: 'anilist_id required' }), {
        status: 400,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { anilist_id, media_type, content, rating, parent_id, episode_number } = await request.json()
    const email = user.email || ''
    const rateLimit = await queryOne(env.DB, 'SELECT last_at FROM comment_rate_limits WHERE user_id = ?', [user.id])
    if (rateLimit) {
      const elapsed = (/* @__PURE__ */ new Date().getTime() - /* @__PURE__ */ new Date(rateLimit.last_at + 'Z').getTime()) / 1e3
      if (elapsed < 10) {
        return new Response(
          JSON.stringify({ error: 'rate_limit', code: 'RATE_LIMIT', message: 'Please wait a few seconds before posting again' }),
          {
            status: 429,
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
          },
        )
      }
    }
    const result = await execute(
      env.DB,
      'INSERT INTO comments (user_id, user_email, anilist_id, media_type, content, rating, parent_id, episode_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user.id, email, anilist_id, media_type || 'anime', content, rating || null, parent_id || null, episode_number || null],
    )
    await execute(
      env.DB,
      "INSERT INTO comment_rate_limits (user_id, last_at) VALUES (?, datetime('now')) ON CONFLICT(user_id) DO UPDATE SET last_at = datetime('now')",
      [user.id],
    )
    const inserted = await queryOne(env.DB, 'SELECT * FROM comments WHERE id = ?', [result.meta.last_row_id])
    return new Response(JSON.stringify({ data: inserted }), {
      status: 201,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest27, 'onRequest')

// api/follows/index.js
async function onRequest28(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight
  const url = new URL(request.url)
  const { method } = request
  if (method === 'GET') {
    const targetId = url.searchParams.get('target_id')
    if (targetId) {
      const user2 = await verifyAuth(request, env)
      const [followerRes, followingRes] = await Promise.all([
        query(env.DB, 'SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?', [targetId]),
        query(env.DB, 'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?', [targetId]),
      ])
      const followerCount = followerRes?.[0]?.count ?? 0
      const followingCount = followingRes?.[0]?.count ?? 0
      let isFollowing = false
      if (user2) {
        const follow = await queryOne(env.DB, 'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?', [
          user2.id,
          targetId,
        ])
        isFollowing = !!follow
      }
      return new Response(JSON.stringify({ data: { isFollowing, followerCount, followingCount } }), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const rows = await query(env.DB, 'SELECT following_id FROM user_follows WHERE follower_id = ?', [user.id])
    return new Response(JSON.stringify({ data: (rows || []).map((r) => r.following_id) }), {
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    })
  }
  if (method === 'POST') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { target_id } = await request.json()
    if (!target_id) {
      return new Response(JSON.stringify({ error: 'target_id required' }), {
        status: 400,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    try {
      await execute(env.DB, 'INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)', [user.id, target_id])
    } catch {
      return new Response(JSON.stringify({ error: 'Already following' }), {
        status: 409,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (method === 'DELETE') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const targetId = url.searchParams.get('target_id')
    if (!targetId) {
      return new Response(JSON.stringify({ error: 'target_id required' }), {
        status: 400,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    await execute(env.DB, 'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?', [user.id, targetId])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest28, 'onRequest')

// _utils/rate-limit.js
var rateMap = /* @__PURE__ */ new Map()
function checkRateLimit(request, opts = {}) {
  const { maxRequests = 30, windowMs = 6e4 } = opts
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || now - entry.windowStart > windowMs) {
    rateMap.set(ip, { count: 1, windowStart: now })
    return { allowed: true, remaining: maxRequests - 1 }
  }
  entry.count++
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.windowStart + windowMs - now) / 1e3) }
  }
  if (rateMap.size > 100) {
    for (const [ip2, entry2] of rateMap) {
      if (now - entry2.windowStart > 12e4) rateMap.delete(ip2)
    }
  }
  return { allowed: true, remaining: maxRequests - entry.count }
}
__name(checkRateLimit, 'checkRateLimit')

// api/mangadex.js
async function onRequest29(context) {
  const { request } = context
  const rateCheck = checkRateLimit(request, { maxRequests: 30, windowMs: 6e4 })
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Retry-After': String(rateCheck.retryAfter),
      },
    })
  }
  const url = new URL(request.url)
  const path = url.searchParams.get('path') || ''
  const params = new URLSearchParams(url.search)
  params.delete('path')
  const cleanSearch = params.toString() ? '?' + params.toString() : ''
  const targetUrl = `https://api.mangadex.org${path}${cleanSearch}`
  const cacheKey = new Request(targetUrl, request)
  const cache = caches.default
  const cached = await cache.match(cacheKey)
  if (cached) {
    const response = new Response(cached.body, cached)
    response.headers.set('X-Cache', 'HIT')
    return response
  }
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'AnimeVerse/1.0 (https://anime-app-e8p.pages.dev)',
        Accept: 'application/json',
      },
    })
    const response = new Response(res.body, res)
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.set('X-Cache', 'MISS')
    if (request.method === 'GET' && res.status === 200) {
      const cacheResponse = new Response(response.clone().body, {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers),
          'Cache-Control': 'public, max-age=300',
        },
      })
      context.waitUntil(cache.put(cacheKey, cacheResponse))
    }
    return response
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
__name(onRequest29, 'onRequest')

// api/notification-preferences.js
var DEFAULTS = {
  new_episode: 1,
  new_review: 1,
  comment_reply: 1,
  review_vote: 1,
  weekly_digest: 0,
}
async function onRequest30(context) {
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
__name(onRequest30, 'onRequest')

// _utils/novel-providers/novelbin.js
var NOVELBIN_HOST = (typeof process !== 'undefined' && process.env.NOVEL_NOVELBIN_HOST) || 'https://novelbin.me'
var HOST_ESCAPED = NOVELBIN_HOST.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')
async function fetchPage(url, timeoutMs = 1e4) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })
    if (!res.ok) {
      throw new Error(`NovelBin respondi\xF3 con ${res.status}${res.status === 522 ? ' (el sitio est\xE1 ca\xEDdo)' : ''}`)
    }
    return await res.text()
  } finally {
    clearTimeout(timeout)
  }
}
__name(fetchPage, 'fetchPage')
var novelbinProvider = {
  async search({ q }) {
    const html = await fetchPage(`${NOVELBIN_HOST}/ajax/search-novel?keyword=${encodeURIComponent(q)}`)
    const results = []
    const regex = new RegExp(`<a[^>]*href="(${HOST_ESCAPED}\\/b\\/([^"]+))"[^>]*title="([^"]*)"[^>]*>`, 'gi')
    let match2
    while ((match2 = regex.exec(html)) !== null) {
      results.push({ slug: match2[2], title: match2[3].trim(), url: match2[1] })
    }
    return results
  },
  async info({ slug }) {
    const html = await fetchPage(`${NOVELBIN_HOST}/b/${slug}`)
    const cover = html.match(/<div class="book">[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>/i)
    const title = html.match(/<h3 class="title">([\s\S]*?)<\/h3>/i)
    const desc = html.match(
      /<div class="desc-text[^"]*"[^>]*id="novel-description-content"[^>]*>([\s\S]*?)<\/div>\s*<button[^>]*class="btn-desc-toggle/i,
    )
    const infoMeta = html.match(/<ul class="info info-meta">([\s\S]*?)<\/ul>/i)
    const infoHtml = infoMeta ? infoMeta[1] : ''
    const genres = [...infoHtml.matchAll(new RegExp(`<a[^>]*href="${HOST_ESCAPED}\\/genre\\/([^"]+)"[^>]*>([^<]+)<\\/a>`, 'gi'))].map((g) =>
      g[2].trim(),
    )
    const authorMatch = infoHtml.match(/<h3>Author:<\/h3>\s*<a[^>]*>([\s\S]*?)<\/a>/i)
    const statusMatch = infoHtml.match(/<h3>Status:<\/h3>\s*<a[^>]*>([\s\S]*?)<\/a>/i)
    return {
      slug,
      title: title ? title[1].replace(/<[^>]+>/g, '').trim() : slug,
      cover: cover ? cover[1] : null,
      description: desc
        ? desc[1]
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .trim()
        : '',
      author: authorMatch ? authorMatch[1].trim() : '',
      status: statusMatch ? statusMatch[1].trim() : 'Unknown',
      genres,
    }
  },
  async chapters({ slug }) {
    const html = await fetchPage(`${NOVELBIN_HOST}/ajax/chapter-archive?novelId=${slug}`)
    const escapedSlug = slug.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')
    const chapters = []
    const regex = new RegExp(
      `<a[^>]*href="${HOST_ESCAPED}\\/b\\/${escapedSlug}\\/chapter-(\\d+)"[^>]*title="([^"]*)"[^>]*>[\\s\\S]*?<span[^>]*class="nchr-text[^"]*"[^>]*>([\\s\\S]*?)<\\/span>`,
      'gi',
    )
    let match2
    while ((match2 = regex.exec(html)) !== null) {
      chapters.push({ number: parseInt(match2[1], 10), title: match2[3].trim(), path: `${slug}/chapter-${match2[1]}` })
    }
    return chapters.sort((a, b) => a.number - b.number)
  },
  async chapterContent({ path }) {
    const html = await fetchPage(`${NOVELBIN_HOST}/b/${path}`)
    const title = html.match(/<h1[^>]*class="chr-title"[^>]*>([\s\S]*?)<\/h1>/i)
    const titleText = title ? title[1].replace(/<[^>]+>/g, '').trim() : ''
    const contentDiv = html.match(/<div[^>]*id="chr-content"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<\/body>)/i)
    let content = ''
    if (contentDiv) {
      content = contentDiv[1]
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<div[^>]*class="[^"]*js-ad-slot[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<ins[\s\S]*?<\/ins>/gi, '')
        .trim()
    }
    return { title: titleText, content }
  },
}

// _utils/novel-providers/readnovelfull.js
var HOST = (typeof process !== 'undefined' && process.env.NOVEL_READNOVELFULL_HOST) || 'https://readnovelfull.com'
async function fetchPage2(url, extraHeaders = {}, timeoutMs = 1e4) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        ...extraHeaders,
      },
    })
    if (!res.ok) throw new Error(`ReadNovelFull respondi\xF3 con ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timeout)
  }
}
__name(fetchPage2, 'fetchPage')
var readnovelfullProvider = {
  async search({ q }) {
    const html = await fetchPage2(`${HOST}/ajax/search-novel?keyword=${encodeURIComponent(q)}`, {
      'X-Requested-With': 'XMLHttpRequest',
    })
    const results = []
    const seen = /* @__PURE__ */ new Set()
    const items = [...html.matchAll(/<a[^>]*href="\/([a-z0-9-]+\.html)"[^>]*>([^<]+)<\/a>/gi)]
    for (const [, href, title] of items) {
      if (href.includes('search')) continue
      const slug = href.replace(/\.html$/, '')
      if (seen.has(slug)) continue
      seen.add(slug)
      results.push({ slug, title: title.trim(), url: `${HOST}/${href}` })
    }
    return results
  },
  async info({ slug }) {
    const html = await fetchPage2(`${HOST}/${slug}.html`)
    const cover = html.match(/<div class="book">[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>/i)
    const title = html.match(/<h3 class="title">([\s\S]*?)<\/h3>/i)
    const desc = html.match(/<div[^>]*class="desc-text[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    const authorMatch = html.match(/<h3>Author:<\/h3>([\s\S]*?)<\/li>/i)
    const statusMatch = html.match(/<h3>Status:<\/h3>([\s\S]*?)<\/li>/i)
    const genres = []
    const infoMeta = html.match(/<ul class="info info-meta">([\s\S]*?)<\/ul>/i)
    if (infoMeta) {
      const genreLinks = [...infoMeta[1].matchAll(/<a[^>]*href="\/genres\/([^"]+)"[^>]*>([^<]+)<\/a>/gi)]
      for (const [, , name] of genreLinks) {
        genres.push(name.trim())
      }
    }
    const author = authorMatch
      ? authorMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/,\s*/g, ', ')
          .trim()
      : ''
    const status = statusMatch ? statusMatch[1].replace(/<[^>]+>/g, '').trim() : 'Unknown'
    return {
      slug,
      title: title ? title[1].replace(/<[^>]+>/g, '').trim() : slug,
      cover: cover ? cover[1] : null,
      description: desc
        ? desc[1]
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .trim()
        : '',
      author,
      status,
      genres,
    }
  },
  async chapters({ slug }) {
    const html = await fetchPage2(`${HOST}/${slug}.html`)
    const idMatch = html.match(/data-novel-id="(\d+)"/i)
    if (!idMatch) throw new Error('No se pudo obtener el ID de la novela')
    const novelId = idMatch[1]
    const archHtml = await fetchPage2(`${HOST}/ajax/chapter-archive?novelId=${novelId}`, {
      'X-Requested-With': 'XMLHttpRequest',
      Accept: '*/*',
    })
    const chapters = []
    const links = [...archHtml.matchAll(/<a[^>]*href="(\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    links.forEach(([, href, titleHtml]) => {
      const title = titleHtml.replace(/<[^>]+>/g, '').trim()
      const numMatch = href.match(/chapter-(\d+)/i)
      const number = numMatch ? parseInt(numMatch[1], 10) : 0
      const path = href.startsWith('/') ? href.slice(1) : href
      chapters.push({ number, title, path })
    })
    return chapters.sort((a, b) => a.number - b.number)
  },
  async chapterContent({ path }) {
    const url = path.startsWith('http') ? path : `${HOST}/${path}`
    const html = await fetchPage2(url)
    const title = html.match(/<span class="chr-text">([\s\S]*?)<\/span>/i)
    const titleText = title ? title[1].replace(/<[^>]+>/g, '').trim() : ''
    const contentDiv = html.match(/<div[^>]*id="chr-content"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<hr|<script)/i)
    let content = ''
    if (contentDiv) {
      content = contentDiv[1]
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<ins[\s\S]*?<\/ins>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<div[^>]*class="[^"]*ads[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
        .trim()
    }
    return { title: titleText, content }
  },
}

// _utils/novel-providers/novelbuddy.js
var HOST2 = (typeof process !== 'undefined' && process.env.NOVEL_NOVELBUDDY_HOST) || 'https://novelbuddy.com'
async function fetchPage3(url, timeoutMs = 2e4) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })
  if (!res.ok) throw new Error(`NovelBuddy respondi\xF3 con ${res.status}`)
  return await res.text()
}
__name(fetchPage3, 'fetchPage')
function extractNextData(html) {
  const match2 = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
  return match2 ? JSON.parse(match2[1]) : null
}
__name(extractNextData, 'extractNextData')
var novelbuddyProvider = {
  async search({ q }) {
    const html = await fetchPage3(`${HOST2}/search?keyword=${encodeURIComponent(q)}`)
    const data = extractNextData(html)
    const items = data?.props?.pageProps?.ssrItems || []
    const results = []
    const seen = /* @__PURE__ */ new Set()
    const qLower = q.toLowerCase()
    for (const item of items) {
      if (!item.slug || seen.has(item.slug)) continue
      seen.add(item.slug)
      const title = item.name || item.slug
      const altName = item.altName || ''
      if (
        !title.toLowerCase().includes(qLower) &&
        !altName.toLowerCase().includes(qLower) &&
        !item.slug.includes(qLower.replace(/[^a-z0-9-]/g, ''))
      )
        continue
      results.push({
        slug: item.slug,
        title: item.name || item.slug,
        cover: item.cover || null,
        url: `${HOST2}${item.url || '/' + item.slug}`,
      })
    }
    return results
  },
  async info({ slug }) {
    const html = await fetchPage3(`${HOST2}/${slug}`)
    const data = extractNextData(html)
    const manga = data?.props?.pageProps?.initialManga
    if (!manga) throw new Error('No se pudo obtener informaci\xF3n de la novela')
    return {
      slug,
      title: manga.name || slug,
      cover: manga.cover || null,
      description: manga.summary ? manga.summary.replace(/<[^>]+>/g, '').trim() : '',
      author: manga.authors ? manga.authors.map((a) => a.name).join(', ') : '',
      status: manga.status || 'Unknown',
      genres: manga.genres ? manga.genres.map((g) => g.name) : [],
    }
  },
  async chapters({ slug }) {
    const html = await fetchPage3(`${HOST2}/${slug}`)
    const data = extractNextData(html)
    const manga = data?.props?.pageProps?.initialManga
    if (!manga) throw new Error('No se pudo obtener cap\xEDtulos')
    const chapters = (manga.chapters || [])
      .map((ch) => ({
        number: parseInt(ch.slug.replace('chapter-', ''), 10) || 0,
        title: ch.name || ch.slug,
        path: ch.url.startsWith('/') ? ch.url.slice(1) : ch.url,
      }))
      .sort((a, b) => a.number - b.number)
    if (chapters.length > 0) {
      const maxNum = chapters[chapters.length - 1].number
      const minNum = chapters[0].number
      const expectedCount = maxNum
      if (chapters.length < expectedCount && minNum > 1) {
        const existing = new Set(chapters.map((c) => c.number))
        for (let n = 1; n < minNum; n++) {
          if (!existing.has(n)) {
            const suffix = n >= maxNum && !chapters.find((c) => c.number === n) ? '-end' : ''
            chapters.push({
              number: n,
              title: `Chapter ${n}${suffix}`,
              path: `${slug}/chapter-${n}${suffix}`,
            })
          }
        }
        chapters.sort((a, b) => a.number - b.number)
      }
    }
    return chapters
  },
  async chapterContent({ path }) {
    const url = path.startsWith('http') ? path : `${HOST2}/${path}`
    const html = await fetchPage3(url)
    const data = extractNextData(html)
    const chapter = data?.props?.pageProps?.initialChapter
    if (!chapter) throw new Error('No se pudo obtener el contenido del cap\xEDtulo')
    let content = (chapter.content || '').replace(/<p>\s*<\/p>/gi, '').trim()
    return { title: chapter.name || '', content }
  },
}

// _utils/novel-providers/registry.js
var providers = [
  { name: 'novelbin', provider: novelbinProvider },
  { name: 'readnovelfull', provider: readnovelfullProvider },
  { name: 'novelbuddy', provider: novelbuddyProvider },
]
var nameMap = Object.fromEntries(providers.map((p) => [p.name, p.provider]))
async function tryProviders(action, params, context) {
  const errors = []
  if (params.source) {
    const provider = nameMap[params.source]
    if (!provider) throw new Error(`Fuente desconocida: ${params.source}`)
    if (typeof provider[action] !== 'function') throw new Error(`Acci\xF3n no soportada por ${params.source}`)
    try {
      const result = await provider[action](params, context)
      result._source = params.source
      return result
    } catch (e) {
      throw new Error(`${params.source}: ${e.message}`, { cause: e })
    }
  }
  for (const { name, provider } of providers) {
    if (typeof provider[action] !== 'function') continue
    try {
      const result = await provider[action](params, context)
      if (Array.isArray(result)) {
        result._source = name
        return result
      }
      if (result && typeof result === 'object') {
        result._source = name
        return result
      }
      return result
    } catch (e) {
      errors.push({ provider: name, error: e.message })
    }
  }
  if (errors.length === 1) {
    throw new Error(errors[0].error)
  }
  throw new Error(`No disponible (${errors.length} fuentes): ${errors.map((e) => `${e.provider}: ${e.error}`).join('; ')}`)
}
__name(tryProviders, 'tryProviders')
function getProviderNames() {
  return providers.map((p) => p.name)
}
__name(getProviderNames, 'getProviderNames')

// api/novels.js
async function onRequest31(context) {
  const { request } = context
  const rateCheck = checkRateLimit(request, { maxRequests: 30, windowMs: 6e4 })
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Retry-After': String(rateCheck.retryAfter) },
    })
  }
  const url = new URL(request.url)
  const action = url.searchParams.get('action')
  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }
  __name(jsonResponse, 'jsonResponse')
  const actionMap = {
    search: { params: { q: 'string' } },
    info: { params: { slug: 'string' } },
    chapters: { params: { slug: 'string' } },
    'chapter-content': { params: { path: 'string' } },
  }
  const def = actionMap[action]
  if (!def) {
    return jsonResponse({ error: 'Acci\xF3n no v\xE1lida. Usa: search, info, chapters, chapter-content' }, 400)
  }
  const params = {}
  for (const [key] of Object.entries(def.params)) {
    const val = url.searchParams.get(key)
    if (!val) return jsonResponse({ error: `Se requiere par\xE1metro ${key}` }, 400)
    params[key] = val
  }
  const source = url.searchParams.get('source') || ''
  if (source) params.source = source
  try {
    const data = await tryProviders(action === 'chapter-content' ? 'chapterContent' : action, params, context)
    const src = data._source
    delete data._source
    if (Array.isArray(data)) {
      return jsonResponse(data.map((item) => ({ ...item, _source: src || null })))
    }
    return jsonResponse({ ...data, _source: src || null })
  } catch (e) {
    const isDown = e.message.includes('522') || e.message.includes('ca\xEDdo')
    return jsonResponse(
      {
        error: isDown ? 'NovelBin est\xE1 temporalmente ca\xEDdo (522). Intenta de nuevo m\xE1s tarde.' : e.message,
        providers: getProviderNames(),
        providerStatus: 'unavailable',
      },
      502,
    )
  }
}
__name(onRequest31, 'onRequest')

// api/profile/index.js
async function onRequest32(context) {
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
    if (xp !== void 0 && xp !== null) {
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
__name(onRequest32, 'onRequest')

// api/proxy.js
var BLOCKED_HOSTS = ['metadata.google.internal', '169.254.169.254', '100.100.100.200', 'localhost', '127.0.0.1', '0.0.0.0', '[::1]']
function isPrivateIP(hostname) {
  const parts = hostname.split('.').map(Number)
  if (parts.length === 4 && !parts.some(isNaN)) {
    if (parts[0] === 10) return true
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    if (parts[0] === 192 && parts[1] === 168) return true
    if (parts[0] === 127) return true
    if (parts[0] === 0) return true
    if (parts[0] === 169 && parts[1] === 254) return true
  }
  return false
}
__name(isPrivateIP, 'isPrivateIP')
function isValidTarget(target) {
  try {
    const parsed = new URL(target)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    const hostname = parsed.hostname.toLowerCase()
    if (BLOCKED_HOSTS.some((h) => hostname === h || hostname.endsWith('.' + h))) return false
    if (isPrivateIP(hostname)) return false
    if (parsed.port && !['80', '443', '8080', '8443'].includes(parsed.port)) return false
    return true
  } catch {
    return false
  }
}
__name(isValidTarget, 'isValidTarget')
async function onRequest33(context) {
  const { request } = context
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }
  const rateCheck = checkRateLimit(request, { maxRequests: 60, windowMs: 6e4 })
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Retry-After': String(rateCheck.retryAfter),
      },
    })
  }
  const url = new URL(request.url)
  const target = url.searchParams.get('url')
  const referer = url.searchParams.get('referer') || ''
  const originParam = url.searchParams.get('origin') || ''
  if (!target) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
  if (!isValidTarget(target)) {
    return new Response(JSON.stringify({ error: 'Invalid or blocked URL' }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Accept: 'text/vtt, text/plain, */*',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  }
  if (referer) {
    headers['Referer'] = referer
    headers['Origin'] = new URL(referer).origin
  } else if (originParam) {
    headers['Origin'] = originParam
  }
  try {
    const res = await fetch(target, { headers })
    const body = await res.text()
    const contentType = res.headers.get('content-type') || 'text/plain'
    return new Response(body, {
      status: res.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}
__name(onRequest33, 'onRequest')

// api/push-subscriptions.js
async function onRequest34(context) {
  const { request, env } = context
  const preflight = await handleOptions(request)
  if (preflight) return preflight
  const { method } = request
  if (method === 'POST') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { endpoint, p256dh, auth } = await request.json()
    await execute(env.DB, 'INSERT OR REPLACE INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)', [
      user.id,
      endpoint,
      p256dh,
      auth,
    ])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (method === 'DELETE') {
    const user = await verifyAuth(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    await execute(env.DB, 'DELETE FROM push_subscriptions WHERE user_id = ?', [user.id])
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest34, 'onRequest')

// api/reviews/index.js
async function onRequest35(context) {
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      })
    }
    const { anilist_id, media_type, score, content, has_spoilers } = await request.json()
    const email = user.email || ''
    const existing = await queryOne(env.DB, 'SELECT id FROM reviews WHERE user_id = ? AND anilist_id = ?', [user.id, anilist_id])
    if (existing) {
      await execute(
        env.DB,
        "UPDATE reviews SET score = ?, content = ?, has_spoilers = ?, user_email = ?, updated_at = datetime('now') WHERE id = ?",
        [score, content, has_spoilers ? 1 : 0, email, existing.id],
      )
    } else {
      await execute(
        env.DB,
        'INSERT INTO reviews (user_id, user_email, anilist_id, media_type, score, content, has_spoilers) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user.id, email, anilist_id, media_type || 'anime', score, content, has_spoilers ? 1 : 0],
      )
    }
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
__name(onRequest35, 'onRequest')

// api/translate-subtitles.js
var BLOCKED_HOSTS2 = ['metadata.google.internal', '169.254.169.254', '100.100.100.200', 'localhost', '127.0.0.1', '0.0.0.0', '[::1]']
function isPrivateIP2(hostname) {
  const parts = hostname.split('.').map(Number)
  if (parts.length === 4 && !parts.some(isNaN)) {
    if (parts[0] === 10) return true
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    if (parts[0] === 192 && parts[1] === 168) return true
    if (parts[0] === 127) return true
    if (parts[0] === 0) return true
    if (parts[0] === 169 && parts[1] === 254) return true
  }
  return false
}
__name(isPrivateIP2, 'isPrivateIP')
function isValidTarget2(target) {
  try {
    const parsed = new URL(target)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    const hostname = parsed.hostname.toLowerCase()
    if (BLOCKED_HOSTS2.some((h) => hostname === h || hostname.endsWith('.' + h))) return false
    if (isPrivateIP2(hostname)) return false
    if (parsed.port && !['80', '443', '8080', '8443'].includes(parsed.port)) return false
    return true
  } catch {
    return false
  }
}
__name(isValidTarget2, 'isValidTarget')
var HTML_TAG_RE = /(<\/?[a-z][a-z0-9]*\b[^>]*>)/gi
var SEP = '\0'
var MAX_BATCH_CHARS = 1500
var MAX_RETRIES = 3
function stripTags(text) {
  return text.replace(HTML_TAG_RE, '\0$1')
}
__name(stripTags, 'stripTags')
function restoreTags(text) {
  return text.replace(new RegExp(String.fromCharCode(0) + '([^' + String.fromCharCode(1) + ']+)' + String.fromCharCode(1), 'g'), '$1')
}
__name(restoreTags, 'restoreTags')
function parseTextBlocks(vttText) {
  const lines = vttText.split('\n')
  const blocks = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('-->') || line.trim() === '' || line === 'WEBVTT' || line.startsWith('NOTE')) continue
    if (/[a-zA-Z\u00C0-\u024F]{2,}/.test(line)) {
      blocks.push({ index: i, text: line })
    }
  }
  return blocks
}
__name(parseTextBlocks, 'parseTextBlocks')
function buildBatches(blocks) {
  const batches = []
  let current = []
  let currentChars = 0
  for (const block of blocks) {
    const chars = block.text.length + 3
    if (currentChars + chars > MAX_BATCH_CHARS && current.length > 0) {
      batches.push(current)
      current = [block]
      currentChars = chars
    } else {
      current.push(block)
      currentChars += chars
    }
  }
  if (current.length > 0) batches.push(current)
  return batches
}
__name(buildBatches, 'buildBatches')
async function translateWithRetry(ai, input, from, to, attempt = 0) {
  try {
    return await ai.run('@cf/meta/m2m100-1.2b', {
      text: input,
      source_lang: from,
      target_lang: to,
    })
  } catch (e) {
    if (attempt < MAX_RETRIES - 1) {
      const delay = Math.pow(2, attempt) * 1e3
      await new Promise((r) => setTimeout(r, delay))
      return translateWithRetry(ai, input, from, to, attempt + 1)
    }
    throw e
  }
}
__name(translateWithRetry, 'translateWithRetry')
async function translateBatch(ai, texts, from, to) {
  const input = texts.join(SEP)
  const result = await translateWithRetry(ai, input, from, to)
  let parts = result.translated_text.split(SEP)
  if (parts.length !== texts.length) {
    const individual = []
    for (const t of texts) {
      try {
        const r = await translateWithRetry(ai, t, from, to)
        individual.push(r.translated_text)
      } catch {
        individual.push(t)
      }
    }
    parts = individual
  }
  return parts
}
__name(translateBatch, 'translateBatch')
async function translateVtt(vttText, ai, from, to) {
  const lines = vttText.split('\n')
  const blocks = parseTextBlocks(vttText)
  if (blocks.length === 0) return vttText
  const batches = buildBatches(blocks)
  for (const batch of batches) {
    const originalTexts = batch.map((b) => stripTags(b.text))
    const translatedTexts = await translateBatch(ai, originalTexts, from, to)
    for (let j = 0; j < batch.length; j++) {
      if (translatedTexts[j]) {
        const restored = restoreTags(translatedTexts[j])
        lines[batch[j].index] = restored.replace(/\n+/g, ' ')
      }
    }
  }
  let result = lines.join('\n')
  if (!result.startsWith('WEBVTT')) {
    result = 'WEBVTT\n\n' + result
  }
  return result
}
__name(translateVtt, 'translateVtt')
async function onRequest36(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }
  const url = new URL(request.url)
  const subUrl = url.searchParams.get('url')
  const referer = url.searchParams.get('referer') || ''
  const from = url.searchParams.get('from') || 'english'
  const to = url.searchParams.get('to') || 'spanish'
  if (!subUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
  if (!isValidTarget2(subUrl)) {
    return new Response(JSON.stringify({ error: 'Invalid or blocked URL' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
  const fetchHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Accept: 'text/vtt, text/plain, */*',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  }
  if (referer) fetchHeaders['Referer'] = referer
  let vttText
  try {
    const res = await fetch(subUrl, { headers: fetchHeaders })
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch subtitles (${res.status})` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
    vttText = await res.text()
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
  const ai = env.AI || env['AI '] || env['AI\xA0']
  if (!ai) {
    return new Response(vttText, {
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
  try {
    const translated = await translateVtt(vttText, ai, from, to)
    return new Response(translated, {
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    if (vttText) {
      return new Response(vttText, {
        status: 200,
        statusText: 'Translation failed, returning original',
        headers: {
          'Content-Type': 'text/vtt; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
__name(onRequest36, 'onRequest')

// ../.wrangler/tmp/pages-wGqdSF/functionsRoutes-0.6610314369690362.mjs
var routes = [
  {
    routePath: '/api/collections/:id/items/:itemId',
    mountPath: '/api/collections/:id/items',
    method: '',
    middlewares: [],
    modules: [onRequest],
  },
  {
    routePath: '/api/collections/:id/items',
    mountPath: '/api/collections/:id/items',
    method: '',
    middlewares: [],
    modules: [onRequest2],
  },
  {
    routePath: '/api/comments/:id/likes',
    mountPath: '/api/comments/:id',
    method: '',
    middlewares: [],
    modules: [onRequest3],
  },
  {
    routePath: '/api/reviews/:id/votes',
    mountPath: '/api/reviews/:id',
    method: '',
    middlewares: [],
    modules: [onRequest4],
  },
  {
    routePath: '/api/admin/bootstrap',
    mountPath: '/api/admin',
    method: '',
    middlewares: [],
    modules: [onRequest5],
  },
  {
    routePath: '/api/admin/check',
    mountPath: '/api/admin',
    method: '',
    middlewares: [],
    modules: [onRequest6],
  },
  {
    routePath: '/api/admin/moderation',
    mountPath: '/api/admin',
    method: '',
    middlewares: [],
    modules: [onRequest7],
  },
  {
    routePath: '/api/anime/favorites',
    mountPath: '/api/anime',
    method: '',
    middlewares: [],
    modules: [onRequest8],
  },
  {
    routePath: '/api/anime/history',
    mountPath: '/api/anime',
    method: '',
    middlewares: [],
    modules: [onRequest9],
  },
  {
    routePath: '/api/anime/lists',
    mountPath: '/api/anime',
    method: '',
    middlewares: [],
    modules: [onRequest10],
  },
  {
    routePath: '/api/anime/ratings',
    mountPath: '/api/anime',
    method: '',
    middlewares: [],
    modules: [onRequest11],
  },
  {
    routePath: '/api/anime/watchlist',
    mountPath: '/api/anime',
    method: '',
    middlewares: [],
    modules: [onRequest12],
  },
  {
    routePath: '/api/manga/favorites',
    mountPath: '/api/manga',
    method: '',
    middlewares: [],
    modules: [onRequest13],
  },
  {
    routePath: '/api/manga/history',
    mountPath: '/api/manga',
    method: '',
    middlewares: [],
    modules: [onRequest14],
  },
  {
    routePath: '/api/manga/lists',
    mountPath: '/api/manga',
    method: '',
    middlewares: [],
    modules: [onRequest15],
  },
  {
    routePath: '/api/novel/favorites',
    mountPath: '/api/novel',
    method: '',
    middlewares: [],
    modules: [onRequest16],
  },
  {
    routePath: '/api/novel/history',
    mountPath: '/api/novel',
    method: '',
    middlewares: [],
    modules: [onRequest17],
  },
  {
    routePath: '/api/novel/lists',
    mountPath: '/api/novel',
    method: '',
    middlewares: [],
    modules: [onRequest18],
  },
  {
    routePath: '/api/novel/ratings',
    mountPath: '/api/novel',
    method: '',
    middlewares: [],
    modules: [onRequest19],
  },
  {
    routePath: '/api/collections/:id',
    mountPath: '/api/collections/:id',
    method: '',
    middlewares: [],
    modules: [onRequest20],
  },
  {
    routePath: '/api/comments/:id',
    mountPath: '/api/comments/:id',
    method: '',
    middlewares: [],
    modules: [onRequest21],
  },
  {
    routePath: '/api/reviews/:id',
    mountPath: '/api/reviews/:id',
    method: '',
    middlewares: [],
    modules: [onRequest22],
  },
  {
    routePath: '/api/ai-recommend',
    mountPath: '/api',
    method: '',
    middlewares: [],
    modules: [onRequest23],
  },
  {
    routePath: '/api/ai-test',
    mountPath: '/api',
    method: '',
    middlewares: [],
    modules: [onRequest24],
  },
  {
    routePath: '/api/check-site',
    mountPath: '/api',
    method: '',
    middlewares: [],
    modules: [onRequest25],
  },
  {
    routePath: '/api/collections',
    mountPath: '/api/collections',
    method: '',
    middlewares: [],
    modules: [onRequest26],
  },
  {
    routePath: '/api/comments',
    mountPath: '/api/comments',
    method: '',
    middlewares: [],
    modules: [onRequest27],
  },
  {
    routePath: '/api/follows',
    mountPath: '/api/follows',
    method: '',
    middlewares: [],
    modules: [onRequest28],
  },
  {
    routePath: '/api/mangadex',
    mountPath: '/api',
    method: '',
    middlewares: [],
    modules: [onRequest29],
  },
  {
    routePath: '/api/notification-preferences',
    mountPath: '/api',
    method: '',
    middlewares: [],
    modules: [onRequest30],
  },
  {
    routePath: '/api/novels',
    mountPath: '/api',
    method: '',
    middlewares: [],
    modules: [onRequest31],
  },
  {
    routePath: '/api/profile',
    mountPath: '/api/profile',
    method: '',
    middlewares: [],
    modules: [onRequest32],
  },
  {
    routePath: '/api/proxy',
    mountPath: '/api',
    method: '',
    middlewares: [],
    modules: [onRequest33],
  },
  {
    routePath: '/api/push-subscriptions',
    mountPath: '/api',
    method: '',
    middlewares: [],
    modules: [onRequest34],
  },
  {
    routePath: '/api/reviews',
    mountPath: '/api/reviews',
    method: '',
    middlewares: [],
    modules: [onRequest35],
  },
  {
    routePath: '/api/translate-subtitles',
    mountPath: '/api',
    method: '',
    middlewares: [],
    modules: [onRequest36],
  },
]

// ../../../../AppData/Local/npm-cache/_npx/c943b712072b77c4/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = []
  var i = 0
  while (i < str.length) {
    var char = str[i]
    if (char === '*' || char === '+' || char === '?') {
      tokens.push({ type: 'MODIFIER', index: i, value: str[i++] })
      continue
    }
    if (char === '\\') {
      tokens.push({ type: 'ESCAPED_CHAR', index: i++, value: str[i++] })
      continue
    }
    if (char === '{') {
      tokens.push({ type: 'OPEN', index: i, value: str[i++] })
      continue
    }
    if (char === '}') {
      tokens.push({ type: 'CLOSE', index: i, value: str[i++] })
      continue
    }
    if (char === ':') {
      var name = ''
      var j = i + 1
      while (j < str.length) {
        var code = str.charCodeAt(j)
        if (
          // `0-9`
          (code >= 48 && code <= 57) || // `A-Z`
          (code >= 65 && code <= 90) || // `a-z`
          (code >= 97 && code <= 122) || // `_`
          code === 95
        ) {
          name += str[j++]
          continue
        }
        break
      }
      if (!name) throw new TypeError('Missing parameter name at '.concat(i))
      tokens.push({ type: 'NAME', index: i, value: name })
      i = j
      continue
    }
    if (char === '(') {
      var count = 1
      var pattern = ''
      var j = i + 1
      if (str[j] === '?') {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j))
      }
      while (j < str.length) {
        if (str[j] === '\\') {
          pattern += str[j++] + str[j++]
          continue
        }
        if (str[j] === ')') {
          count--
          if (count === 0) {
            j++
            break
          }
        } else if (str[j] === '(') {
          count++
          if (str[j + 1] !== '?') {
            throw new TypeError('Capturing groups are not allowed at '.concat(j))
          }
        }
        pattern += str[j++]
      }
      if (count) throw new TypeError('Unbalanced pattern at '.concat(i))
      if (!pattern) throw new TypeError('Missing pattern at '.concat(i))
      tokens.push({ type: 'PATTERN', index: i, value: pattern })
      i = j
      continue
    }
    tokens.push({ type: 'CHAR', index: i, value: str[i++] })
  }
  tokens.push({ type: 'END', index: i, value: '' })
  return tokens
}
__name(lexer, 'lexer')
function parse(str, options) {
  if (options === void 0) {
    options = {}
  }
  var tokens = lexer(str)
  var _a = options.prefixes,
    prefixes = _a === void 0 ? './' : _a,
    _b = options.delimiter,
    delimiter = _b === void 0 ? '/#?' : _b
  var result = []
  var key = 0
  var i = 0
  var path = ''
  var tryConsume = /* @__PURE__ */ __name(function (type) {
    if (i < tokens.length && tokens[i].type === type) return tokens[i++].value
  }, 'tryConsume')
  var mustConsume = /* @__PURE__ */ __name(function (type) {
    var value2 = tryConsume(type)
    if (value2 !== void 0) return value2
    var _a2 = tokens[i],
      nextType = _a2.type,
      index = _a2.index
    throw new TypeError('Unexpected '.concat(nextType, ' at ').concat(index, ', expected ').concat(type))
  }, 'mustConsume')
  var consumeText = /* @__PURE__ */ __name(function () {
    var result2 = ''
    var value2
    while ((value2 = tryConsume('CHAR') || tryConsume('ESCAPED_CHAR'))) {
      result2 += value2
    }
    return result2
  }, 'consumeText')
  var isSafe = /* @__PURE__ */ __name(function (value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i]
      if (value2.indexOf(char2) > -1) return true
    }
    return false
  }, 'isSafe')
  var safePattern = /* @__PURE__ */ __name(function (prefix2) {
    var prev = result[result.length - 1]
    var prevText = prefix2 || (prev && typeof prev === 'string' ? prev : '')
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'))
    }
    if (!prevText || isSafe(prevText)) return '[^'.concat(escapeString(delimiter), ']+?')
    return '(?:(?!'.concat(escapeString(prevText), ')[^').concat(escapeString(delimiter), '])+?')
  }, 'safePattern')
  while (i < tokens.length) {
    var char = tryConsume('CHAR')
    var name = tryConsume('NAME')
    var pattern = tryConsume('PATTERN')
    if (name || pattern) {
      var prefix = char || ''
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix
        prefix = ''
      }
      if (path) {
        result.push(path)
        path = ''
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: '',
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume('MODIFIER') || '',
      })
      continue
    }
    var value = char || tryConsume('ESCAPED_CHAR')
    if (value) {
      path += value
      continue
    }
    if (path) {
      result.push(path)
      path = ''
    }
    var open = tryConsume('OPEN')
    if (open) {
      var prefix = consumeText()
      var name_1 = tryConsume('NAME') || ''
      var pattern_1 = tryConsume('PATTERN') || ''
      var suffix = consumeText()
      mustConsume('CLOSE')
      result.push({
        name: name_1 || (pattern_1 ? key++ : ''),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume('MODIFIER') || '',
      })
      continue
    }
    mustConsume('END')
  }
  return result
}
__name(parse, 'parse')
function match(str, options) {
  var keys = []
  var re = pathToRegexp(str, keys, options)
  return regexpToFunction(re, keys, options)
}
__name(match, 'match')
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {}
  }
  var _a = options.decode,
    decode =
      _a === void 0
        ? function (x) {
            return x
          }
        : _a
  return function (pathname) {
    var m = re.exec(pathname)
    if (!m) return false
    var path = m[0],
      index = m.index
    var params = /* @__PURE__ */ Object.create(null)
    var _loop_1 = /* @__PURE__ */ __name(function (i2) {
      if (m[i2] === void 0) return 'continue'
      var key = keys[i2 - 1]
      if (key.modifier === '*' || key.modifier === '+') {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function (value) {
          return decode(value, key)
        })
      } else {
        params[key.name] = decode(m[i2], key)
      }
    }, '_loop_1')
    for (var i = 1; i < m.length; i++) {
      _loop_1(i)
    }
    return { path, index, params }
  }
}
__name(regexpToFunction, 'regexpToFunction')
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1')
}
__name(escapeString, 'escapeString')
function flags(options) {
  return options && options.sensitive ? '' : 'i'
}
__name(flags, 'flags')
function regexpToRegexp(path, keys) {
  if (!keys) return path
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g
  var index = 0
  var execResult = groupsRegex.exec(path.source)
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: '',
      suffix: '',
      modifier: '',
      pattern: '',
    })
    execResult = groupsRegex.exec(path.source)
  }
  return path
}
__name(regexpToRegexp, 'regexpToRegexp')
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function (path) {
    return pathToRegexp(path, keys, options).source
  })
  return new RegExp('(?:'.concat(parts.join('|'), ')'), flags(options))
}
__name(arrayToRegexp, 'arrayToRegexp')
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options)
}
__name(stringToRegexp, 'stringToRegexp')
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {}
  }
  var _a = options.strict,
    strict = _a === void 0 ? false : _a,
    _b = options.start,
    start = _b === void 0 ? true : _b,
    _c = options.end,
    end = _c === void 0 ? true : _c,
    _d = options.encode,
    encode =
      _d === void 0
        ? function (x) {
            return x
          }
        : _d,
    _e = options.delimiter,
    delimiter = _e === void 0 ? '/#?' : _e,
    _f = options.endsWith,
    endsWith = _f === void 0 ? '' : _f
  var endsWithRe = '['.concat(escapeString(endsWith), ']|$')
  var delimiterRe = '['.concat(escapeString(delimiter), ']')
  var route = start ? '^' : ''
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i]
    if (typeof token === 'string') {
      route += escapeString(encode(token))
    } else {
      var prefix = escapeString(encode(token.prefix))
      var suffix = escapeString(encode(token.suffix))
      if (token.pattern) {
        if (keys) keys.push(token)
        if (prefix || suffix) {
          if (token.modifier === '+' || token.modifier === '*') {
            var mod = token.modifier === '*' ? '?' : ''
            route += '(?:'
              .concat(prefix, '((?:')
              .concat(token.pattern, ')(?:')
              .concat(suffix)
              .concat(prefix, '(?:')
              .concat(token.pattern, '))*)')
              .concat(suffix, ')')
              .concat(mod)
          } else {
            route += '(?:'.concat(prefix, '(').concat(token.pattern, ')').concat(suffix, ')').concat(token.modifier)
          }
        } else {
          if (token.modifier === '+' || token.modifier === '*') {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'))
          }
          route += '('.concat(token.pattern, ')').concat(token.modifier)
        }
      } else {
        route += '(?:'.concat(prefix).concat(suffix, ')').concat(token.modifier)
      }
    }
  }
  if (end) {
    if (!strict) route += ''.concat(delimiterRe, '?')
    route += !options.endsWith ? '$' : '(?='.concat(endsWithRe, ')')
  } else {
    var endToken = tokens[tokens.length - 1]
    var isEndDelimited = typeof endToken === 'string' ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0
    if (!strict) {
      route += '(?:'.concat(delimiterRe, '(?=').concat(endsWithRe, '))?')
    }
    if (!isEndDelimited) {
      route += '(?='.concat(delimiterRe, '|').concat(endsWithRe, ')')
    }
  }
  return new RegExp(route, flags(options))
}
__name(tokensToRegexp, 'tokensToRegexp')
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp) return regexpToRegexp(path, keys)
  if (Array.isArray(path)) return arrayToRegexp(path, keys, options)
  return stringToRegexp(path, keys, options)
}
__name(pathToRegexp, 'pathToRegexp')

// ../../../../AppData/Local/npm-cache/_npx/c943b712072b77c4/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, '\\$&'), {
      end: false,
    })
    const mountMatcher = match(route.mountPath.replace(escapeRegex, '\\$&'), {
      end: false,
    })
    const matchResult = routeMatcher(requestPath)
    const mountMatchResult = mountMatcher(requestPath)
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path,
        }
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, '\\$&'), {
      end: true,
    })
    const mountMatcher = match(route.mountPath.replace(escapeRegex, '\\$&'), {
      end: false,
    })
    const matchResult = routeMatcher(requestPath)
    const mountMatchResult = mountMatcher(requestPath)
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path,
        }
      }
      break
    }
  }
}
__name(executeRequest, 'executeRequest')
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest
    const handlerIterator = executeRequest(request)
    let data = {}
    let isFailOpen = false
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input
        if (typeof input === 'string') {
          url = new URL(input, request.url).toString()
        }
        request = new Request(url, init)
      }
      const result = handlerIterator.next()
      if (result.done === false) {
        const { handler, params, path } = result.value
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data
          },
          set data(value) {
            if (typeof value !== 'object' || value === null) {
              throw new Error('context.data must be an object')
            }
            data = value
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true
          }, 'passThroughOnException'),
        }
        const response = await handler(context)
        if (!(response instanceof Response)) {
          throw new Error('Your Pages function should return a Response')
        }
        return cloneResponse(response)
      } else if ('ASSETS') {
        const response = await env['ASSETS'].fetch(request)
        return cloneResponse(response)
      } else {
        const response = await fetch(request)
        return cloneResponse(response)
      }
    }, 'next')
    try {
      return await next()
    } catch (error) {
      if (isFailOpen) {
        const response = await env['ASSETS'].fetch(request)
        return cloneResponse(response)
      }
      throw error
    }
  },
}
var cloneResponse = /* @__PURE__ */ __name(
  (response) =>
    // https://fetch.spec.whatwg.org/#null-body-status
    new Response([101, 204, 205, 304].includes(response.status) ? null : response.body, response),
  'cloneResponse',
)
export { pages_template_worker_default as default }
