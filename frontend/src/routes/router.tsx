/**
 * Route map: every URL in the app and the page it shows.
 *
 * Nested routes: a layout is the PARENT route and its pages are CHILDREN.
 * React Router renders the parent layout and puts the matching child page
 * into the layout's <Outlet />. So the header/sidebar is written once.
 */
import { createBrowserRouter } from "react-router"

import { RequireAuth } from "@/components/auth/RequireAuth"
import { RouteErrorFallback } from "@/components/common/RouteErrorFallback"
import AdminLayout from "@/layouts/AdminLayout"
import CustomerLayout from "@/layouts/CustomerLayout"
import DashboardPage from "@/pages/admin/DashboardPage"
import OrdersPage from "@/pages/admin/OrdersPage"
import ProductsPage from "@/pages/admin/ProductsPage"
import UsersPage from "@/pages/admin/UsersPage"
import LoginPage from "@/pages/auth/LoginPage"
import SignUpPage from "@/pages/auth/SignUpPage"
import CartPage from "@/pages/customer/CartPage"
import CheckoutPage from "@/pages/customer/CheckoutPage"
import HomePage from "@/pages/customer/HomePage"
import OrderConfirmationPage from "@/pages/customer/OrderConfirmationPage"
import OrderDetailsPage from "@/pages/customer/OrderDetailsPage"
import OrderHistoryPage from "@/pages/customer/OrderHistoryPage"
import ProductDetailsPage from "@/pages/customer/ProductDetailsPage"
import UserDashboardPage from "@/pages/customer/UserDashboardPage"
import DesignPage from "@/pages/DesignPage"
import NotFoundPage from "@/pages/NotFoundPage"

export const router = createBrowserRouter([
  {
    // Customer route tree.
    path: "/",
    element: <CustomerLayout />,
    // If a page crashes, show our friendly fallback instead of React Router's technical screen.
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: <HomePage /> }, // "index" = the parent's own URL, "/"
      { path: "products/:id", element: <ProductDetailsPage /> }, // ":id" is a URL parameter
      { path: "cart", element: <CartPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      { path: "orders", element: <OrderHistoryPage /> }, // ?phone=... in the query string
      { path: "orders/:id", element: <OrderDetailsPage /> }, // added in M2-10 (#29)
      { path: "orders/:id/confirmation", element: <OrderConfirmationPage /> },
      // Accounts (#89). Ordering itself does not need an account (guest checkout).
      { path: "signup", element: <SignUpPage /> },
      { path: "login", element: <LoginPage /> },
      {
        path: "account", // the User Dashboard
        element: (
          <RequireAuth>
            <UserDashboardPage />
          </RequireAuth>
        ),
      },
      { path: "*", element: <NotFoundPage /> }, // "*" = any URL not matched above
    ],
  },
  {
    // Admin route tree (ADR-002: same app, separate tree and layout).
    path: "/admin",
    // Admins only (#89): not logged in → /login; logged in as a USER → "Admins only".
    element: (
      <RequireAuth role="ADMIN">
        <AdminLayout />
      </RequireAuth>
    ),
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "*", element: <NotFoundPage homePath="/admin" /> },
    ],
  },
  // TEMPORARY design review page (M2-02); no layout. Remove after M2-14 approval.
  { path: "/design", element: <DesignPage />, errorElement: <RouteErrorFallback /> },
])
