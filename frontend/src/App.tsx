/**
 * App: the root component.
 * RouterProvider reads the URL and shows the matching layout + page from src/routes/router.tsx.
 * CartProvider shares one cart with every page (header count, home, details, cart page).
 */
import { RouterProvider } from "react-router/dom"

import { Toaster } from "@/components/ui/sonner"
import { CartProvider } from "@/hooks/cart/CartProvider"
import { router } from "@/routes/router"

function App() {
  return (
    <CartProvider>
      <RouterProvider router={router} />
      {/* One Toaster for the whole app: toast("...") calls appear here. */}
      <Toaster />
    </CartProvider>
  )
}

export default App
