import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  changedAddressFields,
  EMPTY_ADDRESS_FORM,
  preferredAddress,
  toAddressFormValues,
  toAddressInput,
  validateAddressForm,
} from "./address.ts"
import type { Address } from "../types/address.ts"

const HOME: Address = {
  address_id: 1,
  label: "Home",
  house: "12-3 Sai Residency",
  street: "MG Road, Ameerpet",
  landmark: null,
  city: "Hyderabad",
  pincode: "500016",
  is_default: true,
  full_text: "12-3 Sai Residency, MG Road, Ameerpet, Hyderabad - 500016",
  created_at: "2026-11-13T10:00:00Z",
}

describe("address form (#102)", () => {
  const valid = toAddressFormValues(HOME)

  it("accepts a normal address, landmark optional", () => {
    assert.deepEqual(validateAddressForm(valid), {})
  })

  it("explains what is missing", () => {
    const errors = validateAddressForm({ ...EMPTY_ADDRESS_FORM, label: "" })
    assert.deepEqual(Object.keys(errors).sort(), ["city", "house", "label", "pincode", "street"])
  })

  it("checks the PIN code like the backend", () => {
    for (const bad of ["50001", "050016", "5000AB", "5000166"]) {
      assert.ok(validateAddressForm({ ...valid, pincode: bad }).pincode, bad)
    }
    assert.equal(validateAddressForm({ ...valid, pincode: " 500016 " }).pincode, undefined)
  })

  it("checks lengths", () => {
    assert.ok(validateAddressForm({ ...valid, city: "H" }).city)
    assert.ok(validateAddressForm({ ...valid, landmark: "x".repeat(101) }).landmark)
  })

  it("sends trimmed values and no empty landmark", () => {
    const input = toAddressInput({ ...valid, house: "  12-3  ", landmark: "   " })
    assert.equal(input.house, "12-3")
    assert.equal(input.landmark, null)
  })

  it("edits send only what changed", () => {
    assert.deepEqual(changedAddressFields(HOME, valid), {})
    assert.deepEqual(changedAddressFields(HOME, { ...valid, city: "Pune", landmark: "Near park" }), {
      city: "Pune",
      landmark: "Near park",
    })
  })

  it("picks the default address first", () => {
    const office = { ...HOME, address_id: 2, is_default: false }
    assert.equal(preferredAddress([office, HOME])?.address_id, 1)
    assert.equal(preferredAddress([office])?.address_id, 2)
    assert.equal(preferredAddress([]), null)
  })
})
