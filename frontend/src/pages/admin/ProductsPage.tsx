/**
 * ProductsPage – route "/admin/products" (#31, FR-A5).
 *
 * READ-ONLY table of ALL products, including unavailable ones
 * (GET /products?include_unavailable=true, ADR-006). Editing products is out of scope.
 */
import { PackageOpen } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { ProductImage } from '@/components/products/ProductImage'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useProducts } from '@/hooks/useProducts'
import { formatCurrency } from '@/lib/format'

export function ProductsPage() {
  const { data: products, isPending, isError, error, refetch } = useProducts({ includeUnavailable: true })

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Products" description="Read-only list of all products, including unavailable ones." />

      {isError && <ErrorState error={error} onRetry={() => void refetch()} title="We could not load products" />}

      {isPending && (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      )}

      {products && products.length === 0 && <EmptyState icon={PackageOpen} title="No products yet" />}

      {products && products.length > 0 && (
        // The shadcn Table scrolls sideways on narrow screens, so it stays usable at 360px.
        <Card className="gap-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Product</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="pr-5">Availability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.product_id}>
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-3">
                      <ProductImage product={product} className="size-10 shrink-0 rounded-lg" />
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-xs text-muted-foreground">ID {product.product_id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{product.size}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{formatCurrency(product.price)}</TableCell>
                  <TableCell className="pr-5">
                    {product.is_available ? (
                      <Badge className="h-6 bg-green-50 px-2.5 font-semibold text-green-700">Available</Badge>
                    ) : (
                      <Badge className="h-6 bg-slate-100 px-2.5 font-semibold text-slate-600">Unavailable</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
