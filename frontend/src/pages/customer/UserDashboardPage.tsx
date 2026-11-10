/**
 * Route: `/account` (#89): the User Dashboard, for logged-in users only.
 * Shows the account details and links to the shop, order history and (admins) the admin area.
 */
import { Link, useNavigate } from "react-router"
import { LayoutDashboard, LogOut, ReceiptText, ShoppingBag, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { formatDate } from "@/lib/format"

function UserDashboardPage() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null // RequireAuth already sends logged-out visitors to /login

  function handleLogout() {
    logout()
    navigate("/login", { replace: true })
  }

  const details: [string, string][] = [
    ["Full name", user.full_name],
    ["Username", user.username],
    ["Email", user.email],
    ["Member since", formatDate(user.created_at)],
  ]

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-h1 font-bold">Hello, {user.full_name.split(" ")[0]}</h1>
          <p className="text-muted-foreground">Your DairyCart account.</p>
        </div>
        <Button variant="outline" className="h-11" onClick={handleLogout}>
          <LogOut aria-hidden="true" />
          Log out
        </Button>
      </div>

      <section aria-labelledby="account-details" className="rounded-2xl bg-surface p-5 shadow-card">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <UserRound className="size-6" aria-hidden="true" />
          </span>
          <h2 id="account-details" className="text-h2 font-bold">
            Account details
          </h2>
          <Badge className={isAdmin ? "ml-auto bg-primary-soft font-semibold text-primary" : "ml-auto bg-muted font-semibold text-muted-foreground"}>
            {isAdmin ? "Admin" : "User"}
          </Badge>
        </div>
        <dl className="divide-y">
          {details.map(([label, value]) => (
            <div key={label} className="flex flex-wrap justify-between gap-2 py-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold break-all">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild variant="outline" className="h-12 justify-start">
          <Link to="/">
            <ShoppingBag aria-hidden="true" />
            Shop for milk
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-12 justify-start">
          <Link to="/orders">
            <ReceiptText aria-hidden="true" />
            My orders (by phone number)
          </Link>
        </Button>
        {isAdmin && (
          <Button asChild className="h-12 justify-start sm:col-span-2">
            <Link to="/admin">
              <LayoutDashboard aria-hidden="true" />
              Open the Admin Dashboard
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

export default UserDashboardPage
