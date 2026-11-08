/**
 * App: the root component. Every screen will eventually be rendered from here.
 *
 * A React component is just a function that returns JSX (HTML-like syntax).
 */
import { Toaster } from "@/components/ui/sonner"
import DesignPage from "@/pages/DesignPage"

function App() {
  // TEMPORARY page switch until routing arrives in M2-04 (#23), which replaces it.
  // Vite's dev server returns index.html for any path, so /design reaches this code.
  const isDesignPage = window.location.pathname === "/design"

  return (
    <>
      {isDesignPage ? <DesignPage /> : <HomePlaceholder />}
      {/* One Toaster for the whole app: toast("...") calls appear here. */}
      <Toaster />
    </>
  )
}

function HomePlaceholder() {
  return (
    <main className="mx-auto max-w-[1200px] space-y-2 px-4 py-8 md:px-6 lg:px-8">
      <h1 className="text-h1 font-bold">Milk Delivery POC</h1>
      <p className="text-muted-foreground">
        Screens are added in the next M2 issues. Design tokens:{" "}
        <a href="/design" className="font-semibold text-primary hover:underline">
          /design
        </a>
      </p>
    </main>
  )
}

export default App
