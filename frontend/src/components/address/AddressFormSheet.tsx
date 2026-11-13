/**
 * AddressFormSheet (#102): side panel to ADD or EDIT a saved delivery address.
 * Used on the Account → Addresses tab and at checkout ("+ Add new address").
 *
 * - address = null → add (POST /addresses); `onSaved` gets the new address, so checkout
 *   can select it straight away.
 * - address given → edit (PATCH, only changed fields).
 */
import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useCreateAddress, useUpdateAddress } from "@/hooks/useAddresses"
import { useReturnFocus } from "@/hooks/useReturnFocus"
import {
  changedAddressFields,
  EMPTY_ADDRESS_FORM,
  toAddressFormValues,
  toAddressInput,
  validateAddressForm,
  type AddressFormErrors,
  type AddressFormField,
  type AddressFormValues,
} from "@/lib/address"
import { ServiceError } from "@/services/serviceError"
import type { Address } from "@/types/address"

type Props = {
  open: boolean
  address: Address | null
  onClose: () => void
  onSaved?: (address: Address) => void
}

export function AddressFormSheet({ open, address, onClose, onSaved }: Props) {
  const returnFocus = useReturnFocus()
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md" {...returnFocus}>
        {open && (
          <AddressForm key={address?.address_id ?? "new"} address={address} onDone={onClose} onSaved={onSaved} />
        )}
      </SheetContent>
    </Sheet>
  )
}

const FIELDS: { field: AddressFormField; label: string; placeholder: string; inputMode?: "numeric" }[] = [
  { field: "label", label: "Save as", placeholder: "e.g. Home or Office" },
  { field: "house", label: "House / flat no. and building", placeholder: "e.g. 12-3, Sai Residency" },
  { field: "street", label: "Street / area", placeholder: "e.g. MG Road, Ameerpet" },
  { field: "landmark", label: "Landmark (optional)", placeholder: "e.g. Near the metro station" },
  { field: "city", label: "City", placeholder: "e.g. Hyderabad" },
  { field: "pincode", label: "PIN code", placeholder: "6 digits", inputMode: "numeric" },
]

function AddressForm({
  address,
  onDone,
  onSaved,
}: {
  address: Address | null
  onDone: () => void
  onSaved?: (address: Address) => void
}) {
  const isEdit = address !== null
  const [values, setValues] = useState<AddressFormValues>(() =>
    address ? toAddressFormValues(address) : EMPTY_ADDRESS_FORM,
  )
  const [errors, setErrors] = useState<AddressFormErrors>({})
  const [formError, setFormError] = useState("")
  const create = useCreateAddress()
  const update = useUpdateAddress()
  const saving = create.isPending || update.isPending

  function setField(field: AddressFormField, value: string) {
    // PIN code: digits only, at most 6.
    const clean = field === "pincode" ? value.replace(/\D/g, "").slice(0, 6) : value
    setValues((current) => ({ ...current, [field]: clean }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
    setFormError("")
  }

  function showServerError(error: Error) {
    if (!(error instanceof ServiceError)) return setFormError("The address was not saved. Please try again.")
    const fieldErrors: AddressFormErrors = {}
    for (const detail of error.body.error.details ?? []) {
      const field = FIELDS.find((f) => f.field === detail.field)?.field
      if (field) fieldErrors[field] = detail.issue
    }
    if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors)
    else setFormError(error.message)
  }

  function done(saved: Address, message: string) {
    toast.success(message)
    onSaved?.(saved)
    onDone()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validateAddressForm(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    if (!isEdit) {
      create.mutate(toAddressInput(values), {
        onSuccess: (created) => done(created, `${created.label} address saved`),
        onError: showServerError,
      })
      return
    }
    const changes = changedAddressFields(address, values)
    if (Object.keys(changes).length === 0) return onDone()
    update.mutate(
      { addressId: address.address_id, changes },
      { onSuccess: (updated) => done(updated, `${updated.label} address updated`), onError: showServerError },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col">
      <SheetHeader>
        <SheetTitle className="text-h2 font-bold">{isEdit ? "Edit address" : "Add a delivery address"}</SheetTitle>
        <SheetDescription>
          {isEdit ? "Orders you already placed keep the address they were placed with." : "Where should we deliver?"}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-6">
        {FIELDS.map(({ field, label, placeholder, inputMode }) => {
          const id = `address-${field}`
          const error = errors[field]
          return (
            <div key={field} className="space-y-1.5">
              <Label htmlFor={id}>{label}</Label>
              <Input
                id={id}
                className="h-11"
                placeholder={placeholder}
                inputMode={inputMode}
                autoComplete={field === "pincode" ? "postal-code" : field === "city" ? "address-level2" : undefined}
                value={values[field]}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(e) => setField(field, e.target.value)}
              />
              {error && (
                <p id={`${id}-error`} className="text-small text-destructive">
                  {error}
                </p>
              )}
            </div>
          )
        })}

        {!isEdit && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3">
            <input
              type="checkbox"
              className="size-5 accent-primary"
              checked={values.is_default}
              onChange={(e) => setValues((v) => ({ ...v, is_default: e.target.checked }))}
            />
            <span className="font-semibold">Make this my default address</span>
          </label>
        )}

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
          {isEdit ? "Save changes" : "Save address"}
        </Button>
      </SheetFooter>
    </form>
  )
}
