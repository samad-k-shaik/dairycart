import { useParams } from "react-router"

import { PagePlaceholder } from "@/components/common/PagePlaceholder"

/** Route: `/products/:id`. `:id` is a URL parameter, read with useParams(). */
function ProductDetailsPage() {
  const { id } = useParams()

  return (
    <PagePlaceholder
      title="Product details"
      builtIn="M2-06 (#25)"
      description="Large image, name, size, price, description and the quantity selector."
    >
      <p className="text-small">
        Product id from the URL: <span className="font-bold">{id}</span>
      </p>
    </PagePlaceholder>
  )
}

export default ProductDetailsPage
