/**
 * ProductFormSheet: side panel to ADD a new product or EDIT an existing one (issue #86).
 *
 * - product = null → "Add product" (POST /admin/products)
 * - product given → "Edit product" (PATCH /admin/products/{id}, only changed fields)
 *
 * Fields are checked when the admin presses Save (rules in lib/productForm.ts).
 * Errors from the server (e.g. same name and size already exists) are shown under the field.
 */
import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useCreateProduct, useUpdateProduct } from "@/hooks/useProductMutations"
import { useReturnFocus } from "@/hooks/useReturnFocus"
import {
  changedFields,
  EMPTY_PRODUCT_FORM,
  PRODUCT_NAME_MAX,
  PRODUCT_SIZE_MAX,
  toFormValues,
  toProductInput,
  validateProductForm,
  type ProductFormErrors,
  type ProductFormValues,
} from "@/lib/productForm"
import { ServiceError } from "@/services/serviceError"
import type { AdminProduct } from "@/types/product"

type ProductFormSheetProps = {
  open: boolean
  /** null = add a new product; a product = edit it. */
  product: AdminProduct | null
  onClose: () => void
}

export function ProductFormSheet({ open, product, onClose }: ProductFormSheetProps) {
  const returnFocus = useReturnFocus()
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md" {...returnFocus}>
        {/* key: a fresh form (fresh state) every time a different product is opened */}
        {open && <ProductForm key={product?.product_id ?? "new"} product={product} onDone={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

/** Field names that can show an error under them. */
const FORM_FIELDS = ["name", "size", "price", "stock"] as const

function ProductForm({ product, onDone }: { product: AdminProduct | null; onDone: () => void }) {
  const isEdit = product !== null
  const [values, setValues] = useState<ProductFormValues>(() =>
    product ? toFormValues(product) : EMPTY_PRODUCT_FORM,
  )
  const [errors, setErrors] = useState<ProductFormErrors>({})
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const saving = create.isPending || update.isPending

  function setField<K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in errors) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function showServerError(error: Error) {
    if (!(error instanceof ServiceError)) {
      toast.error("Product not saved", { description: "Please try again." })
      return
    }
    if (error.code === "PRODUCT_ALREADY_EXISTS") {
      setErrors({ name: error.message })
      return
    }
    // VALIDATION_ERROR: put each problem under its field when we have one.
    const fieldErrors: ProductFormErrors = {}
    for (const detail of error.body.error.details ?? []) {
      const name = detail.field === "stock_quantity" ? "stock" : detail.field
      const field = FORM_FIELDS.find((f) => f === name)
      if (field) fieldErrors[field] = detail.issue
    }
    if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors)
    else toast.error("Product not saved", { description: error.message })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validateProductForm(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    if (!isEdit) {
      create.mutate(toProductInput(values), {
        onSuccess: (created) => {
          toast.success(`${created.name} (${created.size}) added`)
          onDone()
        },
        onError: showServerError,
      })
      return
    }

    const changes = changedFields(product, values)
    if (Object.keys(changes).length === 0) {
      toast.info("No changes to save")
      onDone()
      return
    }
    update.mutate(
      { productId: product.product_id, changes },
      {
        onSuccess: (updated) => {
          toast.success(`${updated.name} (${updated.size}) updated`)
          onDone()
        },
        onError: showServerError,
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col">
      <SheetHeader>
        <SheetTitle className="text-h2 font-bold">{isEdit ? "Edit product" : "Add product"}</SheetTitle>
        <SheetDescription>
          {isEdit
            ? "Changes apply to new orders. Orders already placed keep their old price."
            : "New products are shown to customers when they are available."}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-6">
        <TextField
          id="product-name"
          label="Name"
          placeholder="e.g. Cow Milk"
          value={values.name}
          maxLength={PRODUCT_NAME_MAX}
          error={errors.name}
          onChange={(value) => setField("name", value)}
        />
        <TextField
          id="product-size"
          label="Size"
          placeholder="e.g. 500 ml"
          value={values.size}
          maxLength={PRODUCT_SIZE_MAX}
          error={errors.size}
          onChange={(value) => setField("size", value)}
        />
        <TextField
          id="product-price"
          label="Price (₹)"
          placeholder="e.g. 45.00"
          inputMode="decimal"
          value={values.price}
          error={errors.price}
          onChange={(value) => setField("price", value)}
        />
        <TextField
          id="product-stock"
          label="Stock (bottles)"
          placeholder="e.g. 50"
          inputMode="numeric"
          value={values.stock}
          error={errors.stock}
          onChange={(value) => setField("stock", value)}
        />
        <p className="-mt-2 text-small text-muted-foreground">
          Only admins see this number. Orders reduce it; cancelled orders put it back.
        </p>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={values.is_available}
            onChange={(event) => setField("is_available", event.target.checked)}
          />
          <span>
            <span className="block font-semibold">Available to customers</span>
            <span className="block text-small text-muted-foreground">
              Unavailable products are hidden from the shop but kept for old orders.
            </span>
          </span>
        </label>
      </div>

      <SheetFooter className="mt-auto flex-row justify-end border-t">
        <Button type="button" variant="outline" className="h-11" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" className="h-11" disabled={saving}>
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          {isEdit ? "Save changes" : "Add product"}
        </Button>
      </SheetFooter>
    </form>
  )
}

type TextFieldProps = {
  id: string
  label: string
  value: string
  error?: string
  placeholder?: string
  maxLength?: number
  inputMode?: "decimal" | "numeric"
  onChange: (value: string) => void
}

/** Label + input + error message, linked for screen readers (aria-describedby). */
function TextField({ id, label, value, error, onChange, ...inputProps }: TextFieldProps) {
  const errorId = `${id}-error`
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className="h-11"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-small text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
