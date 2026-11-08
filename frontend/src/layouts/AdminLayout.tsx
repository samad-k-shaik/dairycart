/**
 * AdminLayout – the frame around every admin page (#23).
 *
 *  Desktop (lg+):  fixed SIDEBAR on the left, page on the right.
 *  Mobile:         TOP BAR with the logo and a scrollable row of links.
 *
 * Both menus are built from the same NAV_ITEMS list, so they never disagree.
 *
 * NOTE: admin pages are NOT protected in the POC (ADR-003, no login). Before
 * any real use, authentication must be added (out of scope for now).
 */
import { LayoutDashboard, type LucideIcon, Package, ShoppingBag, Store } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import { Logo } from '@/components/common/Logo'
import { cn } from '@/lib/utils'

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  // `end`: "/admin" is only active on exactly /admin, not on /admin/orders.
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/products', label: 'Products', icon: Package },
]

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 font-semibold transition-colors',
    isActive ? 'bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )
}

export function AdminLayout() {
  return (
    <div className="min-h-svh lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r bg-surface p-4 lg:sticky lg:top-0 lg:flex lg:h-svh">
        <Link to="/admin" aria-label="Admin dashboard">
          <Logo subtitle="Admin" />
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Admin">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navClass}>
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="mt-auto flex h-10 items-center gap-2.5 rounded-xl px-3 font-semibold text-muted-foreground hover:bg-muted">
          <Store className="size-5" aria-hidden="true" />
          View shop
        </Link>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b bg-surface lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/admin" aria-label="Admin dashboard">
            <Logo subtitle="Admin" />
          </Link>
          <Link to="/" className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            <Store className="size-4" aria-hidden="true" />
            Shop
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Admin">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navClass}>
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1200px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
