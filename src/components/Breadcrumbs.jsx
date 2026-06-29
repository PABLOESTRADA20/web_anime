import { Link } from 'react-router-dom'

export default function Breadcrumbs({ items, className = '' }) {
  if (!items?.length) return null
  return (
    <nav aria-label="breadcrumb" className={`flex items-center gap-1.5 text-xs text-text-secondary/60 mb-4 ${className}`}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <Chevron />}
            {isLast || !item.href ? (
              <span className={isLast ? 'text-text-primary/80' : ''}>{item.label}</span>
            ) : (
              <Link to={item.href} className="hover:text-text-primary transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}

function Chevron() {
  return (
    <svg
      className="w-3 h-3 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}
