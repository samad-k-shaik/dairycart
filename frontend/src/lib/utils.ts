/**
 * cn() – combine CSS class names safely.
 *
 * WHY: components often build their class list from pieces, e.g.
 *   cn('px-4 py-2', isActive && 'bg-primary', props.className)
 *
 * - `clsx` drops falsy values (false, undefined, '') so conditions read naturally.
 * - `twMerge` resolves Tailwind conflicts: cn('px-4', 'px-2') → 'px-2'
 *   (the last one wins), so a parent can override a component's default styles.
 *
 * Every shadcn/ui component in `src/components/ui/` uses this helper.
 */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
