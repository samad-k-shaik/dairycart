/**
 * StatCard – one number on the admin dashboard (#30, FR-A1), e.g. "Today's orders: 3".
 * Reusable: the dashboard renders one per metric instead of repeating markup.
 */
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  /** Tailwind classes for the icon bubble, e.g. status colours. */
  tone?: string
}

export function StatCard({ label, value, icon: Icon, tone = 'bg-primary-soft text-primary' }: StatCardProps) {
  return (
    <Card className="flex-row items-center gap-4 px-4">
      <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', tone)}>
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="text-2xl/8 font-extrabold tabular-nums">{value}</p>
      </div>
    </Card>
  )
}
