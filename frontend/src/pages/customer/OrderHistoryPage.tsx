/**
 * Route: `/orders` (FR-C7): "My orders", the logged-in user's orders, newest first (#90).
 * Login required (RequireAuth in the router). Data: GET /api/v1/orders/mine.
 *
 * Before #90 this page looked orders up by phone number, so anyone who knew a number
 * could see that customer's orders. Now orders belong to an account.
 */
import { Link } from "react-router"
import { PackageOpen } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { OrderCard } from "@/components/orders/OrderCard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { useMyOrders } from "@/hooks/useMyOrders"

function OrderHistoryPage() {
  const { user } = useAuth()
  const query = useMyOrders()

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-h1 font-bold">My orders</h1>
        <p className="text-muted-foreground">
          Orders placed with your account{user ? ` (${user.username})` : ""}.
        </p>
      </div>

      {query.isPending ? (
        <div className="space-y-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-card">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title="We could not load your orders"
          error={query.error}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      ) : query.data.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No orders yet"
          description="Orders you place with this account will appear here."
          action={
            <Button asChild>
              <Link to="/">Browse products</Link>
            </Button>
          }
        />
      ) : (
        <section aria-label="My orders" className="space-y-3">
          <p className="text-small text-muted-foreground">
            {query.data.length} {query.data.length === 1 ? "order" : "orders"} · newest first
          </p>
          <ul className="space-y-3">
            {query.data.map((order) => (
              <li key={order.order_id}>
                <OrderCard order={order} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default OrderHistoryPage
