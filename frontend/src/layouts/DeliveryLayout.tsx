/**
 * DeliveryLayout (#109): the delivery boy's pages, made for a phone held in one hand.
 * A slim header (logo, his name, Log out) and one column of content.
 * #110: Log out first stops his round, so his last position is not kept after he leaves.
 */
import { Outlet, useNavigate } from "react-router"
import { LogOut } from "lucide-react"

import { Logo } from "@/components/common/Logo"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { stopRound } from "@/services/deliveryService"

function DeliveryLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    // Stopping a round that is not running does nothing; a network error must not block logout.
    await stopRound().catch(() => {})
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between gap-3 px-4">
          <Logo to="/delivery" label="Deliveries" />
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-small font-semibold">{user?.full_name}</span>
            <Button variant="ghost" className="h-11" onClick={handleLogout}>
              <LogOut aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Log out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-5">
        <Outlet />
      </main>
    </div>
  )
}

export default DeliveryLayout
