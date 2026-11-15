import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { boyStatus, liveMarkers } from "./liveMap.ts"
import type { LiveBoy } from "../types/liveMap.ts"

const NOW = Date.parse("2026-11-16T08:00:00Z")

function boy(id: number, changes: Partial<LiveBoy> = {}): LiveBoy {
  return {
    delivery_boy_id: id,
    name: `Boy ${id}`,
    phone: "9876500001",
    on_round: true,
    round_started_at: "2026-11-16T07:00:00Z",
    position: {
      latitude: 17.43,
      longitude: 78.44,
      accuracy_m: 10,
      updated_at: "2026-11-16T07:59:40Z",
      is_stale: false,
    },
    orders: [],
    ...changes,
  }
}

describe("live map pins (#111)", () => {
  it("draws a bike per delivery boy with a position, and a house per order pin", () => {
    const ravi = boy(1, {
      name: "Ravi",
      orders: [{ order_id: 41, status: "CONFIRMED", customer_name: "Asha", latitude: 17.44, longitude: 78.45 }],
    })
    const markers = liveMarkers([ravi, boy(2, { position: null })])

    assert.deepEqual(
      markers.map((m) => [m.id, m.kind]),
      [
        ["order-41", "home"],
        ["boy-1", "delivery-boy"],
      ],
    )
    assert.equal(markers[0].label, "#41 Asha · Confirmed · Ravi")
  })

  it("greys out a stale delivery boy", () => {
    const stale = boy(3, { position: { ...boy(3).position!, is_stale: true } })
    assert.equal(liveMarkers([stale])[0].stale, true)
  })
})

describe("delivery boy status line (#111)", () => {
  it("covers every state", () => {
    assert.deepEqual(boyStatus(boy(1, { on_round: false, position: null }), NOW), { text: "Not on a round", tone: "off" })
    assert.equal(boyStatus(boy(1, { position: null }), NOW).tone, "waiting")
    assert.deepEqual(boyStatus(boy(1), NOW), { text: "On a round · updated 20 s ago", tone: "live" })
    const stale = boy(1, { position: { ...boy(1).position!, updated_at: "2026-11-16T07:55:00Z", is_stale: true } })
    assert.equal(boyStatus(stale, NOW).tone, "stale")
    assert.match(boyStatus(stale, NOW).text, /5 min ago/)
  })
})
