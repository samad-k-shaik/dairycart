import assert from "node:assert/strict"
import { describe, it } from "vitest"

import { cardLines, formatCardTime, orderNumber, readBoardDate } from "./orderBoard.ts"
import type { AdminOrderLine } from "../types/order.ts"

const line = (n: number): AdminOrderLine => ({
  product_id: n,
  product_name: `Milk ${n}`,
  size: "1 Litre",
  quantity: 1,
  unit_price: "60.00",
  subtotal: "60.00",
})

describe("orders board (#104)", () => {
  it("writes order numbers like the design", () => {
    assert.equal(orderNumber(7), "#007")
    assert.equal(orderNumber(44), "#044")
    assert.equal(orderNumber(1234), "#1234")
  })

  it("reads the date from the URL: a day, all dates, or today", () => {
    assert.equal(readBoardDate("2026-11-20", "2026-11-14"), "2026-11-20")
    assert.equal(readBoardDate("all", "2026-11-14"), "all")
    assert.equal(readBoardDate(null, "2026-11-14"), "2026-11-14")
    assert.equal(readBoardDate("2026-02-30", "2026-11-14"), "2026-11-14")
  })

  it("shows two lines and counts the rest", () => {
    assert.deepEqual(cardLines([line(1)]), { shown: [line(1)], more: 0 })
    const three = cardLines([line(1), line(2), line(3)])
    assert.equal(three.shown.length, 2)
    assert.equal(three.more, 1)
  })

  it("formats the card time in India time", () => {
    // 02:30 UTC = 08:00 IST
    assert.match(formatCardTime("2026-11-14T02:30:00Z"), /^14 Nov, 8:00\s?am$/i)
  })
})
