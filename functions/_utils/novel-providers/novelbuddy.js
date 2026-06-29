const HOST = 'https://novelbuddy.com'

async function fetchPage(url, timeoutMs = 10000) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })
  if (!res.ok) throw new Error(`NovelBuddy respondió con ${res.status}`)
  return await res.text()
}

function extractNextData(html) {
  const match = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
  return match ? JSON.parse(match[1]) : null
}

export const novelbuddyProvider = {
  async search({ q }) {
    const html = await fetchPage(`${HOST}/search?keyword=${encodeURIComponent(q)}`)
    const data = extractNextData(html)
    const items = data?.props?.pageProps?.ssrItems || []
    const results = []
    const seen = new Set()
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
        url: `${HOST}${item.url || '/' + item.slug}`,
      })
    }
    return results
  },

  async info({ slug }) {
    const html = await fetchPage(`${HOST}/${slug}`)
    const data = extractNextData(html)
    const manga = data?.props?.pageProps?.initialManga
    if (!manga) throw new Error('No se pudo obtener información de la novela')
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
    const html = await fetchPage(`${HOST}/${slug}`)
    const data = extractNextData(html)
    const manga = data?.props?.pageProps?.initialManga
    if (!manga) throw new Error('No se pudo obtener capítulos')
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
    const url = path.startsWith('http') ? path : `${HOST}/${path}`
    const html = await fetchPage(url)
    const data = extractNextData(html)
    const chapter = data?.props?.pageProps?.initialChapter
    if (!chapter) throw new Error('No se pudo obtener el contenido del capítulo')
    let content = (chapter.content || '').replace(/<p>\s*<\/p>/gi, '').trim()
    return { title: chapter.name || '', content }
  },
}
