/* global process */
const NOVELBIN_HOST = (typeof process !== 'undefined' && process.env.NOVEL_NOVELBIN_HOST) || 'https://novelbin.me'

const HOST_ESCAPED = NOVELBIN_HOST.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')

async function fetchPage(url, timeoutMs = 10000) {
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
      throw new Error(`NovelBin respondió con ${res.status}${res.status === 522 ? ' (el sitio está caído)' : ''}`)
    }
    return await res.text()
  } finally {
    clearTimeout(timeout)
  }
}

export const novelbinProvider = {
  async search({ q }) {
    const html = await fetchPage(`${NOVELBIN_HOST}/ajax/search-novel?keyword=${encodeURIComponent(q)}`)
    const results = []
    const regex = new RegExp(`<a[^>]*href="(${HOST_ESCAPED}\\/b\\/([^"]+))"[^>]*title="([^"]*)"[^>]*>`, 'gi')
    let match
    while ((match = regex.exec(html)) !== null) {
      results.push({ slug: match[2], title: match[3].trim(), url: match[1] })
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
    let match
    while ((match = regex.exec(html)) !== null) {
      chapters.push({ number: parseInt(match[1], 10), title: match[3].trim(), path: `${slug}/chapter-${match[1]}` })
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
