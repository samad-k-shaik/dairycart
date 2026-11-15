import assert from "node:assert/strict"
import { describe, it } from "vitest"

import {
  areaLabel,
  changedBoyFields,
  EMPTY_BOY_FORM,
  readBoyFilter,
  validateBoyForm,
  validatePincode,
} from "./deliveryBoy.ts"
import type { DeliveryBoy } from "../types/deliveryBoy.ts"

const RAVI: DeliveryBoy = {
  delivery_boy_id: 1,
  name: "Ravi Kumar",
  phone: "9876500001",
  is_active: true,
  areas: [{ pincode: "500016", area_name: "Ameerpet" }],
  created_at: "2026-11-14T10:00:00Z",
  today_orders: 3,
  has_login: false,
}

describe("delivery boy form (#103)", () => {
  it("needs a name and a valid mobile number", () => {
    assert.deepEqual(Object.keys(validateBoyForm(EMPTY_BOY_FORM)).sort(), ["name", "phone"])
    assert.match(validateBoyForm(EMPTY_BOY_FORM).name ?? "", /delivery boy's name/)
    assert.ok(validateBoyForm({ name: "Ravi", phone: "5876500001", is_active: true }).phone)
    assert.deepEqual(validateBoyForm({ name: "Ravi", phone: "9876500001", is_active: true }), {})
  })

  it("edits send only what changed", () => {
    const same = { name: "Ravi Kumar", phone: "9876500001", is_active: true }
    assert.deepEqual(changedBoyFields(RAVI, same), {})
    assert.deepEqual(changedBoyFields(RAVI, { ...same, name: " Ravi K ", is_active: false }), {
      name: "Ravi K",
      is_active: false,
    })
  })
})

describe("areas (#103)", () => {
  it("checks PIN codes like the backend", () => {
    assert.equal(validatePincode("500016"), "")
    for (const bad of ["", "050016", "50001", "5000AB"]) assert.notEqual(validatePincode(bad), "", bad)
  })

  it("shows the PIN code with its locality", () => {
    assert.equal(areaLabel({ pincode: "500016", area_name: "Ameerpet" }), "500016 · Ameerpet")
    assert.equal(areaLabel({ pincode: "500081", area_name: null }), "500081")
  })

  it("reads the Deliveries filter from the URL", () => {
    assert.equal(readBoyFilter("unassigned"), "unassigned")
    assert.equal(readBoyFilter("12"), "12")
    for (const bad of [null, "", "0", "-1", "abc"]) assert.equal(readBoyFilter(bad), "", String(bad))
  })
})
