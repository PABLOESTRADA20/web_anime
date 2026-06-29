function parseTimestamp(str) {
  const [time, ms] = str.split('.')
  const [hours, minutes, seconds] = time.split(':')
  return parseInt(hours || 0) * 3600 + parseInt(minutes || 0) * 60 + parseInt(seconds || 0) + parseInt(ms || 0) / 1000
}

const ALLOWED_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 'small', 'br'])

function sanitizeHTML(text) {
  return text.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match) => {
    const tagName = match.match(/<\/?([a-z][a-z0-9]*)/i)?.[1]?.toLowerCase()
    return ALLOWED_TAGS.has(tagName) ? match : ''
  })
}

function parseTimingLine(line) {
  const regex = /^(\d{1,2}:)?(\d{1,2}):(\d{1,2})\.(\d{1,3})\s*-->\s*(\d{1,2}:)?(\d{1,2}):(\d{1,2})\.(\d{1,3})/
  const match = line.match(regex)
  if (!match) return null

  const [, ...groups] = match
  const startStr = `${groups[0] || '0:'}${groups[1]}:${groups[2]}.${groups[3]}`
  const endStr = `${groups[4] || '0:'}${groups[5]}:${groups[6]}.${groups[7]}`

  return {
    startStr: startStr.replace(/^0:/, ''),
    endStr: endStr.replace(/^0:/, ''),
  }
}

function parseSubtitlesCommon(text) {
  const lines = text.split('\n')
  const subtitles = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    if (line.includes('-->')) {
      const timing = parseTimingLine(line)
      if (!timing) {
        i++
        continue
      }

      const startTime = parseTimestamp(timing.startStr)
      const endTime = parseTimestamp(timing.endStr)

      i++
      const textLines = []
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i])
        i++
      }

      const text = textLines.join('\n').trim()
      if (text && !text.startsWith('NOTE')) {
        subtitles.push({
          startTime,
          endTime,
          text: sanitizeHTML(text),
          duration: endTime - startTime,
        })
      }
    }
    i++
  }

  return subtitles
}

export function parseVTT(vttText) {
  const text = vttText.trim()
  if (text.startsWith('WEBVTT')) {
    const headerEnd = text.indexOf('\n\n')
    const body = headerEnd >= 0 ? text.slice(headerEnd + 2) : text
    return parseSubtitlesCommon(body)
  }
  return parseSubtitlesCommon(text)
}

export function parseSRT(srtText) {
  const lines = srtText.split('\n')
  const subtitles = []
  let i = 0

  while (i < lines.length) {
    if (/^\d+$/.test(lines[i].trim())) {
      i++
      const line = lines[i]?.trim()
      if (line && line.includes('-->')) {
        const timing = parseTimingLine(line)
        if (!timing) {
          i++
          continue
        }

        const startTime = parseTimestamp(timing.startStr)
        const endTime = parseTimestamp(timing.endStr)

        i++
        const textLines = []
        while (i < lines.length && lines[i].trim() !== '') {
          textLines.push(lines[i])
          i++
        }

        const text = textLines.join('\n').trim()
        if (text) {
          subtitles.push({ startTime, endTime, text: sanitizeHTML(text), duration: endTime - startTime })
        }
      }
    }
    i++
  }

  return subtitles
}

export function autoDetectFormat(text) {
  return text.trim().startsWith('WEBVTT') ? 'vtt' : 'srt'
}

export function parseSubtitles(text) {
  const format = autoDetectFormat(text)
  return format === 'vtt' ? parseVTT(text) : parseSRT(text)
}

export function findCurrentSubtitle(subtitles, currentTime) {
  let left = 0
  let right = subtitles.length - 1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const sub = subtitles[mid]

    if (currentTime < sub.startTime) {
      right = mid - 1
    } else if (currentTime > sub.endTime) {
      left = mid + 1
    } else {
      return sub
    }
  }

  return null
}
