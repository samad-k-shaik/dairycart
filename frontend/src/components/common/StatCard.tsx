/** StatCard: an icon, a label and a big number. Reused for every dashboard figure. */
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type StatCardProps = {
  label: string
  value: number
  icon: LucideIcon
  /** Classes for the icon circle, e.g. the status badge colours. */
  iconClassName?: string
  hint?: string
}

export function StatCard({ label, value, icon: Icon, iconClassName, hint }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-card">
      <span
        className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary", iconClassName)}
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-small font-semibold text-muted-foreground">{label}</p>
        <p className="text-h1 font-extrabold tabular-nums">{value}</p>
        {hint && <p className="text-small text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}
