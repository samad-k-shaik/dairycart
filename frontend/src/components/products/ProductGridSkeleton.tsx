/** Skeleton cards shown while products load (same grid and shapes as the real cards). */
import { Skeleton } from "@/components/ui/skeleton"

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-2xl bg-surface p-3 shadow-card">
          <Skeleton className="aspect-square rounded-xl" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="size-11 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
