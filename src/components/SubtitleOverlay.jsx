import { useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import { parseSubtitles, findCurrentSubtitle } from '../utils/subtitleParser'

const FONT_SIZE_CLASSES = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
}

export function SubtitleOverlay({
  subtitleUrl,
  currentTime = 0,
  offset = 0,
  fontSize = 'lg',
  position = 'bottom',
  enableTransitions = true,
}) {
  const [subtitles, setSubtitles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!subtitleUrl) {
      setSubtitles([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    fetch(subtitleUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch: ${r.status}`)
        return r.text()
      })
      .then((text) => {
        try {
          const parsed = parseSubtitles(text)
          setSubtitles(parsed)
        } catch {
          setError('Error parsing subtitles')
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Subtitle error:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [subtitleUrl])

  if (loading || error || subtitles.length === 0) return null

  const adjustedTime = currentTime - offset
  const currentSub = findCurrentSubtitle(subtitles, adjustedTime)
  if (!currentSub) return null

  const fontSizeClass = FONT_SIZE_CLASSES[fontSize] || 'text-lg'
  const positionClass = position === 'top' ? 'top-4 sm:top-6' : 'bottom-16 sm:bottom-20'
  const transitionClass = enableTransitions ? 'transition-opacity duration-200' : ''

  return (
    <div
      className={`absolute left-0 right-0 ${positionClass} text-center text-white font-medium pointer-events-none z-10 ${transitionClass}`}>
      <div
        className={`${fontSizeClass} bg-black/70 px-3 py-2 rounded inline-block max-w-4xl mx-auto break-words`}
        style={{
          textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 3px rgba(0,0,0,0.6)',
          WebkitTextStroke: '0.5px rgba(0,0,0,0.5)',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          lineHeight: '1.4',
        }}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentSub.text.replace(/\n/g, '<br/>')) }}
      />
    </div>
  )
}
