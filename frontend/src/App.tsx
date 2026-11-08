/**
 * App – the root component. It sets up the app-wide "providers" and the router.
 *
 * A provider makes something available to every component below it:
 *   ErrorBoundary        – last-resort safety net for unexpected crashes (#32)
 *   QueryClientProvider  – TanStack Query cache for server data (products, orders)
 *   CartProvider         – the shopping cart (#26)
 *   RouterProvider       – shows the page that matches the current URL (#23)
 *   Toaster              – toast notifications ("Added to cart")
 *   DevMockSwitch        – dev-only mock API controls (#32), hidden in production
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router/dom'
import { DevMockSwitch } from '@/components/common/DevMockSwitch'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Toaster } from '@/components/ui/sonner'
import { CartProvider } from '@/hooks/cart/CartProvider'
import { router } from '@/routes/router'
import { isApiRequestError } from '@/services/apiError'

/**
 * Created ONCE, outside the component, so the cache survives re-renders.
 * Defaults:
 *  - staleTime 30s: data younger than 30s is reused without refetching.
 *  - retry: try failed requests again up to 2 times, EXCEPT client errors
 *    (4xx like 404 "not found"), which will not succeed on a retry.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (isApiRequestError(error) && error.status < 500) return false
        return failureCount < 2
      },
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <RouterProvider router={router} />
          <Toaster position="top-center" richColors={false} />
          <DevMockSwitch />
        </CartProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
