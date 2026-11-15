/**
 * Keep open tabs in sync (e.g. admin tab + shop tab).
 *
 * Every page caches its data for 30 s (lib/queryClient.ts). Without this, a product the
 * admin adds in one tab would not show in another open tab until that cache expires or
 * the page is reloaded. So: after any SUCCESSFUL change (a mutation) in this tab, we post
 * a message on a BroadcastChannel; every other tab of the app receives it and marks its
 * cached queries as out of date, which refetches the ones on screen.
 *
 * Only a "something changed" signal is sent, never data: each tab asks the backend itself.
 */
import type { QueryClient } from "@tanstack/react-query"

const CHANNEL_NAME = "dairycart-data-changed"

export function syncQueriesAcrossTabs(queryClient: QueryClient): void {
  if (typeof BroadcastChannel === "undefined") return // very old browsers: just no sync

  const channel = new BroadcastChannel(CHANNEL_NAME)

  queryClient.getMutationCache().subscribe((event) => {
    if (event.type === "updated" && event.action.type === "success") {
      channel.postMessage("changed")
    }
  })

  // Messages only arrive in OTHER tabs (a channel never receives its own messages).
  channel.onmessage = () => {
    void queryClient.invalidateQueries()
  }
}
