/**
 * StatusBadge: an order status with the design-system colours
 * (docs/06-ui-ux/design-system.md → Status badge colours).
 */
import { Badge } from "@/components/ui/badge"
import { STATUS_LABELS } from "@/lib/orderStatus"
import { cn } from "@/lib/utils"
import type { OrderStatus } from "@/types/order"

const STATUS_CLASSES: Record<OrderStatus, string> = {
  PLACED: "bg-primary-soft text-primary",
  CONFIRMED: "bg-indigo-50 text-indigo-700",
  OUT_FOR_DELIVERY: "bg-amber-50 text-amber-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
}

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <Badge className={cn("font-semibold", STATUS_CLASSES[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
