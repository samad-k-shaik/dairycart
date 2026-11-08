import { Link } from "react-router"

import { PagePlaceholder } from "@/components/common/PagePlaceholder"

/** Route: `/` (customer home). */
function HomePage() {
  return (
    <PagePlaceholder
      title="Fresh milk, delivered daily"
      builtIn="M2-05 (#24)"
      description="Hero banner, category chips and the product grid will appear here."
    >
      {/* Temporary example link so the dynamic route can be tried from the UI. */}
      <Link to="/products/2" className="font-semibold text-primary hover:underline">
        Example: open product 2 →
      </Link>
    </PagePlaceholder>
  )
}

export default HomePage
