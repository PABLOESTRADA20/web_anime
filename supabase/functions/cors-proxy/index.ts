import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const target = url.searchParams.get('url')
  if (!target) {
    return new Response(JSON.stringify({ error: 'Missing url param' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const origin = new URL(target).origin
    const res = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': origin,
      },
    })

    const body = await res.text()
    return new Response(body, {
      headers: {
        ...corsHeaders,
        'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Proxy failed', detail: e.message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
