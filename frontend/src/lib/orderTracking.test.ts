import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { trackingHeadline, trackingMarkers } from "./orderTracking.ts"
import type { OrderTracking } from "../types/tracking.ts"

const NOW = Date.parse("2026-11-16T08:00:00Z")

const TRACKING: OrderTracking = {
  order_id: 41,
  status: "OUT_FOR_DELIVERY",
  delivery_boy: {
    name: "Ravi",
    position: { latitude: 17.4465, longitude: 78.4483 },
    updated_at: "2026-11-16T07:59:50Z",
    is_stale: false,
  },
  destination: { latitude: 17.4375, longitude: 78.4483 },
  distance_km: 1,
  eta_minutes: 3,
}

describe("customer tracking (#112)", () => {
  it("shows the home and the delivery boy", () => {
    assert.deepEqual(
      trackingMarkers(TRACKING).map((m) => [m.id, m.kind]),
      [
        ["home", "home"],
        ["boy", "delivery-boy"],
      ],
    )
  })

  it("leaves out what is not known", () => {
    assert.deepEqual(trackingMarkers({ ...TRACKING, destination: null }).map((m) => m.id), ["boy"])
    assert.deepEqual(trackingMarkers({ ...TRACKING, delivery_boy: null }).map((m) => m.id), ["home"])
  })

  it("says how far away he is", () => {
    assert.equal(trackingHeadline(TRACKING, NOW), "Ravi is about 3 min away · 1.0 km")
  })

  it("is honest when the location is old or missing", () => {
    const stale = { ...TRACKING, delivery_boy: { ...TRACKING.delivery_boy!, updated_at: "2026-11-16T07:55:00Z", is_stale: true } }
    assert.equal(trackingHeadline(stale, NOW), "Ravi was last seen 5 min ago.")
    assert.match(trackingHeadline({ ...TRACKING, delivery_boy: null }, NOW), /not available right now/)
    assert.equal(trackingHeadline({ ...TRACKING, distance_km: null, eta_minutes: null }, NOW), "Ravi is on the way.")
  })
})
