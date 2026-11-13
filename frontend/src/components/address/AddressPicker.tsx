/**
 * AddressPicker (#102): choose one of the user's saved addresses (checkout and
 * "Change address"), with "+ Add new address". The parent owns the chosen id.
 */
import { useState } from "react"
import { Loader2, MapPin, Plus } from "lucide-react"

import { AddressFormSheet } from "@/components/address/AddressFormSheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Address } from "@/types/address"

type Props = {
  /** null while loading */
  addresses: Address[] | undefined
  loading: boolean
  loadError: boolean
  onRetry: () => void
  chosenId: number | null
  onChoose: (addressId: number) => void
  labelId: string
  errorId?: string
  /** Focus target when the user must fix the choice. */
  groupRef?: React.Ref<HTMLDivElement>
}

export function AddressPicker({
  addresses,
  loading,
  loadError,
  onRetry,
  chosenId,
  onChoose,
  labelId,
  errorId,
  groupRef,
}: Props) {
  const [adding, setAdding] = useState(false)

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-small text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading your addresses…
      </p>
    )
  }
  if (loadError || !addresses) {
    return (
      <p className="text-small text-danger">
        We could not load your addresses.{" "}
        <button type="button" className="font-semibold underline" onClick={onRetry}>
          Try again
        </button>
      </p>
    )
  }

  return (
    // The whole block takes focus when the user must fix the choice (no address yet).
    <div ref={groupRef} tabIndex={-1} className="space-y-2 outline-none">
      {addresses.length > 0 && (
        <div
          className="grid gap-2"
          role="radiogroup"
          aria-labelledby={labelId}
          aria-describedby={errorId}
        >
          {addresses.map((address) => {
            const checked = chosenId === address.address_id
            return (
              <button
                key={address.address_id}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onChoose(address.address_id)}
                className={cn(
                  "flex min-h-11 items-start gap-2 rounded-xl border p-3 text-left transition-colors",
                  checked ? "border-primary bg-primary-soft" : "bg-surface hover:bg-muted",
                )}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {address.label}
                    {address.is_default && <span className="ml-2 text-small font-normal text-muted-foreground">Default</span>}
                  </span>
                  <span className="block text-small break-words text-muted-foreground">{address.full_text}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
      {addresses.length === 0 && (
        <p className="text-small text-muted-foreground">
          You have no saved address yet. Add one so we know where to deliver.
        </p>
      )}
      <Button type="button" variant="outline" className="h-11" onClick={() => setAdding(true)}>
        <Plus aria-hidden="true" />
        Add new address
      </Button>
      <AddressFormSheet
        open={adding}
        address={null}
        onClose={() => setAdding(false)}
        onSaved={(created) => onChoose(created.address_id)}
      />
    </div>
  )
}
