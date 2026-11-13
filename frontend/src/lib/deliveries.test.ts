import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { dayLabel, itemLabel, readDate } from "./deliveries.ts"

describe("admin deliveries helpers (#101)", () => {
  it("accepts only real YYYY-MM-DD dates from the URL", () => {
    assert.equal(readDate("2026-11-21"), "2026-11-21")
    assert.equal(readDate("2024-02-29"), "2024-02-29") // leap day
    assert.equal(readDate("2026-02-30"), null)
    assert.equal(readDate("21-11-2026"), null)
    assert.equal(readDate(""), null)
    assert.equal(readDate(null), null)
  })

  it("names the days around today", () => {
    assert.equal(dayLabel("2026-11-21", "2026-11-21"), "Today")
    assert.equal(dayLabel("2026-11-22", "2026-11-21"), "Tomorrow")
    assert.equal(dayLabel("2026-11-20", "2026-11-21"), "Yesterday")
    assert.match(dayLabel("2026-11-25", "2026-11-21"), /^Wed, 25 Nov 2026$/)
    assert.equal(dayLabel("2026-01-01", "2025-12-31"), "Tomorrow") // across a year
  })

  it("writes an item as 'quantity × name size'", () => {
    assert.equal(
      itemLabel({ product_id: 1, product_name: "Cow Milk", size: "1 Litre", quantity: 2 }),
      "2 × Cow Milk 1 Litre",
    )
  })
})
