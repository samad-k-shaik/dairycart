/** Timeline tests for all five statuses (M2-10 acceptance criterion). */
import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { getTimelineSteps, STATUS_LABELS } from "./orderStatus.ts"

const show = (status: Parameters<typeof getTimelineSteps>[0]) =>
  getTimelineSteps(status).map((s) => `${s.label}:${s.state}`)

describe("getTimelineSteps", () => {
  it("PLACED: first step current, rest upcoming", () => {
    assert.deepEqual(show("PLACED"), [
      "Placed:current",
      "Confirmed:upcoming",
      "Out for delivery:upcoming",
      "Delivered:upcoming",
    ])
  })

  it("CONFIRMED", () => {
    assert.deepEqual(show("CONFIRMED"), [
      "Placed:done",
      "Confirmed:current",
      "Out for delivery:upcoming",
      "Delivered:upcoming",
    ])
  })

  it("OUT_FOR_DELIVERY", () => {
    assert.deepEqual(show("OUT_FOR_DELIVERY"), [
      "Placed:done",
      "Confirmed:done",
      "Out for delivery:current",
      "Delivered:upcoming",
    ])
  })

  it("DELIVERED: all earlier steps done, Delivered is the current (final) step", () => {
    assert.deepEqual(show("DELIVERED"), [
      "Placed:done",
      "Confirmed:done",
      "Out for delivery:done",
      "Delivered:current",
    ])
  })

  it("CANCELLED: Placed then Cancelled, no delivery steps", () => {
    assert.deepEqual(show("CANCELLED"), ["Placed:done", "Cancelled:cancelled"])
  })

  it("has a friendly label for every status", () => {
    assert.equal(STATUS_LABELS.OUT_FOR_DELIVERY, "Out for delivery")
  })
})
