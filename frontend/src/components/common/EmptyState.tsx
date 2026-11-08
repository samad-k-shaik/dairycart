/**
 * EmptyState – shown when a request succeeded but there is nothing to show (#32).
 * e.g. empty cart, no orders for a phone number, no orders with a status filter.
 *
 * A friendly empty state tells the user WHY it is empty and WHAT to do next
 * (the optional `action`, such as a "Browse products" button).
 */
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-7" aria-hidden="true" />
      </div>
      <h2 className="text-base font-bold">{title}</h2>
      {description && <p className="max-w-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
