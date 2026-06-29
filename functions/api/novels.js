import { checkRateLimit } from '../_utils/rate-limit.js'
import { tryProviders, getProviderNames } from '../_utils/novel-providers/registry.js'

export async function onRequest(context) {
  const { request } = context

  const rateCheck = checkRateLimit(request, { maxRequests: 30, windowMs: 60000 })
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

  const actionMap = {
    search: { params: { q: 'string' } },
    info: { params: { slug: 'string' } },
    chapters: { params: { slug: 'string' } },
    'chapter-content': { params: { path: 'string' } },
  }

  const def = actionMap[action]
  if (!def) {
    return jsonResponse({ error: 'Acción no válida. Usa: search, info, chapters, chapter-content' }, 400)
  }

  const params = {}
  for (const [key] of Object.entries(def.params)) {
    const val = url.searchParams.get(key)
    if (!val) return jsonResponse({ error: `Se requiere parámetro ${key}` }, 400)
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
    const isDown = e.message.includes('522') || e.message.includes('caído')
    return jsonResponse(
      {
        error: isDown ? 'NovelBin está temporalmente caído (522). Intenta de nuevo más tarde.' : e.message,
        providers: getProviderNames(),
        providerStatus: 'unavailable',
      },
      502,
    )
  }
}
