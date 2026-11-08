/**
 * PagePlaceholder: stand-in content for screens that later M2 issues will build.
 * Each placeholder page shows its title and which issue replaces it.
 */
import type { ReactNode } from "react"
import { Construction } from "lucide-react"

type PagePlaceholderProps = {
  title: string
  /** e.g. "M2-05 (#24)": the issue that builds the real screen. */
  builtIn: string
  description: string
  /** Optional extra content, e.g. the id read from the URL. */
  children?: ReactNode
}

export function PagePlaceholder({ title, builtIn, description, children }: PagePlaceholderProps) {
  return (
    <section className="space-y-4">
      <h1 className="text-h1 font-bold">{title}</h1>
      <div className="flex gap-3 rounded-2xl border border-dashed bg-surface p-4 shadow-card">
        <Construction className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
        <div className="space-y-1">
          <p>{description}</p>
          <p className="text-small text-muted-foreground">Placeholder · built in {builtIn}</p>
          {children}
        </div>
      </div>
    </section>
  )
}
