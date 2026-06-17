export function AnimeCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-surface">
      <div className="aspect-[3/4] relative overflow-hidden">
        <div className="absolute inset-0" style={{background: 'linear-gradient(90deg, transparent 0%, rgba(0,240,255,0.05) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 2s infinite'}} />
        <div className="absolute inset-0 bg-surface-hover" />
      </div>
      <div className="p-3 space-y-2">
        <div className="h-3 bg-surface-hover rounded w-3/4" />
        <div className="h-3 bg-surface-hover rounded w-1/2" />
      </div>
    </div>
  )
}

export function GridSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <AnimeCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-[300px] bg-surface-hover rounded-2xl" />
      <div className="space-y-3 max-w-3xl">
        <div className="h-8 bg-surface-hover rounded w-2/3" />
        <div className="h-4 bg-surface-hover rounded w-full" />
        <div className="h-4 bg-surface-hover rounded w-full" />
        <div className="h-4 bg-surface-hover rounded w-3/4" />
      </div>
    </div>
  )
}
