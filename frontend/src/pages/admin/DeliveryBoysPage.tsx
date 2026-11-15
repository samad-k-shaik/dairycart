/**
 * Route: `/admin/delivery-boys` (#103). The admin's list of delivery boys and the areas
 * (PIN codes) allocated to each. One delivery boy per PIN code. Orders are matched to a
 * delivery boy by the PIN code of their address on the Deliveries page.
 * #109: the admin can give a delivery boy a login ("Give login"); he then uses /delivery.
 */
import { useState, type FormEvent } from "react"
import { Link } from "react-router"
import { Bike, KeyRound, Loader2, MapPin, MapPinned, Pencil, Phone, Plus, Trash2, Truck, X } from "lucide-react"
import { toast } from "sonner"

import { DeliveryBoyFormSheet } from "@/components/admin/DeliveryBoyFormSheet"
import { DeliveryLoginSheet } from "@/components/admin/DeliveryLoginSheet"
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useAddArea, useDeleteDeliveryBoy, useDeliveryBoys, useRemoveArea } from "@/hooks/useDeliveryBoys"
import { useReturnFocus } from "@/hooks/useReturnFocus"
import { areaLabel, validatePincode } from "@/lib/deliveryBoy"
import { ServiceError } from "@/services/serviceError"
import type { DeliveryBoy } from "@/types/deliveryBoy"

type FormState = { open: false } | { open: true; boy: DeliveryBoy | null }

function DeliveryBoysPage() {
  const query = useDeliveryBoys()
  const [form, setForm] = useState<FormState>({ open: false })
  const [toDelete, setToDelete] = useState<DeliveryBoy | null>(null)
  const [loginFor, setLoginFor] = useState<DeliveryBoy | null>(null) // #109
  const openAdd = () => setForm({ open: true, boy: null })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-h1 font-bold">Delivery boys</h1>
          <p className="text-muted-foreground">
            Allocate areas by PIN code. Each PIN code has one delivery boy; orders are matched by the PIN code of
            their address.
          </p>
          <Link
            to="/admin/orders"
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary hover:underline"
          >
            <Truck className="size-4" aria-hidden="true" />
            Today's deliveries per delivery boy
          </Link>
          <Link
            to="/admin/live-map"
            className="ml-4 inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary hover:underline"
          >
            <MapPinned className="size-4" aria-hidden="true" />
            Live map
          </Link>
        </div>
        <Button className="h-11" onClick={openAdd}>
          <Plus aria-hidden="true" />
          Add delivery boy
        </Button>
      </div>

      {query.isPending ? (
        <div className="grid gap-3 md:grid-cols-2" aria-hidden="true">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : query.isError ? (
        <ErrorState
          title="We could not load the delivery boys"
          error={query.error}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={Bike}
          title="No delivery boys yet"
          description="Add your delivery boys, then allocate their areas by PIN code."
          action={
            <Button className="h-11" onClick={openAdd}>
              <Plus aria-hidden="true" />
              Add delivery boy
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2" aria-label="Delivery boys">
          {query.data.map((boy) => (
            <li key={boy.delivery_boy_id}>
              <BoyCard
                boy={boy}
                onEdit={() => setForm({ open: true, boy })}
                onDelete={() => setToDelete(boy)}
                onLogin={() => setLoginFor(boy)}
              />
            </li>
          ))}
        </ul>
      )}

      <DeliveryBoyFormSheet open={form.open} boy={form.open ? form.boy : null} onClose={() => setForm({ open: false })} />
      <DeleteBoyDialog boy={toDelete} onClose={() => setToDelete(null)} />
      <DeliveryLoginSheet boy={loginFor} onClose={() => setLoginFor(null)} />
    </div>
  )
}

type BoyCardProps = { boy: DeliveryBoy; onEdit: () => void; onDelete: () => void; onLogin: () => void }

function BoyCard({ boy, onEdit, onDelete, onLogin }: BoyCardProps) {
  const removeArea = useRemoveArea()
  return (
    <article className="h-full space-y-3 rounded-2xl bg-surface p-4 shadow-card" aria-label={boy.name}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-h3 font-semibold">
            <Bike className="size-5 text-primary" aria-hidden="true" />
            {boy.name}
          </h2>
          <p className="flex items-center gap-1.5 text-small text-muted-foreground">
            <Phone className="size-3.5" aria-hidden="true" />
            {boy.phone}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {boy.is_active ? (
            <Badge className="bg-green-50 font-semibold text-green-700">Active</Badge>
          ) : (
            <Badge className="bg-muted font-semibold text-muted-foreground">Inactive</Badge>
          )}
          <Badge className="bg-primary-soft font-semibold text-primary" data-testid="today-orders">
            Today: {boy.today_orders}
          </Badge>
          {boy.has_login && <Badge className="bg-amber-50 font-semibold text-amber-700">Can log in</Badge>}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-small font-semibold">Areas</p>
        {boy.areas.length === 0 ? (
          <p className="text-small text-muted-foreground">No areas yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2" aria-label={`Areas of ${boy.name}`}>
            {boy.areas.map((area) => (
              <li
                key={area.pincode}
                className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pr-1 pl-3 text-small font-semibold text-primary"
              >
                <MapPin className="size-3.5" aria-hidden="true" />
                {areaLabel(area)}
                <button
                  type="button"
                  aria-label={`Remove ${area.pincode} from ${boy.name}`}
                  className="flex size-7 items-center justify-center rounded-full hover:bg-primary/15"
                  disabled={removeArea.isPending}
                  onClick={() =>
                    removeArea.mutate(
                      { id: boy.delivery_boy_id, pincode: area.pincode },
                      {
                        onSuccess: () => toast.success(`${area.pincode} removed from ${boy.name}`),
                        onError: (e) =>
                          toast.error("Not removed", { description: e instanceof ServiceError ? e.message : "" }),
                      },
                    )
                  }
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddAreaForm boy={boy} />

      <div className="flex flex-wrap gap-2 border-t pt-3">
        <Button variant="outline" className="h-11" onClick={onEdit}>
          <Pencil aria-hidden="true" />
          Edit<span className="sr-only"> {boy.name}</span>
        </Button>
        <Button variant="outline" className="h-11" onClick={onLogin}>
          <KeyRound aria-hidden="true" />
          {boy.has_login ? "New password" : "Give login"}
          <span className="sr-only"> for {boy.name}</span>
        </Button>
        <Button variant="outline" className="h-11 text-danger hover:text-danger" onClick={onDelete}>
          <Trash2 aria-hidden="true" />
          Delete<span className="sr-only"> {boy.name}</span>
        </Button>
      </div>
    </article>
  )
}

/** PIN code + optional locality, added to this delivery boy. */
function AddAreaForm({ boy }: { boy: DeliveryBoy }) {
  const [pincode, setPincode] = useState("")
  const [areaName, setAreaName] = useState("")
  const [error, setError] = useState("")
  const add = useAddArea()
  const id = `area-${boy.delivery_boy_id}`

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = validatePincode(pincode)
    setError(problem)
    if (problem) return
    add.mutate(
      { id: boy.delivery_boy_id, area: { pincode, area_name: areaName.trim() || null } },
      {
        onSuccess: () => {
          toast.success(`${pincode} allocated to ${boy.name}`)
          setPincode("")
          setAreaName("")
        },
        // e.g. "500016 is already allocated to Ravi Kumar. Remove it there first."
        onError: (e) => setError(e instanceof ServiceError ? e.message : "Not saved. Please try again."),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-1.5" aria-label={`Allocate an area to ${boy.name}`}>
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`${id}-pin`}>
          PIN code
        </label>
        <Input
          id={`${id}-pin`}
          className="h-11 w-28"
          inputMode="numeric"
          placeholder="PIN code"
          value={pincode}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))
            setError("")
          }}
        />
        <label className="sr-only" htmlFor={`${id}-name`}>
          Locality (optional)
        </label>
        <Input
          id={`${id}-name`}
          className="h-11 min-w-0 flex-1 basis-32"
          placeholder="Locality (optional)"
          maxLength={50}
          value={areaName}
          onChange={(e) => setAreaName(e.target.value)}
        />
        <Button type="submit" variant="outline" className="h-11" disabled={add.isPending}>
          {add.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
          Add area
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-small text-danger">
          {error}
        </p>
      )}
    </form>
  )
}

function DeleteBoyDialog({ boy, onClose }: { boy: DeliveryBoy | null; onClose: () => void }) {
  const returnFocus = useReturnFocus()
  const remove = useDeleteDeliveryBoy()

  function handleConfirm() {
    if (!boy) return
    remove.mutate(boy.delivery_boy_id, {
      onSuccess: () => {
        toast.success(`${boy.name} deleted`)
        onClose()
      },
      onError: (e) => {
        toast.error("Not deleted", { description: e instanceof ServiceError ? e.message : "Please try again." })
        onClose()
      },
    })
  }

  return (
    <AlertDialog open={boy !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent {...returnFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {boy?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {boy && boy.areas.length > 0
              ? `His ${boy.areas.length} area(s) become free, and their orders show as "Not assigned" until you allocate them again.`
              : "He has no areas."}{" "}
            To keep his areas for later, switch him to Inactive instead.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11" disabled={remove.isPending}>
            Keep him
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

export default DeliveryBoysPage
