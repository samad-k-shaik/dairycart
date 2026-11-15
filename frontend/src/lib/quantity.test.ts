import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { multiplyMoney } from "./money.ts"
import { clampQuantity, MAX_QUANTITY, MIN_QUANTITY } from "./quantity.ts"

describe("clampQuantity (FR-C3: 1–20)", () => {
  it("keeps values inside the range unchanged", () => {
    for (const q of [1, 2, 10, 19, 20]) assert.equal(clampQuantity(q), q)
  })

  it("never goes below 1 or above 20", () => {
    assert.equal(clampQuantity(0), MIN_QUANTITY)
    assert.equal(clampQuantity(-5), MIN_QUANTITY)
    assert.equal(clampQuantity(21), MAX_QUANTITY)
    assert.equal(clampQuantity(500), MAX_QUANTITY)
  })

  it("turns odd input into a whole number in range", () => {
    assert.equal(clampQuantity(2.6), 3)
    assert.equal(clampQuantity(Number.NaN), MIN_QUANTITY)
    assert.equal(clampQuantity(Number.POSITIVE_INFINITY), MIN_QUANTITY)
  })
})

describe("multiplyMoney (display estimate)", () => {
  it("multiplies exactly, without floating-point errors", () => {
    assert.equal(multiplyMoney("60.00", 2), "120.00")
    assert.equal(multiplyMoney("35.00", 1), "35.00")
    assert.equal(multiplyMoney("70.00", 20), "1400.00")
    assert.equal(multiplyMoney("0.10", 3), "0.30") // 0.1 * 3 in floats = 0.30000000000000004
    assert.equal(multiplyMoney("19.99", 3), "59.97")
  })
})
