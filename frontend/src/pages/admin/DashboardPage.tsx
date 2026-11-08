import { PagePlaceholder } from "@/components/common/PagePlaceholder"

/** Route: `/admin`. */
function DashboardPage() {
  return (
    <PagePlaceholder
      title="Dashboard"
      builtIn="M2-11 (#30)"
      description="Stat cards (total orders, today, per status) and recent orders."
    />
  )
}

export default DashboardPage
