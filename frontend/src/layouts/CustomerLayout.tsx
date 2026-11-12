/**
 * CustomerLayout: the frame around every customer page.
 * The header is written once here; each page renders inside <Outlet />.
 */
import { NavLink, Outlet } from "react-router"
import { House, LogIn, ReceiptText, ShoppingCart, UserRound } from "lucide-react"

import { DevCrashProbe } from "@/components/common/DevMockSwitch"
import { Logo } from "@/components/common/Logo"
import { useAuth } from "@/hooks/useAuth"
import { useCart } from "@/hooks/useCart"
import { cn } from "@/lib/utils"

/** Served from frontend/public, so the path starts at the site root. */
const BACKGROUND_IMAGE = "/images/backgrounds/dairy-barn.webp"

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
  const { user } = useAuth()

  return (
    // `isolate` starts a new stacking layer, so the -z-10 background below sits behind the
    // page content but still in front of the body's plain grey colour.
    // `[--muted-foreground:…]`: grey text is one shade darker (slate-600) on customer pages,
    // because over the darkest part of the photo the normal grey (#64748b) is only ~3.3:1
    // contrast; #475569 keeps it above the WCAG AA minimum of 4.5:1 (#93).
    // `customer-type`: Fraunces headings, prices and logo on customer pages only (#95, index.css).
    <div className="customer-type isolate flex min-h-screen flex-col [--muted-foreground:#475569]">
      {/*
        #93: dairy-barn photo behind every customer page (admin pages do not use this layout).
        - `fixed inset-0`: it fills the window and does not scroll with the page.
        - The second layer is a thin veil (page colour at 35%, #94) so the photo stays bright;
          text that sits straight on the photo uses the `photo-panel` class (index.css).
        - aria-hidden: it is decoration, screen readers skip it.
        Photo: "Cows feeding in a long barn aisle" by Ahmad Nasihin, Unsplash License.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${BACKGROUND_IMAGE})` }}
      />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-background/35" />

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
            {/* #89: "Account" when logged in, otherwise "Log in". */}
            {user ? (
              <NavLink to="/account" className={navLinkClass} aria-label={`Account, ${user.username}`}>
                <UserRound className="size-5" aria-hidden="true" />
                <span className="hidden sm:inline">Account</span>
              </NavLink>
            ) : (
              <NavLink to="/login" className={navLinkClass}>
                <LogIn className="size-5" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Log in</span>
              </NavLink>
            )}
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
