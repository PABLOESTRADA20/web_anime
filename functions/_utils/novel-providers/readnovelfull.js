const HOST = 'https://readnovelfull.com'

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

async function getNovelId(slug) {
  const html = await fetchPage(`${HOST}/${slug}-novel.html`)
  const match = html.match(/data-novel-id="(\d+)"/i)
  return match ? match[1] : null
}

async function fetchAllChapters(slug) {
  const novelId = await getNovelId(slug)
  if (!novelId) throw new Error('No se pudo obtener el ID de la novela')
  const html = await fetchPage(`${HOST}/ajax/chapter-archive?novelId=${novelId}`, {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: '*/*',
  })
  const chapters = []
  const links = [...html.matchAll(/<a[^>]*href="(\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
  links.forEach(([, href, titleHtml]) => {
    const title = titleHtml.replace(/<[^>]+>/g, '').trim()
    const numMatch = href.match(/chapter-(\d+)/i)
    const number = numMatch ? parseInt(numMatch[1], 10) : 0
    const path = href.startsWith('/') ? href.slice(1) : href
    chapters.push({ number, title, path })
  })
  return chapters.sort((a, b) => a.number - b.number)
}

export const readnovelfullProvider = {
  async search({ q }) {
    const html = await fetchPage(`${HOST}/novel-list/search?keyword=${encodeURIComponent(q)}`)
    const results = []
    const seen = new Set()
    const mainMatch = html.match(/col-novel-main[^>]*>([\s\S]*?)col-sidebar/i)
    if (mainMatch) {
      const items = [...mainMatch[1].matchAll(/<a[^>]*href="(\/([a-z0-9-]+)-novel\.html)"[^>]*>([\s\S]*?)<\/a>/gi)]
      for (const [, href, slug, titleHtml] of items) {
        if (seen.has(slug)) continue
        seen.add(slug)
        const title = titleHtml.replace(/<[^>]+>/g, '').trim()
        results.push({ slug, title, url: `${HOST}${href}` })
      }
    }
    return results
  },

  async info({ slug }) {
    const html = await fetchPage(`${HOST}/${slug}-novel.html`)
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
    return await fetchAllChapters(slug)
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
