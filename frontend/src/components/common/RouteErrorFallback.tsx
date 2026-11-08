/**
 * React Router's errorElement: when a page component crashes, React Router shows this
 * instead of its built-in technical error screen.
 */
import { useRouteError } from "react-router"

import { AppErrorFallback } from "@/components/common/AppErrorFallback"

export function RouteErrorFallback() {
  const error = useRouteError()
  if (import.meta.env.DEV) console.error("Route error", error)
  return <AppErrorFallback error={error} />
}
