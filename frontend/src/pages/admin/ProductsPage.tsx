/**
 * Route: `/admin/products` (FR-A5). Read-only table of ALL products,
 * including unavailable ones, with price and availability.
 */
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminProducts } from "@/hooks/useProducts"
import { formatCurrency } from "@/lib/format"
import { getProductImage } from "@/lib/productDisplay"

function ProductsPage() {
  const { data: products, isPending, isError, refetch } = useAdminProducts()

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-h1 font-bold">Products</h1>
        <p className="text-muted-foreground">Read-only. Prices and availability are managed in the database.</p>
      </div>

      {isPending ? (
        <div className="h-64 animate-pulse rounded-2xl bg-surface shadow-card" aria-hidden="true" />
      ) : isError ? (
        <div role="alert" className="space-y-3 rounded-2xl bg-surface p-6 text-center shadow-card">
          <p className="font-semibold">We could not load the products.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : products.length === 0 ? (
        <p className="rounded-2xl bg-surface p-6 text-center text-muted-foreground shadow-card">No products yet.</p>
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
