/**
 * Live stream reader (#113): open a Server-Sent Events stream from the backend WITH our
 * login token (EventSource cannot send headers), and call `onSnapshot` with each JSON
 * snapshot. Resolves when the server ends the stream (normal after 25 minutes).
 * Only the API base URL and the session come from the app; parsing is in lib/sse.ts.
 */
import { createSseParser } from "@/lib/sse"
import { readSession } from "@/lib/sessionStore"
import { API_BASE_URL } from "@/services/apiClient"

/** The server refused the stream: retrying will not help (401, 403, 404). */
export class StreamRefusedError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Live stream refused (${status})`)
    this.name = "StreamRefusedError"
    this.status = status
  }
}

export async function streamSnapshots(
  path: string,
  onSnapshot: (data: unknown) => void,
  signal: AbortSignal,
): Promise<void> {
  const session = readSession()
  const headers: Record<string, string> = { Accept: "text/event-stream" }
  if (session) headers.Authorization = `Bearer ${session.token}`

  const response = await fetch(API_BASE_URL + path, { headers, signal })
  if (response.status === 401 || response.status === 403 || response.status === 404) {
    throw new StreamRefusedError(response.status)
  }
  if (!response.ok || !response.body) throw new Error(`Live stream failed (${response.status})`)

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  const parser = createSseParser()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    for (const event of parser.push(value)) {
      if (event.event === "snapshot") onSnapshot(JSON.parse(event.data))
    }
  }
}
