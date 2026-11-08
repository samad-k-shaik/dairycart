/**
 * StatusBadge – a coloured pill showing an order status (design-system.md → Status badge colours).
 *
 *   PLACED → blue · CONFIRMED → indigo · OUT_FOR_DELIVERY → amber
 *   DELIVERED → green · CANCELLED → red
 *
 * Colour alone is not accessible (colour-blind users), so the text label is always shown too.
 */
import { Badge } from '@/components/ui/badge'
import { STATUS_LABELS } from '@/lib/orderStatus'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/order'

const STATUS_STYLES: Record<OrderStatus, string> = {
  PLACED: 'bg-primary-soft text-primary',
  CONFIRMED: 'bg-indigo-50 text-indigo-700',
  OUT_FOR_DELIVERY: 'bg-amber-50 text-amber-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-700',
}

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <Badge className={cn('h-6 px-2.5 font-semibold', STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
