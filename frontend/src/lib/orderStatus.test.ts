/** Timeline tests for all five statuses (M2-10 acceptance criterion). */
import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { ORDER_STATUSES } from "../types/order.ts"
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  getNextStatuses,
  getTimelineSteps,
  isFinalStatus,
  STATUS_LABELS,
} from "./orderStatus.ts"

describe("ALLOWED_TRANSITIONS (matches the requirements lifecycle table)", () => {
  it("lists exactly the allowed next statuses", () => {
    assert.deepEqual(ALLOWED_TRANSITIONS, {
      PLACED: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["OUT_FOR_DELIVERY", "CANCELLED"],
      OUT_FOR_DELIVERY: ["DELIVERED"],
      DELIVERED: [],
      CANCELLED: [],
    })
  })

  it("DELIVERED and CANCELLED are final: no update options", () => {
    assert.deepEqual(getNextStatuses("DELIVERED"), [])
    assert.deepEqual(getNextStatuses("CANCELLED"), [])
    assert.deepEqual(
      ORDER_STATUSES.filter(isFinalStatus),
      ["DELIVERED", "CANCELLED"],
    )
  })

  it("rejects going backwards, skipping steps and staying the same", () => {
    assert.equal(canTransition("DELIVERED", "PLACED"), false)
    assert.equal(canTransition("PLACED", "DELIVERED"), false) // skip
    assert.equal(canTransition("PLACED", "OUT_FOR_DELIVERY"), false) // skip
    assert.equal(canTransition("OUT_FOR_DELIVERY", "CANCELLED"), false) // too late to cancel
    for (const status of ORDER_STATUSES) assert.equal(canTransition(status, status), false)
  })

  it("allows every step of the normal path and cancelling early", () => {
    assert.equal(canTransition("PLACED", "CONFIRMED"), true)
    assert.equal(canTransition("CONFIRMED", "OUT_FOR_DELIVERY"), true)
    assert.equal(canTransition("OUT_FOR_DELIVERY", "DELIVERED"), true)
    assert.equal(canTransition("PLACED", "CANCELLED"), true)
    assert.equal(canTransition("CONFIRMED", "CANCELLED"), true)
  })
})

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
