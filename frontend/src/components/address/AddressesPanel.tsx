/**
 * AddressesPanel (#102): the Account page's "Addresses" tab. Lists the user's saved
 * addresses (default first) with Edit, Make default and Delete, and "Add address".
 */
import { useState } from "react"
import { Loader2, LocateFixed, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { AddressFormSheet } from "@/components/address/AddressFormSheet"
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
import { useAddresses, useDeleteAddress, useMakeDefaultAddress } from "@/hooks/useAddresses"
import { useReturnFocus } from "@/hooks/useReturnFocus"
import { MAX_ADDRESSES } from "@/lib/address"
import { ServiceError } from "@/services/serviceError"
import type { Address } from "@/types/address"

type FormState = { open: false } | { open: true; address: Address | null }

export function AddressesPanel() {
  const query = useAddresses()
  const makeDefault = useMakeDefaultAddress()
  const [form, setForm] = useState<FormState>({ open: false })
  const [toDelete, setToDelete] = useState<Address | null>(null)
  const full = (query.data?.length ?? 0) >= MAX_ADDRESSES
  const openAdd = () => setForm({ open: true, address: null })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground">Where we deliver your orders. The default is chosen first at checkout.</p>
        <Button className="h-11" onClick={openAdd} disabled={full}>
          <Plus aria-hidden="true" />
          Add address
        </Button>
      </div>
      {full && <p className="text-small text-muted-foreground">You can save up to {MAX_ADDRESSES} addresses.</p>}

      {query.isPending ? (
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : query.isError ? (
        <ErrorState
          title="We could not load your addresses"
          error={query.error}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No addresses yet"
          description="Add a delivery address. You need one to place an order."
          action={
            <Button className="h-11" onClick={openAdd}>
              <Plus aria-hidden="true" />
              Add address
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3" aria-label="My addresses">
          {query.data.map((address) => (
            <li key={address.address_id} className="space-y-3 rounded-2xl bg-surface p-4 shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <MapPin className="size-4 text-primary" aria-hidden="true" />
                <h3 className="font-semibold">{address.label}</h3>
                {address.is_default && <Badge className="bg-primary-soft font-semibold text-primary">Default</Badge>}
              </div>
              <p className="text-small break-words">{address.full_text}</p>
              {address.latitude !== null && (
                <p className="flex items-center gap-1 text-small text-muted-foreground">
                  <LocateFixed className="size-3.5" aria-hidden="true" />
                  Map pin saved
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="h-11" onClick={() => setForm({ open: true, address })}>
                  <Pencil aria-hidden="true" />
                  Edit<span className="sr-only"> {address.label}</span>
                </Button>
                {!address.is_default && (
                  <Button
                    variant="outline"
                    className="h-11"
                    disabled={makeDefault.isPending}
                    onClick={() =>
                      makeDefault.mutate(address.address_id, {
                        onSuccess: (made) => toast.success(`${made.label} is now your default address`),
                        onError: (error) =>
                          toast.error("Not changed", {
                            description: error instanceof ServiceError ? error.message : "Please try again.",
                          }),
                      })
                    }
                  >
                    <Star aria-hidden="true" />
                    Make default<span className="sr-only"> {address.label}</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="h-11 text-danger hover:text-danger"
                  onClick={() => setToDelete(address)}
                >
                  <Trash2 aria-hidden="true" />
                  Delete<span className="sr-only"> {address.label}</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddressFormSheet
        open={form.open}
        address={form.open ? form.address : null}
        onClose={() => setForm({ open: false })}
      />
      <DeleteAddressDialog address={toDelete} onClose={() => setToDelete(null)} />
    </div>
  )
}

function DeleteAddressDialog({ address, onClose }: { address: Address | null; onClose: () => void }) {
  const returnFocus = useReturnFocus()
  const remove = useDeleteAddress()

  function handleConfirm() {
    if (!address) return
    remove.mutate(address.address_id, {
      onSuccess: () => {
        toast.success(`${address.label} address deleted`)
        onClose()
      },
      onError: (error) => {
        toast.error("Address not deleted", {
          description: error instanceof ServiceError ? error.message : "Please try again.",
        })
        onClose()
      },
    })
  }

  return (
    <AlertDialog open={address !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent {...returnFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this address?</AlertDialogTitle>
          <AlertDialogDescription>
            {address?.full_text}. Orders already placed still show where they were delivered.
            {address?.is_default && " Another saved address becomes your default."}
          </AlertDialogDescription>
        </AlertDialogHeader>
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
