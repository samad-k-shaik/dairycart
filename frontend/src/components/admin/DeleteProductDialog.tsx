/**
 * DeleteProductDialog: "Are you sure?" before deleting a product (issue #86).
 *
 * Only products that were NEVER ordered can be deleted. If the server answers
 * 409 PRODUCT_IN_USE, the dialog explains why and offers "Mark unavailable" instead,
 * which hides the product from customers but keeps it for old orders.
 */
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useDeleteProduct, useUpdateProduct } from "@/hooks/useProductMutations"
import { useReturnFocus } from "@/hooks/useReturnFocus"
import { ServiceError } from "@/services/serviceError"
import type { Product } from "@/types/product"

type DeleteProductDialogProps = {
  /** The product to delete; null = dialog closed. */
  product: Product | null
  onClose: () => void
}

export function DeleteProductDialog({ product, onClose }: DeleteProductDialogProps) {
  const returnFocus = useReturnFocus()
  return (
    <AlertDialog open={product !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent {...returnFocus}>
        {product && <DialogBody key={product.product_id} product={product} onDone={onClose} />}
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DialogBody({ product, onDone }: { product: Product; onDone: () => void }) {
  const [inUse, setInUse] = useState(false)
  const remove = useDeleteProduct()
  const update = useUpdateProduct()
  const label = `${product.name} (${product.size})`

  function handleDelete() {
    remove.mutate(product.product_id, {
      onSuccess: () => {
        toast.success(`${label} deleted`)
        onDone()
      },
      onError: (error) => {
        if (error instanceof ServiceError && error.code === "PRODUCT_IN_USE") {
          setInUse(true) // switch the dialog to the "mark unavailable" choice
          return
        }
        toast.error("Product not deleted", {
          description: error instanceof ServiceError ? error.message : "Please try again.",
        })
      },
    })
  }

  function handleMarkUnavailable() {
    update.mutate(
      { productId: product.product_id, changes: { is_available: false } },
      {
        onSuccess: () => {
          toast.success(`${label} is now unavailable`)
          onDone()
        },
        onError: (error) => {
          toast.error("Product not updated", {
            description: error instanceof ServiceError ? error.message : "Please try again.",
          })
        },
      },
    )
  }

  if (inUse) {
    return (
      <>
        <AlertDialogHeader>
          <AlertDialogTitle>{label} cannot be deleted</AlertDialogTitle>
          <AlertDialogDescription>
            It has already been ordered, and old orders must still show what was bought.
            {product.is_available
              ? " Mark it unavailable instead: customers will no longer see it."
              : " It is already unavailable, so customers do not see it."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" className="h-11" disabled={update.isPending}>
              {product.is_available ? "Cancel" : "OK"}
            </Button>
          </AlertDialogCancel>
          {product.is_available && (
            <Button className="h-11" onClick={handleMarkUnavailable} disabled={update.isPending}>
              {update.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Mark unavailable
            </Button>
          )}
        </AlertDialogFooter>
      </>
    )
  }

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
        <AlertDialogDescription>
          This removes the product permanently. Products that were already ordered cannot be deleted.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel asChild>
          <Button variant="outline" className="h-11" disabled={remove.isPending}>
            Cancel
          </Button>
        </AlertDialogCancel>
        <Button variant="destructive" className="h-11" onClick={handleDelete} disabled={remove.isPending}>
          {remove.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Delete
        </Button>
      </AlertDialogFooter>
    </>
  )
}
