import { useParams } from "react-router"

import { PagePlaceholder } from "@/components/common/PagePlaceholder"

/** Route: `/orders/:id/confirmation`. */
function OrderConfirmationPage() {
  const { id } = useParams()

  return (
    <PagePlaceholder
      title="Order placed"
      builtIn="M2-09 (#28)"
      description="Order id, items, the backend-calculated total and status PLACED."
    >
      <p className="text-small">
        Order id from the URL: <span className="font-bold">{id}</span>
      </p>
    </PagePlaceholder>
  )
}

export default OrderConfirmationPage
