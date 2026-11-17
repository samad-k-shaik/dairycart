/**
 * DeliveryBoyFormSheet (#103): side panel to ADD or EDIT a delivery boy (name, phone,
 * active). Areas are managed on the card itself (DeliveryBoysPage).
 */
import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useCreateDeliveryBoy, useUpdateDeliveryBoy } from "@/hooks/useDeliveryBoys"
import { useReturnFocus } from "@/hooks/useReturnFocus"
import {
  changedBoyFields,
  EMPTY_BOY_FORM,
  validateBoyForm,
  type BoyFormErrors,
  type BoyFormValues,
} from "@/lib/deliveryBoy"
import { ServiceError } from "@/services/serviceError"
import type { DeliveryBoy } from "@/types/deliveryBoy"

type Props = { open: boolean; boy: DeliveryBoy | null; onClose: () => void }

export function DeliveryBoyFormSheet({ open, boy, onClose }: Props) {
  const returnFocus = useReturnFocus()
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md" {...returnFocus}>
        {open && <BoyForm key={boy?.delivery_boy_id ?? "new"} boy={boy} onDone={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function BoyForm({ boy, onDone }: { boy: DeliveryBoy | null; onDone: () => void }) {
  const isEdit = boy !== null
  const [values, setValues] = useState<BoyFormValues>(() =>
    boy ? { name: boy.name, phone: boy.phone, is_active: boy.is_active } : EMPTY_BOY_FORM,
  )
  const [errors, setErrors] = useState<BoyFormErrors>({})
  const [formError, setFormError] = useState("")
  const create = useCreateDeliveryBoy()
  const update = useUpdateDeliveryBoy()
  const saving = create.isPending || update.isPending

  function showServerError(error: Error) {
    if (!(error instanceof ServiceError)) return setFormError("Not saved. Please try again.")
    if (error.code === "DELIVERY_BOY_ALREADY_EXISTS") return setErrors({ phone: error.message })
    const fieldErrors: BoyFormErrors = {}
    for (const d of error.body.error.details ?? []) {
      if (d.field === "name" || d.field === "phone") fieldErrors[d.field] = d.issue
    }
    if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors)
    else setFormError(error.message)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validateBoyForm(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    if (!isEdit) {
      create.mutate(
        { ...values, name: values.name.trim() },
        {
          onSuccess: (created) => {
            toast.success(`${created.name} added. Now allocate his areas.`)
            onDone()
          },
          onError: showServerError,
        },
      )
      return
    }
    const changes = changedBoyFields(boy, values)
    if (Object.keys(changes).length === 0) return onDone()
    update.mutate(
      { id: boy.delivery_boy_id, changes },
      {
        onSuccess: (updated) => {
          toast.success(`${updated.name} updated`)
          onDone()
        },
        onError: showServerError,
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col">
      <SheetHeader>
        <SheetTitle className="text-h2 font-bold">{isEdit ? "Edit delivery boy" : "Add a delivery boy"}</SheetTitle>
        <SheetDescription>Delivery boys don't log in; this is the admin's list.</SheetDescription>
      </SheetHeader>
      <div className="space-y-4 px-4 pb-6">
        <div className="space-y-1.5">
          <Label htmlFor="boy-name">Name</Label>
          <Input
            id="boy-name"
            className="h-11"
            value={values.name}
            maxLength={100}
            placeholder="e.g. Ravi Kumar"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "boy-name-error" : undefined}
            onChange={(e) => {
              setValues((v) => ({ ...v, name: e.target.value }))
              setErrors((x) => ({ ...x, name: undefined }))
            }}
          />
          {errors.name && (
            <p id="boy-name-error" className="text-small text-destructive">
              {errors.name}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="boy-phone">Mobile number</Label>
          <Input
            id="boy-phone"
            className="h-11"
            type="tel"
            inputMode="numeric"
            value={values.phone}
            placeholder="10-digit mobile number"
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? "boy-phone-error" : undefined}
            onChange={(e) => {
              setValues((v) => ({ ...v, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))
              setErrors((x) => ({ ...x, phone: undefined }))
            }}
          />
          {errors.phone && (
            <p id="boy-phone-error" className="text-small text-destructive">
              {errors.phone}
            </p>
          )}
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={values.is_active}
            onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
          />
          <span>
            <span className="block font-semibold">Active</span>
            <span className="block text-small text-muted-foreground">
              Inactive: keeps his areas, but their orders show as "Not assigned".
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
          {isEdit ? "Save changes" : "Add delivery boy"}
        </Button>
      </SheetFooter>
    </form>
  )
}
