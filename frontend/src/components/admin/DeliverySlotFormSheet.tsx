/**
 * DeliverySlotFormSheet: side panel to ADD or EDIT a delivery time slot (#100).
 *
 * - slot = null → "Add delivery slot" (POST /admin/delivery-slots)
 * - slot given → "Edit delivery slot" (PATCH, only the changed fields)
 *
 * Same pattern as ProductFormSheet: checks on Save (lib/deliverySlot.ts), server errors
 * under the field they belong to.
 */
import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useCreateDeliverySlot, useUpdateDeliverySlot } from "@/hooks/useDeliverySlots"
import { useReturnFocus } from "@/hooks/useReturnFocus"
import {
  changedSlotFields,
  EMPTY_SLOT_FORM,
  SLOT_CAPACITY_MAX,
  SLOT_NAME_MAX,
  toSlotFormValues,
  toSlotInput,
  validateSlotForm,
  type SlotFormErrors,
  type SlotFormValues,
} from "@/lib/deliverySlot"
import { ServiceError } from "@/services/serviceError"
import type { AdminDeliverySlot } from "@/types/deliverySlot"

type Props = {
  open: boolean
  /** null = add a new slot; a slot = edit it. */
  slot: AdminDeliverySlot | null
  onClose: () => void
}

export function DeliverySlotFormSheet({ open, slot, onClose }: Props) {
  const returnFocus = useReturnFocus()
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md" {...returnFocus}>
        {open && <SlotForm key={slot?.delivery_slot_id ?? "new"} slot={slot} onDone={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

const FORM_FIELDS = ["name", "start_time", "end_time", "capacity"] as const

function SlotForm({ slot, onDone }: { slot: AdminDeliverySlot | null; onDone: () => void }) {
  const isEdit = slot !== null
  const [values, setValues] = useState<SlotFormValues>(() => (slot ? toSlotFormValues(slot) : EMPTY_SLOT_FORM))
  const [errors, setErrors] = useState<SlotFormErrors>({})
  const [formError, setFormError] = useState("")
  const create = useCreateDeliverySlot()
  const update = useUpdateDeliverySlot()
  const saving = create.isPending || update.isPending

  function setField<K extends keyof SlotFormValues>(field: K, value: SlotFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in errors) setErrors((current) => ({ ...current, [field]: undefined }))
    setFormError("")
  }

  function showServerError(error: Error) {
    if (!(error instanceof ServiceError)) {
      toast.error("Delivery slot not saved", { description: "Please try again." })
      return
    }
    if (error.code === "DELIVERY_SLOT_ALREADY_EXISTS") return setErrors({ start_time: error.message })
    if (error.code === "LAST_ACTIVE_DELIVERY_SLOT") return setFormError(error.message)
    const fieldErrors: SlotFormErrors = {}
    for (const detail of error.body.error.details ?? []) {
      const field = FORM_FIELDS.find((f) => f === detail.field)
      if (field) fieldErrors[field] = detail.issue
    }
    if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors)
    else setFormError(error.message)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validateSlotForm(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    if (!isEdit) {
      create.mutate(toSlotInput(values), {
        onSuccess: (created) => {
          toast.success(`${created.label} added`)
          onDone()
        },
        onError: showServerError,
      })
      return
    }

    const changes = changedSlotFields(slot, values)
    if (Object.keys(changes).length === 0) {
      toast.info("No changes to save")
      onDone()
      return
    }
    update.mutate(
      { slotId: slot.delivery_slot_id, changes },
      {
        onSuccess: (updated) => {
          toast.success(`${updated.label} updated`)
          onDone()
        },
        onError: showServerError,
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col">
      <SheetHeader>
        <SheetTitle className="text-h2 font-bold">{isEdit ? "Edit delivery slot" : "Add delivery slot"}</SheetTitle>
        <SheetDescription>
          {isEdit
            ? "Changes apply to the next deliveries. Orders already created keep their time."
            : "Customers choose a slot when they subscribe."}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-6">
        <Field id="slot-name" label="Name" error={errors.name}>
          <Input
            id="slot-name"
            className="h-11"
            placeholder="e.g. Morning"
            maxLength={SLOT_NAME_MAX}
            value={values.name}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "slot-name-error" : undefined}
            onChange={(e) => setField("name", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="slot-start" label="From" error={errors.start_time}>
            <Input
              id="slot-start"
              type="time"
              className="h-11"
              value={values.start_time}
              aria-invalid={errors.start_time ? true : undefined}
              aria-describedby={errors.start_time ? "slot-start-error" : undefined}
              onChange={(e) => setField("start_time", e.target.value)}
            />
          </Field>
          <Field id="slot-end" label="To" error={errors.end_time}>
            <Input
              id="slot-end"
              type="time"
              className="h-11"
              value={values.end_time}
              aria-invalid={errors.end_time ? true : undefined}
              aria-describedby={errors.end_time ? "slot-end-error" : undefined}
              onChange={(e) => setField("end_time", e.target.value)}
            />
          </Field>
        </div>
        <Field id="slot-capacity" label="Capacity (subscriptions)" error={errors.capacity}>
          <Input
            id="slot-capacity"
            inputMode="numeric"
            className="h-11"
            placeholder="e.g. 50"
            value={values.capacity}
            aria-invalid={errors.capacity ? true : undefined}
            aria-describedby={errors.capacity ? "slot-capacity-error" : "slot-capacity-hint"}
            onChange={(e) => setField("capacity", e.target.value)}
          />
        </Field>
        {!errors.capacity && (
          <p id="slot-capacity-hint" className="-mt-2 text-small text-muted-foreground">
            How many active subscriptions can book this time (1–{SLOT_CAPACITY_MAX}). Lowering it never removes a
            booking.
          </p>
        )}

        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={values.is_active}
            onChange={(e) => setField("is_active", e.target.checked)}
          />
          <span>
            <span className="block font-semibold">Customers can choose it</span>
            <span className="block text-small text-muted-foreground">
              Switched off: hidden from new subscribers. Existing bookings keep it.
            </span>
          </span>
        </label>

        {formError && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-small text-danger">
            {formError}
          </p>
        )}
      </div>

      <SheetFooter className="mt-auto flex-row justify-end border-t">
        <Button type="button" variant="outline" className="h-11" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" className="h-11" disabled={saving}>
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          {isEdit ? "Save changes" : "Add slot"}
        </Button>
      </SheetFooter>
    </form>
  )
}

/** Label + control + error message (the error id is `<id>-error`). */
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-small text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
