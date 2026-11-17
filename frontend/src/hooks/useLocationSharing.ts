/**
 * useLocationSharing (#110): while `onRound` is true, read the phone's GPS and send it to
 * the backend; stop completely when it becomes false.
 *
 * How it works:
 * - navigator.geolocation.watchPosition calls us whenever the phone has a new reading.
 *   lib/tracking.ts decides which readings are worth sending (every 10 s, or after 20 m,
 *   never more than every 5 s; skip readings worse than 100 m).
 * - A "heartbeat" asks for a fresh reading every 20 s, because some phones stay silent
 *   while he stands still at a door, and the maps would then show him as stale.
 * - A screen wake lock keeps the screen on during the round: a web page cannot track with
 *   the screen locked (a known limitation, ADR-018). The browser drops the lock when the
 *   page is hidden, so it is asked for again when the page comes back.
 * - The effect's cleanup stops everything: no GPS is used after "Stop round" or logout.
 */
import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { deliveryKeys } from "@/hooks/useDelivery"
import { locationErrorMessage } from "@/lib/address"
import { HEARTBEAT_MS, isAccurateEnough, shouldSend, toLocationBody, type SentReading } from "@/lib/tracking"
import { sendLocation } from "@/services/deliveryService"
import { ServiceError } from "@/services/serviceError"

export type SharingState = {
  /** off: not on a round · waiting: on a round, no reading sent yet · sharing · error */
  phase: "off" | "waiting" | "sharing" | "error"
  lastSentAt: number | null
  error: string | null
}

const OFF: SharingState = { phase: "off", lastSentAt: null, error: null }
const WAITING: SharingState = { phase: "waiting", lastSentAt: null, error: null }

function canShareLocation(): boolean {
  return "geolocation" in navigator && window.isSecureContext
}

export function useLocationSharing(onRound: boolean): SharingState {
  const queryClient = useQueryClient()
  // The state of the CURRENT round. "off" and "not supported" are not stored: they follow
  // directly from the inputs (see the return below), so no state update is needed for them.
  const [state, setState] = useState<SharingState>(WAITING)

  useEffect(() => {
    if (!onRound || !canShareLocation()) return

    let last: SentReading | null = null
    let sending = false
    let stopped = false

    function handle(position: GeolocationPosition) {
      if (stopped || sending || !isAccurateEnough(position.coords.accuracy)) return
      const point = { lat: position.coords.latitude, lng: position.coords.longitude }
      const now = Date.now()
      if (!shouldSend(last, point, now)) return

      sending = true
      sendLocation(toLocationBody(point, position.coords.accuracy ?? null, position.timestamp))
        .then(() => {
          last = { position: point, sentAt: now }
          if (!stopped) setState({ phase: "sharing", lastSentAt: now, error: null })
        })
        .catch((error: unknown) => {
          if (stopped) return
          // 409 ROUND_NOT_STARTED: the round was stopped elsewhere (another tab) → refresh.
          if (error instanceof ServiceError && error.status === 409) {
            void queryClient.invalidateQueries({ queryKey: deliveryKeys.me })
            return
          }
          // Network trouble: keep the round going; the next reading tries again.
          setState((current) => ({ ...current, error: "Could not send your location. Trying again…" }))
        })
        .finally(() => {
          sending = false
        })
    }

    function handleError(error: GeolocationPositionError) {
      if (!stopped) setState((current) => ({ ...current, phase: "error", error: locationErrorMessage(error.code) }))
    }

    // enableHighAccuracy: use GPS, not only Wi-Fi/cell towers. maximumAge: a reading up to
    // 5 s old is fine. timeout: give up on one reading after 20 s (then try the next).
    const options: PositionOptions = { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }
    const watchId = navigator.geolocation.watchPosition(handle, handleError, options)
    const heartbeat = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(handle, () => {}, options)
    }, HEARTBEAT_MS)

    return () => {
      stopped = true
      navigator.geolocation.clearWatch(watchId)
      window.clearInterval(heartbeat)
      setState(WAITING) // the next round starts fresh
    }
  }, [onRound, queryClient])

  useScreenWakeLock(onRound)
  if (!onRound) return OFF
  if (!canShareLocation()) return { phase: "error", lastSentAt: null, error: locationErrorMessage(null) }
  return state
}

/** Keep the screen on while `active` (where the browser supports the Wake Lock API). */
function useScreenWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    function request() {
      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          if (cancelled) void lock.release()
          else sentinel = lock
        })
        .catch(() => {
          // Refused (e.g. battery saver): sharing still works while the screen is on.
        })
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") request()
    }

    request()
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisibilityChange)
      void sentinel?.release().catch(() => {})
    }
  }, [active])
}
