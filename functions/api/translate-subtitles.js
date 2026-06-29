const BLOCKED_HOSTS = ['metadata.google.internal', '169.254.169.254', '100.100.100.200', 'localhost', '127.0.0.1', '0.0.0.0', '[::1]']

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

const HTML_TAG_RE = /(<\/?[a-z][a-z0-9]*\b[^>]*>)/gi
const SEP = '\x00\x01\x02'
const MAX_BATCH_CHARS = 1500
const MAX_RETRIES = 3

function stripTags(text) {
  return text.replace(HTML_TAG_RE, '\x00$1\x01')
}

function restoreTags(text) {
  return text.replace(new RegExp(String.fromCharCode(0) + '([^' + String.fromCharCode(1) + ']+)' + String.fromCharCode(1), 'g'), '$1')
}

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

async function translateWithRetry(ai, input, from, to, attempt = 0) {
  try {
    return await ai.run('@cf/meta/m2m100-1.2b', {
      text: input,
      source_lang: from,
      target_lang: to,
    })
  } catch (e) {
    if (attempt < MAX_RETRIES - 1) {
      const delay = Math.pow(2, attempt) * 1000
      await new Promise((r) => setTimeout(r, delay))
      return translateWithRetry(ai, input, from, to, attempt + 1)
    }
    throw e
  }
}

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

  if (!isValidTarget(subUrl)) {
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

  const ai = env.AI || env['AI '] || env['AI\u00A0']

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
