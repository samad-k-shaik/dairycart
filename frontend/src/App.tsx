/**
 * App: the root component.
 * RouterProvider reads the URL and shows the matching layout + page from src/routes/router.tsx.
 * CartProvider shares one cart with every page (header count, home, details, cart page).
 * AuthProvider shares who is logged in (#89).
 */
import { RouterProvider } from "react-router/dom"

import { DevMockSwitch } from "@/components/common/DevMockSwitch"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/hooks/auth/AuthProvider"
import { CartProvider } from "@/hooks/cart/CartProvider"
import { router } from "@/routes/router"
import { USE_MOCKS } from "@/services/mockMode"

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <RouterProvider router={router} />
        {/* One Toaster for the whole app: toast("...") calls appear here. */}
        <Toaster />
        {/* Mock controls: only in development AND only when VITE_USE_MOCKS=true. */}
        {import.meta.env.DEV && USE_MOCKS && <DevMockSwitch />}
      </CartProvider>
    </AuthProvider>
  )
}

export default App
