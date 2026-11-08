/**
 * All app routes (URL → page) in one place (#23, ADR-011 React Router).
 *
 * Two route TREES share one app (ADR-002):
 *   Customer pages render inside <CustomerLayout> (header with cart icon).
 *   Admin pages render inside <AdminLayout> (sidebar / top bar).
 * A layout route has `children`; the matching child appears at the layout's <Outlet />.
 *
 * `errorElement` catches a page that crashes while rendering and shows a
 * friendly fallback instead of a blank screen (#32).
 */
import { createBrowserRouter } from 'react-router'
import { AppErrorFallback } from '@/components/common/AppErrorFallback'
import { AdminLayout } from '@/layouts/AdminLayout'
import { CustomerLayout } from '@/layouts/CustomerLayout'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { OrdersPage } from '@/pages/admin/OrdersPage'
import { ProductsPage } from '@/pages/admin/ProductsPage'
import { CartPage } from '@/pages/customer/CartPage'
import { CheckoutPage } from '@/pages/customer/CheckoutPage'
import { HomePage } from '@/pages/customer/HomePage'
import { OrderConfirmationPage } from '@/pages/customer/OrderConfirmationPage'
import { OrderDetailsPage } from '@/pages/customer/OrderDetailsPage'
import { OrderHistoryPage } from '@/pages/customer/OrderHistoryPage'
import { ProductDetailsPage } from '@/pages/customer/ProductDetailsPage'
import { DesignPage } from '@/pages/DesignPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    // Customer route tree
    path: '/',
    element: <CustomerLayout />,
    errorElement: <AppErrorFallback />,
    children: [
      { index: true, element: <HomePage /> }, // "/"   (index = the parent's own path)
      { path: 'products/:id', element: <ProductDetailsPage /> }, // ":id" is a URL parameter
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'orders', element: <OrderHistoryPage /> },
      { path: 'orders/:id', element: <OrderDetailsPage /> },
      { path: 'orders/:id/confirmation', element: <OrderConfirmationPage /> },
      { path: 'design', element: <DesignPage /> }, // temporary (#21), remove after design approval
      { path: '*', element: <NotFoundPage /> }, // "*" = anything not matched above
    ],
  },
  {
    // Admin route tree
    path: '/admin',
    element: <AdminLayout />,
    errorElement: <AppErrorFallback />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
