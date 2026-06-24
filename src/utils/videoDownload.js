const VIDEO_CACHE = 'animeverse-video-v1'
const META_KEY = 'animeverse_video_downloads'

function getMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || '[]')
  } catch {
    return []
  }
}

function setMeta(items) {
  localStorage.setItem(META_KEY, JSON.stringify(items))
}

function resolveUrl(url, base) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const baseUrl = base.endsWith('/') ? base : base.substring(0, base.lastIndexOf('/') + 1)
  if (url.startsWith('/')) {
    const u = new URL(base)
    return `${u.protocol}//${u.host}${url}`
  }
  return baseUrl + url
}

export function parseM3U8(content, baseUrl) {
  const lines = content.split('\n')
  const variants = []
  const segments = []
  let isMaster = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.includes('EXT-X-STREAM-INF')) {
      isMaster = true
      const next = lines[i + 1]?.trim()
      if (next && !next.startsWith('#')) {
        const bw = parseInt(line.match(/BANDWIDTH=(\d+)/)?.[1], 10) || 0
        const res = line.match(/RESOLUTION=(\d+x\d+)/)?.[1] || ''
        const height = res.split('x')[1] || 'auto'
        variants.push({ url: resolveUrl(next, baseUrl), bandwidth: bw, resolution: res, quality: height + 'p' })
        i++
      }
    } else if (line && !line.startsWith('#') && !isMaster) {
      segments.push(resolveUrl(line, baseUrl))
    }
  }

  if (isMaster) return { type: 'master', variants }
  return { type: 'media', segments }
}

export async function downloadVideoEpisode({ id, title, image, episode, quality, m3u8Url, referer, onProgress }) {
  if (!('caches' in window)) throw new Error('Cache API no disponible')

  const meta = getMeta()
  if (meta.some((d) => d.id === id)) throw new Error('Ya descargado')

  const proxyUrl = m3u8Url.includes('/api/proxy')
    ? m3u8Url
    : `/api/proxy?url=${encodeURIComponent(m3u8Url)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}`

  const playlistRes = await fetch(proxyUrl)
  if (!playlistRes.ok) throw new Error(`Error al obtener playlist: ${playlistRes.status}`)
  const playlistText = await playlistRes.text()

  const parsed = parseM3U8(playlistText, m3u8Url)

  let segments = []
  let finalQuality = quality

  if (parsed.type === 'master') {
    const target = parsed.variants.find((v) => v.quality === quality) || parsed.variants[0]
    if (!target) throw new Error('No se encontró calidad')
    finalQuality = target.quality
    const levelRes = await fetch(
      target.url.includes('/api/proxy')
        ? target.url
        : `/api/proxy?url=${encodeURIComponent(target.url)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}`,
    )
    if (!levelRes.ok) throw new Error(`Error al obtener playlist de calidad`)
    const levelText = await levelRes.text()
    const levelParsed = parseM3U8(levelText, target.url)
    segments = levelParsed.segments
  } else {
    segments = parsed.segments
  }

  if (segments.length === 0) throw new Error('No hay segments en la playlist')

  const cache = await caches.open(VIDEO_CACHE)
  const total = segments.length
  let completed = 0

  for (let i = 0; i < total; i++) {
    const segUrl = segments[i]
    try {
      let res = await fetch(segUrl, { mode: 'cors', cache: 'force-cache' })
      if (!res.ok && res.status === 0) {
        res = await fetch(`/api/proxy?url=${encodeURIComponent(segUrl)}`)
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await cache.put(segUrl, res.clone())
    } catch (e) {
      throw new Error(`Error en segmento ${i + 1}/${total}: ${e.message}`, { cause: e })
    }
    completed++
    if (onProgress) onProgress(completed, total)
  }

  const cachedPlaylistKey = `__playlist__${id}`
  const playlistLines = playlistText.split('\n')
  const modifiedPlaylist = playlistLines
    .map((line) => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && segments.includes(resolveUrl(trimmed, m3u8Url))) {
        return resolveUrl(trimmed, m3u8Url)
      }
      return line
    })
    .join('\n')
  await cache.put(cachedPlaylistKey, new Response(modifiedPlaylist, { headers: { 'Content-Type': 'application/vnd.apple.mpegurl' } }))

  const entry = {
    id,
    type: 'video',
    title,
    image,
    episode,
    quality: finalQuality,
    segments,
    totalSegments: total,
    size: 0,
    addedAt: Date.now(),
    m3u8Url,
    referer,
    playlistKey: cachedPlaylistKey,
  }

  setMeta([entry, ...meta])
  return entry
}

export function getVideoDownloads() {
  return getMeta()
}

export function getVideoDownload(id) {
  return getMeta().find((d) => d.id === id) || null
}

export function removeVideoDownload(id) {
  const meta = getMeta().filter((d) => d.id !== id)
  setMeta(meta)
  if ('caches' in window) {
    caches.open(VIDEO_CACHE).then((cache) => {
      cache.keys().then((keys) => {
        keys.filter((k) => k.url.includes(id) || k.url.includes(`__playlist__${id}`)).forEach((k) => cache.delete(k))
      })
    })
  }
}

export async function getVideoCacheSize(id) {
  if (!('caches' in window)) return 0
  const cache = await caches.open(VIDEO_CACHE)
  const keys = await cache.keys()
  let total = 0
  for (const k of keys) {
    if (k.url.includes(id)) {
      const res = await cache.match(k)
      if (res) total += (await res.clone().arrayBuffer()).byteLength
    }
  }
  return total
}

export async function isVideoCached(id) {
  const meta = getMeta().find((d) => d.id === id)
  if (!meta || !meta.segments?.length) return false
  const cache = await caches.open(VIDEO_CACHE)
  const res = await cache.match(meta.segments[0])
  return !!res
}

export const VIDEO_CACHE_NAME = VIDEO_CACHE
