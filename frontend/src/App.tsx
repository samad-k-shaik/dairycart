/**
 * App: the root component.
 * RouterProvider reads the URL and shows the matching layout + page from src/routes/router.tsx.
 */
import { RouterProvider } from "react-router/dom"

import { Toaster } from "@/components/ui/sonner"
import { router } from "@/routes/router"

function App() {
  return (
    <>
      <RouterProvider router={router} />
      {/* One Toaster for the whole app: toast("...") calls appear here. */}
      <Toaster />
    </>
  )
}

export default App
