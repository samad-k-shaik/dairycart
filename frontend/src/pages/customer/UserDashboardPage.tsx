/**
 * Route: `/account` (#89): the User Dashboard, for logged-in users only.
 * Shows the account details and links to the shop, order history and (admins) the admin area.
 * #102: two tabs, "Details" and "Addresses" (saved delivery addresses), kept in the URL
 * (?tab=addresses) so checkout can link straight to the addresses.
 */
import { Link, useNavigate, useSearchParams } from "react-router"
import { Bike, LayoutDashboard, LogOut, MapPin, ReceiptText, Repeat, ShoppingBag, UserRound } from "lucide-react"

import { AddressesPanel } from "@/components/address/AddressesPanel"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type Tab = "details" | "addresses"
const TABS: { id: Tab; label: string; Icon: typeof UserRound }[] = [
  { id: "details", label: "Details", Icon: UserRound },
  { id: "addresses", label: "Addresses", Icon: MapPin },
]

function UserDashboardPage() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get("tab") === "addresses" ? "addresses" : "details"
  if (!user) return null // RequireAuth already sends logged-out visitors to /login

  function handleLogout() {
    logout()
    navigate("/login", { replace: true })
  }

  const details: [string, string][] = [
    ["Full name", user.full_name],
    ["Mobile number", user.phone],
    ["Member since", formatDate(user.created_at)],
  ]

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="photo-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="space-y-1">
          <h1 className="text-h1 font-bold">Hello, {user.full_name.split(" ")[0]}</h1>
          <p className="text-muted-foreground">Your DairyCart account.</p>
        </div>
        <Button variant="outline" className="h-11" onClick={handleLogout}>
          <LogOut aria-hidden="true" />
          Log out
        </Button>
      </div>

      {/* #102: tabs */}
      <div role="tablist" aria-label="Account" className="flex gap-2">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setSearchParams(id === "details" ? {} : { tab: id }, { replace: true })}
            className={cn(
              "flex h-11 items-center gap-2 rounded-full border px-4 font-semibold transition-colors",
              tab === id ? "border-primary bg-primary text-primary-foreground" : "bg-surface hover:bg-muted",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === "addresses" ? (
        <div id="panel-addresses" role="tabpanel" aria-labelledby="tab-addresses" className="photo-panel p-4">
          <AddressesPanel />
        </div>
      ) : (
        <div id="panel-details" role="tabpanel" aria-labelledby="tab-details" className="space-y-6">
          <section aria-labelledby="account-details" className="rounded-2xl bg-surface p-5 shadow-card">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                <UserRound className="size-6" aria-hidden="true" />
              </span>
              <h2 id="account-details" className="text-h2 font-bold">
                Account details
              </h2>
              <Badge
                className={
                  isAdmin
                    ? "ml-auto bg-primary-soft font-semibold text-primary"
                    : "ml-auto bg-muted font-semibold text-muted-foreground"
                }
              >
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
                My orders
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 justify-start sm:col-span-2">
              <Link to="/subscriptions">
                <Repeat aria-hidden="true" />
                My subscriptions
              </Link>
            </Button>
            {user?.role === "DELIVERY_BOY" && (
              <Button asChild className="h-12 justify-start sm:col-span-2">
                <Link to="/delivery">
                  <Bike aria-hidden="true" />
                  Open my deliveries
                </Link>
              </Button>
            )}
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
      )}
    </div>
  )
}

export default UserDashboardPage
