import { useState, useEffect } from 'react'

export default function SafeImage({ src, alt, className, fallbackText, loading = 'lazy', ...rest }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-surface text-text-secondary/40 ${className || ''}`}>
        <span className="text-xs p-2 text-center line-clamp-2">{fallbackText || alt || ''}</span>
      </div>
    )
  }

  return <img src={src} alt={alt} loading={loading} className={className} onError={() => setFailed(true)} {...rest} />
}
