/**
 * Route: `/admin/products` (FR-A5). Table of ALL products, including unavailable ones,
 * with price and availability. The admin can add, edit and delete products (issue #86).
 */
import { useState } from "react"
import { Package, Pencil, Plus, Trash2 } from "lucide-react"

import { DeleteProductDialog } from "@/components/admin/DeleteProductDialog"
import { ProductFormSheet } from "@/components/admin/ProductFormSheet"
import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminProducts } from "@/hooks/useProducts"
import { formatCurrency } from "@/lib/format"
import { getProductImage } from "@/lib/productDisplay"
import { cn } from "@/lib/utils"
import type { Product } from "@/types/product"

/** Which panel is open: the add/edit form (product null = add) or nothing. */
type FormState = { open: false } | { open: true; product: Product | null }

function ProductsPage() {
  const { data: products, isPending, isError, error, refetch, isFetching } = useAdminProducts()
  const [form, setForm] = useState<FormState>({ open: false })
  const [toDelete, setToDelete] = useState<Product | null>(null)

  const openAdd = () => setForm({ open: true, product: null })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-h1 font-bold">Products</h1>
          <p className="text-muted-foreground">Add, edit or remove products. Unavailable ones are hidden from customers.</p>
        </div>
        <Button className="h-11" onClick={openAdd}>
          <Plus aria-hidden="true" />
          Add product
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-2 rounded-2xl bg-surface p-4 shadow-card" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="We could not load the products" error={error} onRetry={() => refetch()} retrying={isFetching} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first product so customers can order it."
          action={
            <Button className="h-11" onClick={openAdd}>
              <Plus aria-hidden="true" />
              Add product
            </Button>
          }
        />
      ) : (
        <div className="rounded-2xl bg-surface p-2 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden sm:table-cell">ID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="hidden sm:table-cell">Availability</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.product_id}>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{product.product_id}</TableCell>
                  {/* Dim only the product details of unavailable products, not the action buttons. */}
                  <TableCell className={product.is_available ? undefined : "opacity-70"}>
                    <div className="flex items-center gap-3">
                      <img
                        src={getProductImage(product)}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0 rounded-lg bg-primary-soft object-contain p-0.5"
                      />
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-small text-muted-foreground">{product.size}</p>
                        {/* Phones: the badge goes under the name, so Edit/Delete fit on screen. */}
                        <AvailabilityBadge available={product.is_available} className="mt-1 sm:hidden" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={product.is_available ? "text-right font-semibold" : "text-right font-semibold opacity-70"}>
                    {formatCurrency(product.price)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <AvailabilityBadge available={product.is_available} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Edit ${product.name} ${product.size}`}
                        onClick={() => setForm({ open: true, product })}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Delete ${product.name} ${product.size}`}
                        onClick={() => setToDelete(product)}
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

      <ProductFormSheet
        open={form.open}
        product={form.open ? form.product : null}
        onClose={() => setForm({ open: false })}
      />
      <DeleteProductDialog product={toDelete} onClose={() => setToDelete(null)} />
    </div>
  )
}

function AvailabilityBadge({ available, className }: { available: boolean; className?: string }) {
  return available ? (
    <Badge className={cn("bg-green-50 font-semibold text-green-700", className)}>Available</Badge>
  ) : (
    <Badge className={cn("bg-muted font-semibold text-muted-foreground", className)}>Unavailable</Badge>
  )
}

export default ProductsPage
