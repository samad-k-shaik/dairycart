/**
 * useLiveStream (#113): keep a Server-Sent Events stream open and put every snapshot into
 * the TanStack Query cache under `queryKey`, so the page shows it at once.
 *
 * Returns `connected`. Pages use it to switch polling OFF while the stream works and back
 * ON when it does not (refetchInterval: connected ? false : 10_000): if the stream ever
 * fails, the page silently falls back to polling every 10 s.
 *
 * Reconnects after the stream ends (normal after 25 min) or fails, waiting 1 s, 2 s, 5 s,
 * then 10 s between attempts. Stops for good on 401/403/404 (no access) and when the page
 * is left (AbortController).
 */
import { useEffect, useState } from "react"
import { useQueryClient, type QueryKey } from "@tanstack/react-query"

import { reconnectDelay } from "@/lib/sse"
import { StreamRefusedError, streamSnapshots } from "@/services/liveStream"
import { USE_MOCKS } from "@/services/mockMode"

export function useLiveStream(path: string | null, queryKey: QueryKey): boolean {
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)
  const keyText = JSON.stringify(queryKey)

  useEffect(() => {
    if (!path || USE_MOCKS || typeof TextDecoderStream === "undefined") return
    const key = JSON.parse(keyText) as QueryKey
    const controller = new AbortController()
    let attempt = 0

    async function run() {
      while (!controller.signal.aborted) {
        try {
          await streamSnapshots(
            path!,
            (data) => {
              queryClient.setQueryData(key, data)
              setConnected(true)
              attempt = 0 // a working stream resets the waiting time
            },
            controller.signal,
          )
        } catch (error) {
          if (controller.signal.aborted || error instanceof StreamRefusedError) break
        }
        setConnected(false)
        await new Promise((resolve) => setTimeout(resolve, reconnectDelay(attempt++)))
      }
      setConnected(false)
    }

    void run()
    return () => controller.abort()
  }, [path, keyText, queryClient])

  return connected
}
