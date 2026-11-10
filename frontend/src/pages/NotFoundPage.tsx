import { Link, useLocation } from "react-router"
import { SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * 404 page for unknown URLs. It is used inside both layouts, so an unknown
 * /admin/... URL keeps the admin navigation and links back to the dashboard.
 */
function NotFoundPage({ homePath = "/" }: { homePath?: string }) {
  const { pathname } = useLocation()

  return (
    <section className="flex flex-col items-center gap-4 py-12 text-center">
      <SearchX className="size-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-h1 font-bold">Page not found</h1>
      <p className="text-muted-foreground">
        There is no page at <span className="font-semibold text-foreground">{pathname}</span>.
      </p>
      <Button asChild>
        <Link to={homePath}>Go back home</Link>
      </Button>
    </section>
  )
}

export default NotFoundPage
