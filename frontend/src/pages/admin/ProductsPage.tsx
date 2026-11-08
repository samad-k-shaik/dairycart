/**
 * Route: `/admin/products` (FR-A5). Read-only table of ALL products,
 * including unavailable ones, with price and availability.
 */
import { Package } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminProducts } from "@/hooks/useProducts"
import { formatCurrency } from "@/lib/format"
import { getProductImage } from "@/lib/productDisplay"

function ProductsPage() {
  const { data: products, isPending, isError, error, refetch, isFetching } = useAdminProducts()

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-h1 font-bold">Products</h1>
        <p className="text-muted-foreground">Read-only. Prices and availability are managed in the database.</p>
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
        <EmptyState icon={Package} title="No products yet" description="Products are added to the database by the team." />
      ) : (
        <div className="rounded-2xl bg-surface p-2 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden sm:table-cell">ID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Availability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.product_id} className={product.is_available ? undefined : "opacity-70"}>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{product.product_id}</TableCell>
                  <TableCell>
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
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(product.price)}</TableCell>
                  <TableCell>
                    {product.is_available ? (
                      <Badge className="bg-green-50 font-semibold text-green-700">Available</Badge>
                    ) : (
                      <Badge className="bg-muted font-semibold text-muted-foreground">Unavailable</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default ProductsPage
