/**
 * Shown when one order cannot be shown: a 404 is an EMPTY state ("Order not found",
 * nothing went wrong), anything else is an ERROR state with Retry.
 * Shared by the confirmation and order details pages.
 */
import { Link } from "react-router"
import { PackageSearch } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Button } from "@/components/ui/button"
import { ServiceError } from "@/services/serviceError"

type Props = { error: unknown; onRetry: () => void; retrying: boolean }

export function OrderLoadProblem({ error, onRetry, retrying }: Props) {
  if (error instanceof ServiceError && error.status === 404) {
    return (
      <EmptyState
        icon={PackageSearch}
        headingLevel="h1"
        title="Order not found"
        description="We could not find this order in your account. Check the order number, or open My orders."
        action={
          <Button asChild>
            <Link to="/orders">Go to My orders</Link>
          </Button>
        }
      />
    )
  }
  return <ErrorState title="We could not load this order" error={error} onRetry={onRetry} retrying={retrying} />
}
