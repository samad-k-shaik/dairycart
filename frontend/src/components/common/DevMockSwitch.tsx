/**
 * DEV-ONLY panel (bottom-left) to make the mock services slow, fail or return empty
 * lists, and to crash the current page — so every loading/empty/error state and the
 * error fallback can be seen and tested. Not rendered in production builds (see App.tsx).
 */
import { useEffect, useState } from "react"
import { FlaskConical } from "lucide-react"
import { toast } from "sonner"

import { queryClient } from "@/lib/queryClient"
import { resetMockDb } from "@/services/mock/mockServer"
import { MOCK_MODE_LABELS, MOCK_MODES, getMockMode, setMockMode, type MockMode } from "@/services/mock/mockSettings"
import { cn } from "@/lib/utils"

const CRASH_EVENT = "dairycart:dev-crash"

export function DevMockSwitch() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<MockMode>(getMockMode)

  function choose(next: MockMode) {
    setMockMode(next)
    setMode(next)
    // Forget cached data and refetch, so the chosen state shows straight away.
    queryClient.resetQueries()
  }

  return (
    <div className="fixed bottom-3 left-3 z-[60] text-small">
      {open && (
        <div className="mb-2 w-56 space-y-2 rounded-2xl border bg-surface p-3 shadow-lg" role="dialog" aria-label="Mock services (dev only)">
          <p className="font-bold">Mock services (dev only)</p>
          <fieldset className="space-y-1">
            <legend className="sr-only">Mock mode</legend>
            {MOCK_MODES.map((m) => (
              <label key={m} className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted">
                <input type="radio" name="mock-mode" value={m} checked={mode === m} onChange={() => choose(m)} />
                {MOCK_MODE_LABELS[m]}
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            onClick={() => {
              resetMockDb()
              queryClient.resetQueries()
              toast.success("Mock data reset to the original 8 orders")
            }}
            className="w-full rounded-lg border px-2 py-1.5 font-semibold hover:bg-muted"
          >
            Reset mock data
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(CRASH_EVENT))}
            className="w-full rounded-lg border border-red-200 px-2 py-1.5 font-semibold text-danger hover:bg-red-50"
          >
            Crash this page
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold shadow-card",
          mode === "normal" ? "bg-surface text-muted-foreground" : "bg-amber-50 text-amber-700",
        )}
      >
        <FlaskConical className="size-4" aria-hidden="true" />
        Mock: {mode}
      </button>
    </div>
  )
}

/**
 * Placed inside the layouts (dev only). When "Crash this page" is pressed it throws during
 * render, which React Router's errorElement catches — a real test of the error fallback.
 */
export function DevCrashProbe() {
  const [crash, setCrash] = useState(false)
  useEffect(() => {
    const onCrash = () => setCrash(true)
    window.addEventListener(CRASH_EVENT, onCrash)
    return () => window.removeEventListener(CRASH_EVENT, onCrash)
  }, [])
  if (crash) throw new Error("Simulated crash from the dev mock panel")
  return null
}
