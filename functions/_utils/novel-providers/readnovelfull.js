/* global process */
const HOST = (typeof process !== 'undefined' && process.env.NOVEL_READNOVELFULL_HOST) || 'https://readnovelfull.com'

async function fetchPage(url, extraHeaders = {}, timeoutMs = 10000) {
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
    if (!res.ok) throw new Error(`ReadNovelFull respondió con ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timeout)
  }
}

export const readnovelfullProvider = {
  async search({ q }) {
    const html = await fetchPage(`${HOST}/ajax/search-novel?keyword=${encodeURIComponent(q)}`, {
      'X-Requested-With': 'XMLHttpRequest',
    })
    const results = []
    const seen = new Set()
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
    const html = await fetchPage(`${HOST}/${slug}.html`)
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
    const html = await fetchPage(`${HOST}/${slug}.html`)
    const idMatch = html.match(/data-novel-id="(\d+)"/i)
    if (!idMatch) throw new Error('No se pudo obtener el ID de la novela')
    const novelId = idMatch[1]
    const archHtml = await fetchPage(`${HOST}/ajax/chapter-archive?novelId=${novelId}`, {
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
    const html = await fetchPage(url)
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
