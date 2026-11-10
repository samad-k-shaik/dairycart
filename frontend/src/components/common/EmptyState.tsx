/**
 * EmptyState: the data loaded fine, but there is nothing to show.
 * Always explain why and offer a next step (e.g. "Browse products").
 * (Different from ErrorState: nothing went wrong here.)
 */
import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: ReactNode
  /** Optional call to action, e.g. a <Button asChild><Link …/></Button>. */
  action?: ReactNode
  /** Use "h1" when the empty state is the whole page (e.g. Product not found). */
  headingLevel?: "h1" | "h2"
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, headingLevel = "h2", className }: EmptyStateProps) {
  const Heading = headingLevel
  return (
    <section
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl bg-surface px-4 py-10 text-center shadow-card",
        className,
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-8" aria-hidden="true" />
      </span>
      <Heading className={headingLevel === "h1" ? "text-h1 font-bold" : "text-h2 font-bold"}>{title}</Heading>
      {description && <p className="max-w-sm text-muted-foreground">{description}</p>}
      {action}
    </section>
  )
}
