import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  addDays,
  buildCreateSubscriptionRequest,
  deliveryCount,
  deliveryDates,
  endDateFor,
  estimatePlanTotal,
  formatDay,
  planDays,
  PLAN_OPTIONS,
  startDateRange,
  todayInIndia,
  validateStartDate,
} from "./subscription.ts"

// 20 Nov 2026, 20:00 UTC = 21 Nov 2026, 01:30 in India.
const LATE_EVENING_UTC = new Date("2026-11-20T20:00:00Z")
const NOON_UTC = new Date("2026-11-20T12:00:00Z") // 17:30 in India, still the 20th

describe("plans", () => {
  it("offers 1 week, 15 days and 1 month", () => {
    assert.deepEqual(
      PLAN_OPTIONS.map((o) => [o.plan, o.days, o.label]),
      [
        ["WEEK", 7, "1 week"],
        ["HALF_MONTH", 15, "15 days"],
        ["MONTH", 30, "1 month"],
      ],
    )
    assert.equal(planDays("MONTH"), 30)
  })

  it("ends on the last day, counting the first day", () => {
    assert.equal(endDateFor("2026-11-21", "WEEK"), "2026-11-27")
    assert.equal(endDateFor("2026-11-21", "HALF_MONTH"), "2026-12-05")
    assert.equal(endDateFor("2026-11-21", "MONTH"), "2026-12-20")
  })
})

describe("dates in India time", () => {
  it("uses India's calendar day, not UTC's", () => {
    assert.equal(todayInIndia(NOON_UTC), "2026-11-20")
    assert.equal(todayInIndia(LATE_EVENING_UTC), "2026-11-21")
  })

  it("adds days across month and year ends", () => {
    assert.equal(addDays("2026-11-30", 1), "2026-12-01")
    assert.equal(addDays("2026-12-31", 1), "2027-01-01")
    assert.equal(addDays("2028-02-28", 1), "2028-02-29") // leap year
  })

  it("allows a start from tomorrow up to 30 days ahead", () => {
    assert.deepEqual(startDateRange(NOON_UTC), { min: "2026-11-21", max: "2026-12-20" })
    assert.equal(validateStartDate("2026-11-21", NOON_UTC), "")
    assert.equal(validateStartDate("2026-12-20", NOON_UTC), "")
  })

  it("refuses today, the past, too far ahead and empty", () => {
    assert.match(validateStartDate("2026-11-20", NOON_UTC), /tomorrow/)
    assert.match(validateStartDate("2026-01-01", NOON_UTC), /tomorrow/)
    assert.match(validateStartDate("2026-12-21", NOON_UTC), /30 days/)
    assert.equal(validateStartDate("", NOON_UTC), "Choose a start date.")
  })

  it("shows a day without shifting it", () => {
    assert.equal(formatDay("2026-11-21"), "21 Nov 2026")
  })
})

describe("totals and request", () => {
  it("estimates the plan total in whole paise", () => {
    assert.equal(estimatePlanTotal("120.00", "WEEK"), "840.00")
    assert.equal(estimatePlanTotal("28.50", "MONTH"), "855.00")
  })

  it("counts only delivery days for every 2 / 3 days (#99)", () => {
    assert.equal(estimatePlanTotal("120.00", "WEEK", 2), "480.00") // 4 deliveries
    assert.equal(estimatePlanTotal("60.00", "MONTH", 3), "600.00") // 10 deliveries
  })

  it("sends only plan, start date, frequency, slot, contact, ids and quantities", () => {
    const request = buildCreateSubscriptionRequest(
      "WEEK",
      "2026-11-21",
      2,
      7,
      { name: "  Ravi Kumar ", phone: "9876543210" },
      [{ product_id: 1, quantity: 2, name: "Cow Milk", price: "60.00" } as never],
    )
    assert.deepEqual(request, {
      plan: "WEEK",
      start_date: "2026-11-21",
      every_n_days: 2,
      delivery_slot_id: 7,
      customer: { name: "Ravi Kumar", phone: "9876543210" },
      items: [{ product_id: 1, quantity: 2 }],
    })
  })
})

describe("delivery frequency (#99)", () => {
  it("keeps the plan length and counts the deliveries", () => {
    assert.equal(deliveryCount("WEEK", 1), 7)
    assert.equal(deliveryCount("WEEK", 2), 4)
    assert.equal(deliveryCount("WEEK", 3), 3)
    assert.equal(deliveryCount("HALF_MONTH", 2), 8)
    assert.equal(deliveryCount("MONTH", 3), 10)
  })

  it("lists the delivery days, ending inside the plan", () => {
    assert.deepEqual(deliveryDates("2026-11-21", "WEEK", 2), ["2026-11-21", "2026-11-23", "2026-11-25", "2026-11-27"])
    assert.deepEqual(deliveryDates("2026-11-21", "WEEK", 3), ["2026-11-21", "2026-11-24", "2026-11-27"])
    const month = deliveryDates("2026-11-21", "MONTH", 3)
    assert.equal(month.at(-1), "2026-12-18") // the plan ends on 20 Dec
  })
})
