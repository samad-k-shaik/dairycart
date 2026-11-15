/**
 * RequireAuth (#89): protects pages.
 *
 *   <RequireAuth>…</RequireAuth>              logged-in users only
 *   <RequireAuth role="ADMIN">…</RequireAuth>  admins only
 *
 * Not logged in → the login page, which comes back here afterwards (?next=…).
 * Logged in as a USER on an admin page → a "not allowed" message.
 *
 * This only hides pages. The real protection is the backend: every /api/v1/admin API
 * answers 401/403 itself, so changing this code in the browser would not reveal any data.
 */
import type { ReactNode } from "react"
import { Link, Navigate, useLocation } from "react-router"
import { ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"

export function RequireAuth({ role, children }: { role?: "ADMIN"; children: ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  if (role === "ADMIN" && user.role !== "ADMIN") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-red-50 text-danger">
          <ShieldAlert className="size-8" aria-hidden="true" />
        </span>
        <h1 className="text-h1 font-bold">Admins only</h1>
        <p className="text-muted-foreground">
          You are logged in as <span className="font-semibold text-foreground">{user.username}</span>, which is not an
          administrator account.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild className="h-11">
            <Link to="/account">Go to my account</Link>
          </Button>
          <Button variant="outline" className="h-11" onClick={logout}>
            Log out
          </Button>
        </div>
      </main>
    )
  }

  return children
}
