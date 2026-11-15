/**
 * Route: `/admin/delivery-slots` (#100). The delivery times subscribers can choose.
 *
 * The admin adds, edits, switches off and deletes slots. Each row shows the capacity and
 * how many ACTIVE subscriptions booked it. A booked slot cannot be deleted (switch it off
 * instead), and the last active slot cannot be switched off or deleted: the backend
 * refuses and the message is shown here.
 */
import { useState } from "react"
import { Clock, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { DeliverySlotFormSheet } from "@/components/admin/DeliverySlotFormSheet"
import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminDeliverySlots, useDeleteDeliverySlot } from "@/hooks/useDeliverySlots"
import { useReturnFocus } from "@/hooks/useReturnFocus"
import { slotTimeRange } from "@/lib/deliverySlot"
import { cn } from "@/lib/utils"
import { ServiceError } from "@/services/serviceError"
import type { AdminDeliverySlot } from "@/types/deliverySlot"

type FormState = { open: false } | { open: true; slot: AdminDeliverySlot | null }

function DeliverySlotsPage() {
  const query = useAdminDeliverySlots()
  const [form, setForm] = useState<FormState>({ open: false })
  const [toDelete, setToDelete] = useState<AdminDeliverySlot | null>(null)
  const openAdd = () => setForm({ open: true, slot: null })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-h1 font-bold">Delivery slots</h1>
          <p className="text-muted-foreground">
            The delivery times subscribers can choose. Capacity = how many active subscriptions a slot can take.
          </p>
        </div>
        <Button className="h-11" onClick={openAdd}>
          <Plus aria-hidden="true" />
          Add slot
        </Button>
      </div>

      {query.isPending ? (
        <div className="space-y-2 rounded-2xl bg-surface p-4 shadow-card" aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title="We could not load the delivery slots"
          error={query.error}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No delivery slots"
          description="Add a slot so customers can subscribe."
          action={
            <Button className="h-11" onClick={openAdd}>
              <Plus aria-hidden="true" />
              Add slot
            </Button>
          }
        />
      ) : (
        <div className="rounded-2xl bg-surface p-2 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slot</TableHead>
                <TableHead className="text-right">Booked</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.map((slot) => (
                <TableRow key={slot.delivery_slot_id}>
                  <TableCell className={slot.is_active ? undefined : "opacity-70"}>
                    <p className="font-semibold">{slot.name}</p>
                    <p className="text-small text-muted-foreground">{slotTimeRange(slot)}</p>
                    <StatusBadge slot={slot} className="mt-1 sm:hidden" />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn("font-semibold", slot.is_full && "text-danger")}>
                      {slot.booked} / {slot.capacity}
                    </span>
                    {slot.is_full && <span className="block text-xs text-danger">Full</span>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <StatusBadge slot={slot} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Edit ${slot.label}`}
                        onClick={() => setForm({ open: true, slot })}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Delete ${slot.label}`}
                        onClick={() => setToDelete(slot)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DeliverySlotFormSheet
        open={form.open}
        slot={form.open ? form.slot : null}
        onClose={() => setForm({ open: false })}
      />
      <DeleteSlotDialog slot={toDelete} onClose={() => setToDelete(null)} />
    </div>
  )
}

function StatusBadge({ slot, className }: { slot: AdminDeliverySlot; className?: string }) {
  return slot.is_active ? (
    <Badge className={cn("bg-green-50 font-semibold text-green-700", className)}>On</Badge>
  ) : (
    <Badge className={cn("bg-muted font-semibold text-muted-foreground", className)}>Off</Badge>
  )
}

/** "Delete this slot?" The backend refuses a booked slot or the last active one. */
function DeleteSlotDialog({ slot, onClose }: { slot: AdminDeliverySlot | null; onClose: () => void }) {
  const returnFocus = useReturnFocus()
  const remove = useDeleteDeliverySlot()

  function close() {
    remove.reset()
    onClose()
  }

  function handleConfirm() {
    if (!slot) return
    remove.mutate(slot.delivery_slot_id, {
      onSuccess: () => {
        toast.success(`${slot.label} deleted`)
        close()
      },
    })
  }

  return (
    <AlertDialog open={slot !== null} onOpenChange={(open) => !open && close()}>
      <AlertDialogContent {...returnFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this delivery slot?</AlertDialogTitle>
          <AlertDialogDescription>
            {slot?.label}. Only a slot that was never booked can be deleted; otherwise switch it off instead.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {remove.isError && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-small text-danger">
            {remove.error instanceof ServiceError ? remove.error.message : "Please try again."}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11" disabled={remove.isPending}>
            Keep it
          </AlertDialogCancel>
          <Button variant="destructive" className="h-11" onClick={handleConfirm} disabled={remove.isPending}>
            {remove.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeliverySlotsPage
