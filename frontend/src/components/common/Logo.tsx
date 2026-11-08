/**
 * Logo – the DairyCart wordmark used in both layouts.
 * Built from a Lucide icon + text, so there is no external brand artwork to license.
 */
import { Milk } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ subtitle, className }: { subtitle?: string; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Milk className="size-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-base font-extrabold tracking-tight">DairyCart</span>
        {subtitle && <span className="text-xs font-semibold text-muted-foreground">{subtitle}</span>}
      </span>
    </span>
  )
}
