/**
 * HeroBanner – the welcome banner at the top of the home page (#24).
 * Pure presentation: no data, no state. Uses the "Display" text style
 * (28/36px, weight 800) from the design system.
 */
import { Truck } from 'lucide-react'

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-primary px-5 py-6 text-primary-foreground shadow-card sm:px-8 sm:py-10">
      {/* Decorative circles; aria-hidden so screen readers skip them. */}
      <div aria-hidden="true" className="absolute -top-16 -right-10 size-56 rounded-full bg-white/10" />
      <div aria-hidden="true" className="absolute -bottom-20 right-24 size-40 rounded-full bg-white/10" />

      <div className="relative flex items-center gap-4">
        <div className="max-w-md flex-1">
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Truck className="size-3.5" aria-hidden="true" />
            Morning delivery · Cash on delivery
          </p>
          <h1 className="text-[28px]/9 font-extrabold tracking-tight">Fresh milk, delivered to your door</h1>
          <p className="mt-2 text-white/85">Pure cow and buffalo milk from local farms. Order today, enjoy tomorrow.</p>
        </div>
        <div className="hidden shrink-0 items-end sm:flex" aria-hidden="true">
          <img src="/images/products/cow-milk.svg" alt="" className="size-28 rounded-2xl shadow-lg ring-4 ring-white/25 md:size-36" />
          <img src="/images/products/buffalo-milk.svg" alt="" className="-ml-6 size-24 rounded-2xl shadow-lg ring-4 ring-white/25 md:size-28" />
        </div>
      </div>
    </section>
  )
}
