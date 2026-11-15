/**
 * CategoryChips: All / Cow / Buffalo filter for the product grid.
 * A "controlled component": the parent owns the selected value and passes it in;
 * the chips only report clicks through onChange.
 */
import { CATEGORIES, type CategoryId } from "@/lib/productDisplay"
import { cn } from "@/lib/utils"

type CategoryChipsProps = {
  value: CategoryId
  onChange: (category: CategoryId) => void
}

export function CategoryChips({ value, onChange }: CategoryChipsProps) {
  return (
    <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
      {CATEGORIES.map((category) => {
        const selected = category.id === value
        return (
          <button
            key={category.id}
            type="button"
            // aria-pressed tells screen readers which chip is selected.
            aria-pressed={selected}
            onClick={() => onChange(category.id)}
            className={cn(
              "h-11 rounded-full px-5 font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
              selected
                ? "bg-primary text-primary-foreground"
                : "border bg-surface text-foreground hover:bg-primary-soft hover:text-primary",
            )}
          >
            {category.label}
          </button>
        )
      })}
    </div>
  )
}
