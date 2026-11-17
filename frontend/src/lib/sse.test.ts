import assert from "node:assert/strict"
import { describe, it } from "vitest"

import { createSseParser, reconnectDelay } from "./sse.ts"

describe("SSE parser (#113)", () => {
  it("reads one event", () => {
    const parser = createSseParser()
    assert.deepEqual(parser.push('event: snapshot\ndata: {"n":1}\n\n'), [{ event: "snapshot", data: '{"n":1}' }])
  })

  it("ignores comments (keep-alive pings) and retry lines", () => {
    const parser = createSseParser()
    assert.deepEqual(parser.push("retry: 3000\n\n: ping\n\n"), [])
  })

  it("keeps a half-received event until the rest arrives", () => {
    const parser = createSseParser()
    assert.deepEqual(parser.push("event: snapshot\nda"), [])
    assert.deepEqual(parser.push('ta: {"n":2}\n'), [])
    assert.deepEqual(parser.push("\n"), [{ event: "snapshot", data: '{"n":2}' }])
  })

  it("reads several events from one chunk, joins data lines, accepts \\r\\n", () => {
    const parser = createSseParser()
    const events = parser.push("data: a\ndata: b\n\nevent: snapshot\r\ndata: c\r\n\r\n")
    assert.deepEqual(events, [
      { event: "message", data: "a\nb" },
      { event: "snapshot", data: "c" },
    ])
  })
})

describe("reconnecting (#113)", () => {
  it("waits longer after each failure, up to 10 s", () => {
    assert.deepEqual([0, 1, 2, 3, 9].map(reconnectDelay), [1_000, 2_000, 5_000, 10_000, 10_000])
  })
})
