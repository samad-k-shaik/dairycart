/**
 * StatusUpdateControl – lets the admin move an order to its next status (#31, FR-A4).
 *
 * The dropdown ONLY lists statuses allowed by ALLOWED_TRANSITIONS
 * (src/lib/orderStatus.ts). For final statuses (DELIVERED, CANCELLED) no
 * control is shown at all. The backend checks the rule again (409 if broken),
 * and that error message is shown in a toast.
 *
 * A native <select> is used on purpose: it is accessible, keyboard friendly and
 * uses the phone's own picker on mobile, with no extra library.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useUpdateOrderStatus } from '@/hooks/useAdminOrders'
import { formatOrderId } from '@/lib/format'
import { getNextStatuses, STATUS_LABELS } from '@/lib/orderStatus'
import { getErrorMessage } from '@/services/apiError'
import type { OrderStatus } from '@/types/order'

interface StatusUpdateControlProps {
  orderId: number
  status: OrderStatus
}

export function StatusUpdateControl({ orderId, status }: StatusUpdateControlProps) {
  const nextStatuses = getNextStatuses(status)
  const [selected, setSelected] = useState<OrderStatus | ''>('')
  const updateStatus = useUpdateOrderStatus()

  if (nextStatuses.length === 0) {
    return (
      <p className="rounded-xl bg-muted px-3 py-2 text-muted-foreground">
        {STATUS_LABELS[status]} is a final status. It cannot be changed.
      </p>
    )
  }

  function handleUpdate() {
    if (!selected) return
    updateStatus.mutate(
      { orderId, status: selected },
      {
        onSuccess: (order) => {
          toast.success(`Order ${formatOrderId(orderId)} is now ${STATUS_LABELS[order.status]}`)
          setSelected('') // the options change after an update, so reset the choice
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  const selectId = `status-${orderId}`
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={selectId}>Change status</Label>
      <div className="flex gap-2">
        <select
          id={selectId}
          value={selected}
          onChange={(event) => setSelected(event.target.value as OrderStatus | '')}
          className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-surface px-3 font-medium focus-visible:outline-2 focus-visible:outline-primary"
        >
          <option value="">Select next status…</option>
          {nextStatuses.map((next) => (
            <option key={next} value={next}>
              {STATUS_LABELS[next]}
            </option>
          ))}
        </select>
        <Button onClick={handleUpdate} disabled={!selected || updateStatus.isPending}>
          {updateStatus.isPending ? 'Updating…' : 'Update'}
        </Button>
      </div>
    </div>
  )
}
