export function FlagJP({ className = 'w-12 h-8' }) {
  return (
    <svg viewBox="0 0 120 80" className={className}>
      <rect width="120" height="80" fill="#fff" rx="4" />
      <circle cx="60" cy="40" r="22" fill="#bc002d" />
    </svg>
  )
}

export function FlagUS({ className = 'w-12 h-8' }) {
  return (
    <svg viewBox="0 0 120 80" className={className}>
      <rect width="120" height="80" fill="#fff" rx="4" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} x="0" y={i * 6.15} width="120" height="6.15" fill="#b22234" />
      ))}
      <rect x="0" y="0" width="50" height="43" fill="#3c3b6e" />
      {Array.from({ length: 9 }).map((_, row) =>
        Array.from({ length: row % 2 === 0 ? 6 : 5 }).map((_, col) => (
          <circle key={`${row}-${col}`} cx={4.5 + col * (row % 2 === 0 ? 8.2 : 9.8)} cy={2.5 + row * 4.8} r="1.2" fill="#fff" />
        )),
      )}
    </svg>
  )
}

export function FlagES({ className = 'w-12 h-8' }) {
  return (
    <svg viewBox="0 0 120 80" className={className}>
      <rect width="120" height="80" fill="#c60b1e" rx="4" />
      <rect y="20" width="120" height="40" fill="#ffc400" />
    </svg>
  )
}

export function FlagMX({ className = 'w-12 h-8' }) {
  return (
    <svg viewBox="0 0 120 80" className={className}>
      <rect width="40" height="80" fill="#006341" rx="4" />
      <rect x="40" width="40" height="80" fill="#fff" />
      <rect x="80" width="40" height="80" fill="#ce1126" />
      <ellipse cx="60" cy="44" rx="7" ry="9" fill="#8B4513" />
      <path d="M55 42 L60 32 L65 42 L60 38Z" fill="#D4A843" />
      <path d="M56 44 L60 36 L64 44Z" fill="#D4A843" />
    </svg>
  )
}

export const FLAG_MAP = {
  JP: FlagJP,
  US: FlagUS,
  ES: FlagES,
  MX: FlagMX,
}
