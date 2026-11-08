/**
 * Route map: every URL in the app and the page it shows.
 *
 * Nested routes: a layout is the PARENT route and its pages are CHILDREN.
 * React Router renders the parent layout and puts the matching child page
 * into the layout's <Outlet />. So the header/sidebar is written once.
 */
import { createBrowserRouter } from "react-router"

import AdminLayout from "@/layouts/AdminLayout"
import CustomerLayout from "@/layouts/CustomerLayout"
import DashboardPage from "@/pages/admin/DashboardPage"
import OrdersPage from "@/pages/admin/OrdersPage"
import ProductsPage from "@/pages/admin/ProductsPage"
import CartPage from "@/pages/customer/CartPage"
import CheckoutPage from "@/pages/customer/CheckoutPage"
import HomePage from "@/pages/customer/HomePage"
import OrderConfirmationPage from "@/pages/customer/OrderConfirmationPage"
import OrderHistoryPage from "@/pages/customer/OrderHistoryPage"
import ProductDetailsPage from "@/pages/customer/ProductDetailsPage"
import DesignPage from "@/pages/DesignPage"
import NotFoundPage from "@/pages/NotFoundPage"

export const router = createBrowserRouter([
  {
    // Customer route tree.
    path: "/",
    element: <CustomerLayout />,
    children: [
      { index: true, element: <HomePage /> }, // "index" = the parent's own URL, "/"
      { path: "products/:id", element: <ProductDetailsPage /> }, // ":id" is a URL parameter
      { path: "cart", element: <CartPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      { path: "orders", element: <OrderHistoryPage /> },
      { path: "orders/:id/confirmation", element: <OrderConfirmationPage /> },
      { path: "*", element: <NotFoundPage /> }, // "*" = any URL not matched above
    ],
  },
  {
    // Admin route tree (ADR-002: same app, separate tree and layout).
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "*", element: <NotFoundPage homePath="/admin" /> },
    ],
  },
  // TEMPORARY design review page (M2-02); no layout. Remove after M2-14 approval.
  { path: "/design", element: <DesignPage /> },
])
