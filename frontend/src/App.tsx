/**
 * App: the root component.
 * RouterProvider reads the URL and shows the matching layout + page from src/routes/router.tsx.
 * CartProvider shares one cart with every page (header count, home, details, cart page).
 */
import { RouterProvider } from "react-router/dom"

import { DevMockSwitch } from "@/components/common/DevMockSwitch"
import { Toaster } from "@/components/ui/sonner"
import { CartProvider } from "@/hooks/cart/CartProvider"
import { router } from "@/routes/router"

function App() {
  return (
    <CartProvider>
      <RouterProvider router={router} />
      {/* One Toaster for the whole app: toast("...") calls appear here. */}
      <Toaster />
      {/* Dev-only mock controls; removed from production builds (import.meta.env.DEV is false). */}
      {import.meta.env.DEV && <DevMockSwitch />}
    </CartProvider>
  )
}

export default App
