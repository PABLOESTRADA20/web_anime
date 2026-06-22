export function AnimeCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-surface relative">
      <div className="aspect-[3/4] relative overflow-hidden">
        <div className="absolute inset-0 bg-surface-hover" />
        <div className="absolute inset-0 shimmer" />
      </div>
      <div className="p-3 space-y-2">
        <div className="h-3 bg-surface-hover rounded w-3/4 relative overflow-hidden">
          <div className="absolute inset-0 shimmer" />
        </div>
        <div className="h-3 bg-surface-hover rounded w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 shimmer" />
        </div>
      </div>
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
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
    <div className="space-y-6">
      <div className="h-[200px] sm:h-[300px] bg-surface-hover rounded-2xl relative overflow-hidden">
        <div className="absolute inset-0 shimmer" />
      </div>
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-[200px] h-[300px] bg-surface-hover rounded-2xl mx-auto sm:mx-0 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 shimmer" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="h-8 bg-surface-hover rounded w-2/3 relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
          </div>
          <div className="h-4 bg-surface-hover rounded w-full relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
          </div>
          <div className="h-4 bg-surface-hover rounded w-full relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
          </div>
          <div className="h-4 bg-surface-hover rounded w-3/4 relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
          </div>
        </div>
      </div>
    </div>
  )
}
