/** HeroBanner: the welcome strip at the top of the customer home page. */
import { Truck } from "lucide-react"

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-soft to-surface p-5 shadow-card md:p-8">
      <div className="relative z-10 max-w-md space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-small font-semibold text-primary">
          <Truck className="size-4" aria-hidden="true" />
          Daily morning delivery
        </span>
        <h1 className="text-display font-extrabold">Fresh milk, delivered daily</h1>
        <p className="text-muted-foreground">
          Cow and buffalo milk from local farms. Pick your bottles and we deliver to your door.
        </p>
      </div>
      {/* Decorative only: hidden from screen readers. */}
      <div className="pointer-events-none absolute -right-6 -bottom-6 hidden gap-0 sm:flex" aria-hidden="true">
        <img src="/images/products/cow-milk.svg" alt="" className="size-36 md:size-44" />
        <img src="/images/products/buffalo-milk.svg" alt="" className="-ml-10 size-36 md:size-44" />
      </div>
    </section>
  )
}
