/** Grey pulsing cards shown while products load (same grid as the real cards). */
export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex animate-pulse flex-col gap-3 rounded-2xl bg-surface p-3 shadow-card">
          <div className="aspect-square rounded-xl bg-muted" />
          <div className="h-5 w-3/4 rounded bg-muted" />
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="flex items-center justify-between">
            <div className="h-6 w-1/3 rounded bg-muted" />
            <div className="size-11 rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
