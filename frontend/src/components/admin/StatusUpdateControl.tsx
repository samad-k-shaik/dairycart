/**
 * StatusUpdateControl: dropdown offering ONLY the allowed next statuses
 * (from ALLOWED_TRANSITIONS), plus an Update button. Final statuses show a note instead.
 * The backend also enforces the rules; this restriction is for usability.
 */
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUpdateOrderStatus } from "@/hooks/useUpdateOrderStatus"
import { getNextStatuses, STATUS_LABELS } from "@/lib/orderStatus"
import { ServiceError } from "@/services/serviceError"
import type { OrderStatus } from "@/types/order"

export function StatusUpdateControl({ orderId, status }: { orderId: number; status: OrderStatus }) {
  const options = getNextStatuses(status)
  const [next, setNext] = useState<OrderStatus | "">("")
  const update = useUpdateOrderStatus()

  if (options.length === 0) {
    return (
      <p className="rounded-xl bg-muted p-3 text-small text-muted-foreground">
        This order is {STATUS_LABELS[status].toLowerCase()}. It is final and cannot be changed.
      </p>
    )
  }

  function handleUpdate() {
    if (!next) return
    update.mutate(
      { orderId, status: next },
      {
        onSuccess: (order) => {
          toast.success(`Order #${order.order_id} is now ${STATUS_LABELS[order.status]}`)
          setNext("")
        },
        onError: (error) => {
          toast.error("Status not updated", {
            description: error instanceof ServiceError ? error.message : "Please try again.",
          })
        },
      },
    )
  }

  const selectId = `status-select-${orderId}`
  return (
    <div className="space-y-2">
      <Label htmlFor={selectId}>Change status</Label>
      <div className="flex flex-wrap gap-2">
        <Select value={next} onValueChange={(value) => setNext(value as OrderStatus)}>
          <SelectTrigger id={selectId} className="h-11 min-w-48 flex-1">
            <SelectValue placeholder="Choose next status" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {STATUS_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="h-11" onClick={handleUpdate} disabled={!next || update.isPending}>
          {update.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Update
        </Button>
      </div>
    </div>
  )
}
