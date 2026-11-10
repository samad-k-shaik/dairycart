/** Tests for checkout validation, the order request and IST date formatting. */
import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { formatDate, formatDateTime, istDateKey } from "./format.ts"
import { buildCreateOrderRequest } from "./orderRequest.ts"
import { validateName, validatePhone } from "./validation.ts"

describe("validateName (2–100 characters, trimmed)", () => {
  it("accepts normal names", () => {
    for (const name of ["Ravi Kumar", "Al", "  Asha  ", "x".repeat(100)]) assert.equal(validateName(name), null)
  })
  it("rejects empty, too short and too long names", () => {
    for (const name of ["", "   ", "R", " R ", "x".repeat(101)]) assert.ok(validateName(name), `"${name}"`)
  })
})

describe("validatePhone (^[6-9]\\d{9}$)", () => {
  it("accepts 10-digit numbers starting with 6–9", () => {
    for (const phone of ["9876543210", "6000000000", "7012345678", "8899776655"]) {
      assert.equal(validatePhone(phone), null)
    }
  })
  it("rejects everything else", () => {
    for (const phone of ["", "12345", "5876543210", "98765432100", "987654321", "+919876543210", "98765 43210", "98765abcde"]) {
      assert.ok(validatePhone(phone), phone)
    }
  })
})

describe("buildCreateOrderRequest", () => {
  it("sends only customer name/phone and product ids + quantities (never prices)", () => {
    const cartLines = [
      { product_id: 2, name: "Cow Milk", size: "1 Litre", price: "60.00", quantity: 2 },
      { product_id: 3, name: "Buffalo Milk", size: "500 ml", price: "35.00", quantity: 1 },
    ]
    const request = buildCreateOrderRequest({ name: "  Ravi Kumar ", phone: "9876543210" }, cartLines)
    assert.deepEqual(request, {
      customer: { name: "Ravi Kumar", phone: "9876543210" },
      items: [
        { product_id: 2, quantity: 2 },
        { product_id: 3, quantity: 1 },
      ],
    })
    const json = JSON.stringify(request)
    for (const forbidden of ["price", "total", "subtotal", "size", "60.00"]) {
      assert.ok(!json.includes(forbidden), `payload must not contain "${forbidden}"`)
    }
  })
})

describe("IST dates", () => {
  it("shows UTC times in India time (UTC+5:30)", () => {
    assert.equal(formatDateTime("2026-11-07T04:30:00Z"), "7 Nov 2026, 10:00 am")
    assert.equal(formatDate("2026-11-07T04:30:00Z"), "7 Nov 2026")
  })
  it("uses the IST calendar day for 'today' (late UTC evening is already tomorrow in IST)", () => {
    assert.equal(istDateKey("2026-11-07T18:29:00Z"), "2026-11-07") // 23:59 IST
    assert.equal(istDateKey("2026-11-07T18:30:00Z"), "2026-11-08") // 00:00 IST next day
  })
})
