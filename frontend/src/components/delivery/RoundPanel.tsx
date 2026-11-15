/**
 * RoundPanel (#110): "Start round" / "Stop round" at the top of the delivery boy's page.
 *
 * Before starting, it says plainly what is shared and with whom (consent, NFR-17). While
 * the round runs, it shows whether the location is being sent ("last sent 25 s ago").
 */
import { useEffect, useState } from "react"
import { Loader2, Navigation, Square } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useStartRound, useStopRound } from "@/hooks/useDelivery"
import { useLocationSharing } from "@/hooks/useLocationSharing"
import { agoLabel } from "@/lib/tracking"
import { cn } from "@/lib/utils"
import { ServiceError } from "@/services/serviceError"

export function RoundPanel({ onRound }: { onRound: boolean }) {
  const start = useStartRound()
  const stop = useStopRound()
  const sharing = useLocationSharing(onRound)
  const now = useNow(onRound)
  const busy = start.isPending || stop.isPending

  function fail(error: Error) {
    toast.error(error instanceof ServiceError ? error.message : "Please try again.")
  }

  if (!onRound) {
    return (
      <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-card" aria-labelledby="round-title">
        <h2 id="round-title" className="text-h3 font-semibold">
          Ready to go?
        </h2>
        <p className="text-small text-muted-foreground">
          When you start your round, this phone shares its location with the dairy, and with each customer whose
          order is out for delivery. Sharing stops when you press <span className="font-semibold">Stop round</span>.
          Keep this page open: the screen stays on.
        </p>
        <Button className="h-12 w-full" onClick={() => start.mutate(undefined, { onError: fail })} disabled={busy}>
          {start.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Navigation aria-hidden="true" />}
          Start round
        </Button>
      </section>
    )
  }

  const status =
    sharing.phase === "sharing" && sharing.lastSentAt !== null
      ? `Sharing your location · sent ${agoLabel(sharing.lastSentAt, now)}`
      : sharing.phase === "error"
        ? "Location is not being shared"
        : "Finding your location…"

  return (
    <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-card" aria-labelledby="round-title">
      <h2 id="round-title" className="flex items-center gap-2 text-h3 font-semibold">
        <span
          className={cn(
            "size-2.5 rounded-full",
            sharing.phase === "sharing" ? "animate-pulse bg-success" : sharing.phase === "error" ? "bg-danger" : "bg-warning",
          )}
          aria-hidden="true"
        />
        On your round
      </h2>
      <p className="text-small" aria-live="polite">
        {status}
      </p>
      {sharing.error && (
        <p role="alert" className="text-small text-destructive">
          {sharing.error}
        </p>
      )}
      <p className="text-small text-muted-foreground">Sharing pauses if you lock the phone or switch to another app.</p>
      <Button
        variant="outline"
        className="h-12 w-full"
        onClick={() => stop.mutate(undefined, { onError: fail })}
        disabled={busy}
      >
        {stop.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Square aria-hidden="true" />}
        Stop round
      </Button>
    </section>
  )
}

/** The current time, updated every 5 s while `ticking` (for "sent 25 s ago"). */
function useNow(ticking: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!ticking) return
    const timer = window.setInterval(() => setNow(Date.now()), 5_000)
    return () => window.clearInterval(timer)
  }, [ticking])
  return now
}
