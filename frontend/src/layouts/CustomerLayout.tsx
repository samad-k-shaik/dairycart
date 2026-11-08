/**
 * CustomerLayout: the frame around every customer page.
 * The header is written once here; each page renders inside <Outlet />.
 */
import { NavLink, Outlet } from "react-router"
import { House, ReceiptText, ShoppingCart } from "lucide-react"

import { DevCrashProbe } from "@/components/common/DevMockSwitch"
import { Logo } from "@/components/common/Logo"
import { useCart } from "@/hooks/useCart"
import { cn } from "@/lib/utils"

/**
 * Style for header links. NavLink passes `isActive`, so the link for the current page is blue.
 * h-11 = 44px: the minimum comfortable touch target on phones.
 */
const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-3 font-semibold transition-colors",
    isActive ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
  )

function CustomerLayout() {
  // Re-renders whenever the cart changes, so the badge updates immediately.
  const { itemCount } = useCart()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-2 px-4 md:px-6 lg:px-8">
          <Logo />
          <nav aria-label="Main" className="ml-auto flex items-center gap-1">
            {/* `end`: "/" is active only on the home page, not on every page under it. */}
            <NavLink to="/" end className={navLinkClass}>
              <House className="size-5" aria-hidden="true" />
              {/* Visible from 640px; on phones the icon shows and screen readers still read the text. */}
              <span className="sr-only sm:not-sr-only">Home</span>
            </NavLink>
            <NavLink to="/orders" end className={navLinkClass}>
              <ReceiptText className="size-5" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">My orders</span>
            </NavLink>
            <NavLink
              to="/cart"
              className={navLinkClass}
              aria-label={`Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            >
              <span className="relative">
                <ShoppingCart className="size-5" aria-hidden="true" />
                {itemCount > 0 && (
                  <span
                    data-testid="cart-count"
                    className="absolute -top-2 -right-3 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
                  >
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </span>
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Page gutter: 16px mobile, 24px tablet, 32px desktop; max content width 1200px. */}
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 md:px-6 lg:px-8">
        <Outlet />
        {import.meta.env.DEV && <DevCrashProbe />}
      </main>

      <footer className="border-t bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-small text-muted-foreground md:px-6 lg:px-8">
          <span>DairyCart · Milk Delivery POC</span>
          <NavLink to="/admin" className="font-semibold hover:text-primary">
            Admin
          </NavLink>
        </div>
      </footer>
    </div>
  )
}

export default CustomerLayout
