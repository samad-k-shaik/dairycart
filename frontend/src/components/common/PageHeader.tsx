/**
 * PageHeader – the title block at the top of each page (H1 + optional description/actions).
 * Keeps page titles identical in size and spacing everywhere (design-system.md → H1 24/32px, 700).
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h1 className="text-2xl/8 font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  )
}
