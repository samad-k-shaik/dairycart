import assert from "node:assert/strict"
import { describe, it } from "vitest"

import { agoLabel, distanceMeters, isAccurateEnough, shouldSend, toLocationBody } from "./tracking.ts"

const AMEERPET = { lat: 17.4375, lng: 78.4483 }

describe("distance (#110)", () => {
  it("is zero for the same point", () => {
    assert.equal(distanceMeters(AMEERPET, AMEERPET), 0)
  })

  it("matches known distances", () => {
    // 0.001° of latitude ≈ 111 m everywhere on Earth.
    const north = { lat: AMEERPET.lat + 0.001, lng: AMEERPET.lng }
    assert.ok(Math.abs(distanceMeters(AMEERPET, north) - 111.2) < 0.5)
    // Ameerpet → Hitech City is about 8 km in a straight line.
    const hitech = { lat: 17.4474, lng: 78.3762 }
    const km = distanceMeters(AMEERPET, hitech) / 1000
    assert.ok(km > 7.5 && km < 8.0, String(km))
  })
})

describe("when to send a reading (#110)", () => {
  const sent = { position: AMEERPET, sentAt: 100_000 }
  const near = { lat: AMEERPET.lat + 0.0001, lng: AMEERPET.lng } // about 11 m
  const far = { lat: AMEERPET.lat + 0.0003, lng: AMEERPET.lng } // about 33 m

  it("sends the first reading at once", () => {
    assert.equal(shouldSend(null, AMEERPET, 0), true)
  })

  it("never sends twice within 5 s, even after moving", () => {
    assert.equal(shouldSend(sent, far, 104_000), false)
  })

  it("sends after moving 20 m (between 5 and 10 s)", () => {
    assert.equal(shouldSend(sent, far, 106_000), true)
    assert.equal(shouldSend(sent, near, 106_000), false)
  })

  it("sends every 10 s even when standing still", () => {
    assert.equal(shouldSend(sent, AMEERPET, 110_000), true)
  })
})

describe("reading quality and format (#110)", () => {
  it("skips readings worse than 100 m", () => {
    assert.equal(isAccurateEnough(15), true)
    assert.equal(isAccurateEnough(100), true)
    assert.equal(isAccurateEnough(450), false)
    assert.equal(isAccurateEnough(null), true)
  })

  it("builds the request body with 6 decimals and an ISO time", () => {
    const body = toLocationBody({ lat: 17.43751234, lng: 78.44839876 }, 12.6, Date.UTC(2026, 10, 16, 3, 15))
    assert.deepEqual(body, {
      latitude: 17.437512,
      longitude: 78.448399,
      accuracy_m: 13,
      recorded_at: "2026-11-16T03:15:00.000Z",
    })
  })

  it("says how long ago the last update was", () => {
    assert.equal(agoLabel(0, 2_000), "just now")
    assert.equal(agoLabel(0, 25_000), "25 s ago")
    assert.equal(agoLabel(0, 185_000), "3 min ago")
  })
})
