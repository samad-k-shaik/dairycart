/**
 * QuantitySelector: − / value / + with bounds (default 1–20). Reused on the
 * product details page and in the cart (M2-08).
 *
 * Controlled component: the parent owns `value` and passes it in; this component
 * only asks for a new value through `onChange`. It never holds the number itself.
 */
import { Minus, Plus } from "lucide-react"

import { clampQuantity, MAX_QUANTITY, MIN_QUANTITY } from "@/lib/quantity"
import { cn } from "@/lib/utils"

type QuantitySelectorProps = {
  value: number
  onChange: (value: number) => void
  /** Accessible name for the whole control, e.g. "Quantity of Cow Milk 1 Litre". */
  label?: string
  min?: number
  max?: number
  className?: string
}

const buttonClass =
  "flex size-11 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-primary-soft hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"

export function QuantitySelector({
  value,
  onChange,
  label = "Quantity",
  min = MIN_QUANTITY,
  max = MAX_QUANTITY,
  className,
}: QuantitySelectorProps) {
  const change = (next: number) => onChange(Math.min(max, Math.max(min, clampQuantity(next))))

  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center gap-1 rounded-xl border bg-surface p-0.5", className)}
    >
      <button
        type="button"
        className={buttonClass}
        onClick={() => change(value - 1)}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      {/* aria-live: screen readers announce the new number after each change. */}
      <span className="w-8 text-center text-h3 font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={buttonClass}
        onClick={() => change(value + 1)}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
