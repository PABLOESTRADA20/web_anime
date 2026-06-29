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

function ShimmerBlock({ className }) {
  return (
    <div className={`bg-surface-hover rounded relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 shimmer" />
    </div>
  )
}

export function ScheduleSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface">
          <ShimmerBlock className="w-10 h-14 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <ShimmerBlock className="h-3 w-3/4" />
            <ShimmerBlock className="h-2 w-1/4" />
          </div>
          <div className="text-right space-y-1.5 shrink-0">
            <ShimmerBlock className="h-3 w-16" />
            <ShimmerBlock className="h-2 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-surface rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-4">
          <ShimmerBlock className="w-16 h-16 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <ShimmerBlock className="h-5 w-40" />
            <ShimmerBlock className="h-3 w-60" />
            <ShimmerBlock className="h-3 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="text-center p-2 rounded-xl bg-surface-hover space-y-1">
              <ShimmerBlock className="h-5 w-8 mx-auto" />
              <ShimmerBlock className="h-2 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-surface/50 border border-white/5 space-y-2">
            <div className="flex items-center gap-2">
              <ShimmerBlock className="w-6 h-6 rounded-full" />
              <ShimmerBlock className="h-3 w-20" />
              <ShimmerBlock className="h-2 w-12" />
            </div>
            <ShimmerBlock className="h-3 w-full" />
            <ShimmerBlock className="h-3 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 rounded-2xl bg-surface/50 border border-white/5 space-y-2">
          <div className="flex items-center gap-2">
            <ShimmerBlock className="w-6 h-6 rounded-full" />
            <ShimmerBlock className="h-3 w-24" />
            <ShimmerBlock className="h-2 w-10" />
            <ShimmerBlock className="h-3 w-8 ml-auto" />
          </div>
          <ShimmerBlock className="h-3 w-full" />
          <ShimmerBlock className="h-3 w-5/6" />
          <ShimmerBlock className="h-3 w-2/3" />
        </div>
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
