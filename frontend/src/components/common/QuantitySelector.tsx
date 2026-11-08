/**
 * QuantitySelector:  [ − ]  3  [ + ]   (#25, FR-C3)
 *
 * A CONTROLLED component: it does not store the quantity itself. The parent
 * passes `value` and receives changes through `onChange`. That way the same
 * selector works on the product page (local state) and in the cart (cart state).
 *
 * Rules: quantity stays between 1 and 20. "−" is disabled at 1 and "+" at 20,
 * so an out-of-range value can never be chosen. Buttons are 44px (touch friendly)
 * and have aria-labels so screen readers announce "Decrease quantity".
 */
import { Minus, Plus } from 'lucide-react'
import { MAX_QUANTITY, MIN_QUANTITY } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface QuantitySelectorProps {
  value: number
  onChange: (quantity: number) => void
  /** Used in aria-labels, e.g. "Decrease quantity of Cow Milk 1 Litre". */
  label?: string
  size?: 'default' | 'sm'
  className?: string
}

export function QuantitySelector({ value, onChange, label, size = 'default', className }: QuantitySelectorProps) {
  const atMin = value <= MIN_QUANTITY
  const atMax = value >= MAX_QUANTITY
  const suffix = label ? ` of ${label}` : ''
  const buttonSize = size === 'sm' ? 'size-9' : 'size-11' // 44px by default

  const buttonClass = cn(
    'flex items-center justify-center rounded-full bg-surface text-foreground transition-colors',
    'hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-primary',
    'disabled:pointer-events-none disabled:opacity-40',
    buttonSize,
  )

  return (
    <div
      className={cn('inline-flex items-center gap-1 rounded-full border border-border bg-background p-1', className)}
      role="group"
      aria-label={`Quantity${suffix}`}
    >
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(value - 1)}
        disabled={atMin}
        aria-label={`Decrease quantity${suffix}`}
      >
        <Minus className="size-4" />
      </button>
      {/* aria-live: screen readers announce the new number when it changes. */}
      <span className="min-w-8 text-center text-base font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(value + 1)}
        disabled={atMax}
        aria-label={`Increase quantity${suffix}`}
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}
