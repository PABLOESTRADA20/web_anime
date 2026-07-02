const VALID_LANGS = { es: 'Español', en: 'English', pt: 'Português' }

export async function onRequest(context) {
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

  const ai = env.AI || env['AI '] || env['AI\u00A0']

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
      max_tokens: 2000,
      temperature: 0.7,
    })

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
      const match = text.match(/\[[\s\S]*\]/)
      if (match) {
        try {
          recommendations = JSON.parse(match[0])
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
