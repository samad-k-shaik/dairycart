/**
 * CategoryChips – "All · Cow · Buffalo" filter pills on the home page (#24).
 * Controlled component: the page owns the selected value and filters the grid.
 * `aria-pressed` tells screen readers which chip is currently selected.
 */
import { cn } from '@/lib/utils'
import type { ProductCategory } from '@/types/product'

export type CategoryFilter = 'all' | ProductCategory

const CHIPS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'cow', label: 'Cow milk' },
  { value: 'buffalo', label: 'Buffalo milk' },
]

interface CategoryChipsProps {
  value: CategoryFilter
  onChange: (value: CategoryFilter) => void
}

export function CategoryChips({ value, onChange }: CategoryChipsProps) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Filter by milk type">
      {CHIPS.map((chip) => {
        const selected = chip.value === value
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(chip.value)}
            className={cn(
              'h-10 rounded-full border px-4 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary',
              selected
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border bg-surface text-muted-foreground hover:text-foreground',
            )}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}
