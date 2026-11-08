/**
 * CustomerLayout – the frame around every customer page (#23).
 *
 *   ┌ header: logo · nav · cart icon (with count) ┐
 *   │ <Outlet />  ← the current page renders here │
 *   └ footer                                      ┘
 *
 * `<Outlet />` is React Router's placeholder for the CHILD route. The header
 * is rendered once and stays in place while only the page content changes.
 */
import { ClipboardList, ShoppingCart } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import { Logo } from '@/components/common/Logo'
import { useCart } from '@/hooks/useCart'
import { cn } from '@/lib/utils'

export function CustomerLayout() {
  const { itemCount } = useCart()

  return (
    <div className="flex min-h-svh flex-col">
      {/* sticky: the header stays visible while scrolling, so the cart is always one tap away. */}
      <header className="sticky top-0 z-30 border-b bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
          <Link to="/" aria-label="DairyCart home">
            <Logo />
          </Link>

          <nav className="flex items-center gap-1" aria-label="Main">
            <NavLink
              to="/orders"
              // NavLink gives `isActive`, so the current page's link can be highlighted.
              className={({ isActive }) =>
                cn(
                  'flex h-10 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-muted',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <ClipboardList className="size-5" aria-hidden="true" />
              <span className="hidden sm:inline">My orders</span>
              <span className="sr-only sm:hidden">My orders</span>
            </NavLink>

            <NavLink
              to="/cart"
              className={({ isActive }) =>
                cn(
                  'relative flex size-11 items-center justify-center rounded-xl hover:bg-muted',
                  isActive ? 'text-primary' : 'text-foreground',
                )
              }
              // The label includes the count, so screen-reader users hear "Cart, 3 items".
              aria-label={`Cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
            >
              <ShoppingCart className="size-6" aria-hidden="true" />
              {itemCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground"
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Page gutter 16 / 24 / 32 px and max width 1200 px (design-system.md). */}
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>

      <footer className="border-t bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground md:px-6 lg:px-8">
          <span>DairyCart · Milk Delivery POC (learning project)</span>
          <Link to="/admin" className="font-semibold hover:text-foreground">
            Admin
          </Link>
        </div>
      </footer>
    </div>
  )
}
