import assert from "node:assert/strict"
import { describe, it } from "node:test"

import orders from "../services/mock/orders.json" with { type: "json" }
import { countOrdersOnIstDay, totalFromStatusCounts } from "./dashboard.ts"

describe("totalFromStatusCounts", () => {
  it("adds up every status", () => {
    assert.equal(
      totalFromStatusCounts({ PLACED: 2, CONFIRMED: 2, OUT_FOR_DELIVERY: 1, DELIVERED: 2, CANCELLED: 1 }),
      8,
    )
  })
})

describe("countOrdersOnIstDay", () => {
  it("counts the mock orders per IST day", () => {
    // Mock data has two orders on 6 Nov (IST) and one on 7 Nov.
    assert.equal(countOrdersOnIstDay(orders, new Date("2026-11-06T12:00:00+05:30")), 2)
    assert.equal(countOrdersOnIstDay(orders, new Date("2026-11-07T12:00:00+05:30")), 1)
    assert.equal(countOrdersOnIstDay(orders, new Date("2026-11-08T12:00:00+05:30")), 0)
  })

  it("uses India's midnight, not UTC midnight", () => {
    const lateEvening = [{ order_date: "2026-11-07T19:00:00Z" }] // 8 Nov 00:30 IST
    assert.equal(countOrdersOnIstDay(lateEvening, new Date("2026-11-08T09:00:00+05:30")), 1)
    assert.equal(countOrdersOnIstDay(lateEvening, new Date("2026-11-07T20:00:00+05:30")), 0)
  })
})
