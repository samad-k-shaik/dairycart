/**
 * Unit tests for formatCurrency.
 * Runs with Node's built-in test runner (`npm test`); Vitest replaces it in M4-04 (#49).
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { formatCurrency } from "./format.ts"

describe("formatCurrency", () => {
  it("formats the issue's examples", () => {
    assert.equal(formatCurrency("60.00"), "₹60.00")
    assert.equal(formatCurrency("155.00"), "₹155.00")
  })

  it("keeps paise exactly", () => {
    assert.equal(formatCurrency("35.50"), "₹35.50")
    assert.equal(formatCurrency("0.10"), "₹0.10")
  })

  it("uses Indian digit grouping", () => {
    assert.equal(formatCurrency("1234.00"), "₹1,234.00")
    assert.equal(formatCurrency("123456.75"), "₹1,23,456.75")
  })

  it("rejects values that are not API money strings", () => {
    for (const bad of ["60", "60.5", "abc", "", "-5.00", "₹60.00"]) {
      assert.throws(() => formatCurrency(bad), TypeError, `should reject "${bad}"`)
    }
  })
})
