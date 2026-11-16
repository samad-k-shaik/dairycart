import { Link } from "react-router"
import { Milk } from "lucide-react"

/** DairyCart logo: links to `to` (customer home or admin dashboard). */
export function Logo({ to = "/", label }: { to?: string; label?: string }) {
  return (
    // #55: no aria-label: the link's name is its visible text plus a hidden "home"
    // ("DairyCart Admin home"), so it always contains what is on screen (WCAG 2.5.3).
    <Link to={to} className="flex items-center gap-2 rounded-xl">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Milk className="size-5" aria-hidden="true" />
      </span>
      {/* brand-name: Fraunces on customer pages (#95, see index.css) */}
      <span className="brand-name text-h3 font-extrabold">DairyCart</span>
      {label && (
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-small font-semibold text-primary">{label}</span>
      )}{" "}
      <span className="sr-only">home</span>
    </Link>
  )
}
