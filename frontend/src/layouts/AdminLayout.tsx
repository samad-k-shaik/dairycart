/**
 * AdminLayout: the frame around every admin page.
 * Desktop (≥ 768px): sidebar on the left. Mobile: top bar with a row of links.
 * Each admin page renders inside <Outlet />.
 */
import { NavLink, Outlet, useNavigate } from "react-router"
import { ClipboardList, LayoutDashboard, LogOut, Package, Store, Users } from "lucide-react"

import { DevCrashProbe } from "@/components/common/DevMockSwitch"
import { Logo } from "@/components/common/Logo"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"

/** One list drives both the sidebar and the mobile bar, so they never disagree. */
const adminLinks = [
  // `end`: "/admin" is active only on the dashboard, not on /admin/orders too.
  { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Orders", Icon: ClipboardList, end: false },
  { to: "/admin/products", label: "Products", Icon: Package, end: false },
  { to: "/admin/users", label: "Users", Icon: Users, end: false }, // #89
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 font-semibold transition-colors",
    isActive ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
  )

/**
 * Mobile top bar: the 4 links share the row equally. The icon sits ABOVE the label
 * (like a phone tab bar), so all 4 fit at 360px while staying 44px+ tall to tap.
 */
const compactLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(linkClass({ isActive }), "h-auto min-h-11 min-w-0 flex-1 flex-col justify-center gap-0.5 px-1 py-1 text-xs")

function AdminLinks({ compact = false }: { compact?: boolean }) {
  return (
    <>
      {adminLinks.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={compact ? compactLinkClass : linkClass}>
          <Icon className={compact ? "size-4" : "size-5"} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </>
  )
}

function BackToShopLink() {
  return (
    <NavLink to="/" className={linkClass({ isActive: false })}>
      <Store className="size-5" aria-hidden="true" />
      Back to shop
    </NavLink>
  )
}

/** Logout (#89): forget the token and cached data, then show the login page. */
function useLogout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  return () => {
    logout()
    navigate("/login", { replace: true })
  }
}

function AdminLayout() {
  const { user } = useAuth()
  const handleLogout = useLogout()
  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar: hidden below 768px. */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r bg-surface p-4 md:flex">
        <Logo to="/admin" label="Admin" />
        <nav aria-label="Admin" className="flex flex-col gap-1">
          <AdminLinks />
        </nav>
        <div className="mt-auto space-y-1">
          <p className="truncate px-3 text-small text-muted-foreground">
            Logged in as <span className="font-semibold text-foreground">{user?.username}</span>
          </p>
          <button type="button" onClick={handleLogout} className={linkClass({ isActive: false }) + " w-full"}>
            <LogOut className="size-5" aria-hidden="true" />
            Log out
          </button>
          <BackToShopLink />
        </div>
      </aside>

      {/* Mobile top bar: hidden from 768px. */}
      <header className="sticky top-0 z-40 border-b bg-surface/95 backdrop-blur md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Logo to="/admin" label="Admin" />
          <div className="flex items-center">
            <NavLink
              to="/"
              aria-label="Back to shop"
              className="flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Store className="size-5" aria-hidden="true" />
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              className="flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <nav aria-label="Admin" className="flex gap-1 px-4 pb-2">
          <AdminLinks compact />
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 md:px-6 lg:px-8">
        <Outlet />
        {import.meta.env.DEV && <DevCrashProbe />}
      </main>
    </div>
  )
}

export default AdminLayout
