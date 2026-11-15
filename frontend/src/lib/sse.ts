/**
 * Server-Sent Events parser (#113). Pure, tested in lib/sse.test.ts.
 * (Relative ".ts" imports so Node's test runner can load this.)
 *
 * The browser's built-in EventSource cannot send our `Authorization: Bearer` header, so we
 * read the stream with fetch() and parse the text ourselves. The format is simple:
 *
 *     event: snapshot          ← a field "name: value"
 *     data: {"n": 1}           ← (several data lines are joined with "\n")
 *                              ← an EMPTY line ends one event
 *     : ping                   ← a line starting with ":" is a comment (keep-alive)
 *
 * Network chunks can end in the middle of a line, so the parser keeps the unfinished
 * part until the next chunk arrives.
 */

export type SseEvent = { event: string; data: string }

export function createSseParser() {
  let buffer = ""

  /** Feed one chunk of text; get back every event it completed. */
  function push(chunk: string): SseEvent[] {
    buffer += chunk.replace(/\r\n?/g, "\n")
    const events: SseEvent[] = []
    let end: number
    while ((end = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)
      let event = "message"
      const data: string[] = []
      for (const line of block.split("\n")) {
        if (line === "" || line.startsWith(":")) continue // comment / keep-alive
        const colon = line.indexOf(":")
        const field = colon === -1 ? line : line.slice(0, colon)
        const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "")
        if (field === "event") event = value
        else if (field === "data") data.push(value)
      }
      if (data.length > 0) events.push({ event, data: data.join("\n") })
    }
    return events
  }

  return { push }
}

/** Wait before reconnecting: 1 s, 2 s, 5 s, then 10 s (so a down server is not hammered). */
export function reconnectDelay(attempt: number): number {
  return [1_000, 2_000, 5_000][attempt] ?? 10_000
}
