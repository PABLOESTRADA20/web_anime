export async function onRequest(context) {
  const url = new URL(context.request.url)
  const target = url.searchParams.get('url') || ''

  try {
    const res = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(20000),
      redirect: 'follow',
    })
    const text = await res.text()

    // Extract all inline scripts
    const scripts = []
    const re = /<script[^>]*>([\s\S]*?)<\/script>/gi
    let m
    while ((m = re.exec(text)) !== null) {
      const c = m[1].trim()
      if (c.length > 20) scripts.push({ len: c.length, htmlPos: m.index, content: c })
    }

    // Find the eval script specifically
    const evalScript = scripts.find((s) => s.content.includes('eval(') || s.content.includes('newImgs'))

    // Also find the vars script with comicid/chapterid
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
              content: evalScript.content.slice(0, 5000),
            }
          : null,
        varsScript: varsScript ? varsScript.content.slice(0, 1000) : null,
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
