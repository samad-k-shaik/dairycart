import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { splitCheckoutErrors } from "./checkoutErrors.ts"

describe("splitCheckoutErrors (M3-10: backend 422 → the right checkout field)", () => {
  it("puts customer.name and customer.phone next to their fields, in plain words", () => {
    const errors = splitCheckoutErrors([
      { field: "customer.name", issue: "String should have at least 2 characters" },
      { field: "customer.phone", issue: "String should match pattern '^[6-9]\\d{9}$'" },
    ])

    assert.equal(errors.name, "Name must be 2–100 characters.")
    assert.equal(errors.phone, "Enter a 10-digit mobile number starting with 6, 7, 8 or 9.")
    assert.deepEqual(errors.other, [])
  })

  it("keeps problems that belong to no field (e.g. an item) for the error box", () => {
    const item = { field: "items[1].product_id", issue: "unavailable" }

    const errors = splitCheckoutErrors([item, { field: "customer.phone", issue: "x" }])

    assert.deepEqual(errors.other, [item])
    assert.equal(errors.name, undefined)
    assert.ok(errors.phone)
  })

  it("handles no details at all", () => {
    assert.deepEqual(splitCheckoutErrors(undefined), { other: [] })
    assert.deepEqual(splitCheckoutErrors([]), { other: [] })
  })
})
