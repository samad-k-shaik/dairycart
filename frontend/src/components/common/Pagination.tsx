/**
 * Pagination – "Showing 1–20 of 45   [Previous] [Next]" (#31, FR-A2).
 * Pure UI: the parent owns the current page (stored in the URL) and passes onPageChange.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <nav className="flex items-center justify-between gap-3 pt-4" aria-label="Pagination">
      <p className="text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{first}–{last}</span> of{' '}
        <span className="font-semibold text-foreground">{total}</span>
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft aria-hidden="true" />
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          Next
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
