/**
 * QuickStatusSelect (#101): a compact "change status" dropdown for list rows (Deliveries
 * page). Picking a status saves it at once; only the allowed next statuses are offered
 * (same rules as StatusUpdateControl, and the backend checks them again). Final statuses
 * (Delivered, Cancelled) show nothing to choose.
 */
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUpdateOrderStatus } from "@/hooks/useUpdateOrderStatus"
import { getNextStatuses, STATUS_LABELS } from "@/lib/orderStatus"
import { ServiceError } from "@/services/serviceError"
import type { OrderStatus } from "@/types/order"

export function QuickStatusSelect({ orderId, status }: { orderId: number; status: OrderStatus }) {
  const options = getNextStatuses(status)
  const update = useUpdateOrderStatus()
  if (options.length === 0) return null

  function handleChange(next: string) {
    update.mutate(
      { orderId, status: next as OrderStatus },
      {
        onSuccess: (order) => toast.success(`Order #${order.order_id} is now ${STATUS_LABELS[order.status]}`),
        onError: (error) =>
          toast.error("Status not updated", {
            description: error instanceof ServiceError ? error.message : "Please try again.",
          }),
      },
    )
  }

  return (
    // value="" keeps the placeholder: after saving, the badge shows the new status.
    <Select value="" onValueChange={handleChange} disabled={update.isPending}>
      <SelectTrigger className="h-11 w-full sm:w-48" aria-label={`Change status of order ${orderId}`}>
        {update.isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Saving…
          </span>
        ) : (
          <SelectValue placeholder="Change status" />
        )}
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {STATUS_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
