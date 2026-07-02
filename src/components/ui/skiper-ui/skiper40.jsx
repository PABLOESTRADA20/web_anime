import { Link } from 'react-router-dom'
import { cn } from '../../../lib/utils'

const ArrowIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M1.004 9.166 9.337.833m0 0v8.333m0-8.333H1.004"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const Link000 = ({ children, to, className }) => (
  <Link
    to={to}
    className={cn(
      'group relative inline-flex items-center',
      'before:pointer-events-none before:absolute before:bottom-0 before:left-0 before:h-[0.05em] before:w-full before:bg-current before:content-[""]',
      'before:origin-right before:scale-x-0 before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.4,0,0.2,1)]',
      'hover:before:origin-left hover:before:scale-x-100',
      className,
    )}>
    {children}
  </Link>
)

const Link001 = ({ children, href, className }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={cn(
      'group relative inline-flex items-center',
      'before:pointer-events-none before:absolute before:left-0 before:top-[1.5em] before:h-[0.05em] before:w-full before:bg-current before:content-[""]',
      'before:origin-right before:scale-x-0 before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.4,0,0.2,1)]',
      'hover:before:origin-left hover:before:scale-x-100',
      className,
    )}>
    {children}
    <ArrowIcon className="ml-[0.3em] size-[0.55em] translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100" />
  </a>
)

const Link002 = ({ children, href, className }) => (
  <a
    href={href}
    className={cn(
      'group relative inline-flex items-center',
      'before:pointer-events-none before:absolute before:left-0 before:top-[1.5em] before:h-[0.05em] before:w-full before:bg-current before:content-[""]',
      'before:origin-left before:scale-x-0 before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.4,0,0.2,1)]',
      'hover:before:origin-right hover:before:scale-x-100',
      className,
    )}>
    {children}
    <ArrowIcon className="ml-[0.3em] size-[0.55em] translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100" />
  </a>
)

const Link003 = ({ children, href, className }) => (
  <a
    href={href}
    className={cn(
      'group relative inline-flex items-center',
      'before:pointer-events-none before:absolute before:left-0 before:top-[1.5em] before:h-[0.05em] before:w-full before:bg-current before:content-[""]',
      'before:origin-center before:scale-x-0 before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.4,0,0.2,1)]',
      'hover:before:scale-x-100',
      className,
    )}>
    {children}
    <ArrowIcon className="ml-[0.3em] size-[0.55em] translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100" />
  </a>
)

const Link004 = ({ children, href, className }) => (
  <a
    href={href}
    className={cn(
      'group relative inline-flex items-center',
      'before:pointer-events-none before:absolute before:left-0 before:w-full before:bg-white before:content-[""]',
      'before:origin-right before:scale-x-0 before:transition-all before:duration-300 before:ease-[cubic-bezier(0.4,0,0.2,1)]',
      'before:origin-center before:z-1 px-2 before:h-0 before:scale-x-100 before:mix-blend-difference',
      'hover:before:h-[1.4em]',
      className,
    )}>
    {children}
    <ArrowIcon className="z-0 ml-[0.6em] size-[0.55em] translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:rotate-45 group-hover:opacity-100" />
  </a>
)

const Link005 = ({ children, href, className }) => (
  <a
    href={href}
    className={cn(
      'group relative inline-flex items-center',
      'before:pointer-events-none before:absolute before:left-0 before:w-full before:bg-white before:content-[""]',
      'before:scale-x-1 before:transition-all before:duration-300 before:ease-[cubic-bezier(0.4,0,0.2,1)]',
      'before:origin-left before:z-1 px-2 before:h-full before:scale-x-0 before:mix-blend-difference',
      'hover:before:scale-x-100',
      className,
    )}>
    {children}
    <ArrowIcon className="z-0 ml-[0.6em] size-[0.55em] -translate-x-1 rotate-45 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
  </a>
)

export { Link000, Link001, Link002, Link003, Link004, Link005 }
