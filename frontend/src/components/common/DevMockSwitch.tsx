/**
 * DevMockSwitch – a small DEVELOPMENT-ONLY panel (bottom-right corner) (#32).
 *
 * Lets you make the mock services Normal / Slow / Failing, to check every
 * screen's loading skeletons and error states without editing code. It can
 * also reset the mock orders back to the original JSON.
 *
 * It renders nothing in a production build (`import.meta.env.DEV` is false),
 * and the whole component is deleted in M3 together with the mock services.
 */
import { useQueryClient } from '@tanstack/react-query'
import { FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { mockDb } from '@/services/mock/mockDb'
import { getMockMode, setMockMode, type MockMode } from '@/services/mock/mockServer'
import { cn } from '@/lib/utils'

const MODES: { value: MockMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'slow', label: 'Slow' },
  { value: 'error', label: 'Error' },
]

export function DevMockSwitch() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<MockMode>(getMockMode)

  if (!import.meta.env.DEV) return null

  function changeMode(next: MockMode) {
    setMockMode(next)
    setMode(next)
    // Drop cached data so every screen re-requests and shows the new behaviour.
    void queryClient.resetQueries()
  }

  function resetData() {
    mockDb.reset()
    void queryClient.resetQueries()
  }

  return (
    <div className="fixed right-3 bottom-24 z-40 text-xs md:bottom-3">
      {/* bottom-24 on phones keeps it above the sticky "Add to cart" bar. */}
      {open && (
        <div className="mb-2 w-52 rounded-2xl border border-border bg-surface p-3 shadow-lg">
          <p className="mb-2 font-bold">Mock API (dev only)</p>
          <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Mock API mode">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mode === m.value}
                onClick={() => changeMode(m.value)}
                className={cn(
                  'rounded-lg border px-2 py-1.5 font-semibold',
                  mode === m.value ? 'border-primary bg-primary-soft text-primary' : 'border-border hover:bg-muted',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={resetData} className="mt-2 w-full rounded-lg border border-border px-2 py-1.5 font-semibold hover:bg-muted">
            Reset mock data
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          'ml-auto flex items-center gap-1.5 rounded-full border px-3 py-2 font-semibold shadow-md',
          mode === 'normal' ? 'border-border bg-surface' : 'border-amber-300 bg-amber-50 text-amber-800',
        )}
      >
        <FlaskConical className="size-3.5" aria-hidden="true" />
        Mock: {mode}
      </button>
    </div>
  )
}
