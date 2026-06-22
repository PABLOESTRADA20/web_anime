const variants = {
  default: 'bg-gradient-to-t from-neutral-200 to-white',
  pink: 'bg-gradient-to-t from-primary to-primary/60 dark:from-primary dark:to-primary/60',
  cyan: 'bg-gradient-to-t from-neon-cyan to-cyan-300',
  accent: 'bg-gradient-to-t from-accent to-accent/70',
  muted: 'bg-gradient-to-t from-text-secondary to-text-secondary/60',
}

const sizes = {
  xs: 'text-lg sm:text-xl lg:text-2xl',
  sm: 'text-xl sm:text-2xl lg:text-3xl',
  md: 'text-2xl sm:text-3xl lg:text-4xl',
  lg: 'text-3xl sm:text-4xl lg:text-5xl',
  xl: 'text-4xl sm:text-5xl lg:text-6xl',
}

export default function GradientHeading({ children, variant = 'pink', size = 'md', as: Tag = 'h2', className = '' }) {
  return (
    <Tag className={`${className} tracking-tight font-heading font-bold`}>
      <span className={`text-gradient ${variants[variant]} ${sizes[size]}`}>
        {children}
      </span>
    </Tag>
  )
}
