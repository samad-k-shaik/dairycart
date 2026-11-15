import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  changedAddressFields,
  EMPTY_ADDRESS_FORM,
  locationErrorMessage,
  preferredAddress,
  roundCoordinate,
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
  latitude: null,
  longitude: null,
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

describe("address map pin (#108)", () => {
  const PINNED: Address = { ...HOME, latitude: 17.4375, longitude: 78.4483 }

  it("starts without a pin and sends both values as null", () => {
    assert.equal(EMPTY_ADDRESS_FORM.pin, null)
    const input = toAddressInput({ ...toAddressFormValues(HOME), pin: null })
    assert.deepEqual([input.latitude, input.longitude], [null, null])
  })

  it("reads a saved pin into the form and sends it back rounded to 6 decimals", () => {
    assert.deepEqual(toAddressFormValues(PINNED).pin, { lat: 17.4375, lng: 78.4483 })
    const input = toAddressInput({ ...toAddressFormValues(HOME), pin: { lat: 17.43751234, lng: 78.44839876 } })
    assert.deepEqual([input.latitude, input.longitude], [17.437512, 78.448399])
  })

  it("sends the pin as a pair only when it was added, moved or removed", () => {
    const values = toAddressFormValues(PINNED)
    assert.deepEqual(changedAddressFields(PINNED, values), {})
    assert.deepEqual(changedAddressFields(HOME, { ...values }), { latitude: 17.4375, longitude: 78.4483 })
    assert.deepEqual(changedAddressFields(PINNED, { ...values, pin: { lat: 17.44, lng: 78.45 } }), {
      latitude: 17.44,
      longitude: 78.45,
    })
    assert.deepEqual(changedAddressFields(PINNED, { ...values, pin: null }), { latitude: null, longitude: null })
  })

  it("does not send a pin that only differs beyond 6 decimals", () => {
    const values = { ...toAddressFormValues(PINNED), pin: { lat: 17.43750004, lng: 78.44830003 } }
    assert.deepEqual(changedAddressFields(PINNED, values), {})
  })

  it("rounds coordinates to 6 decimals", () => {
    assert.equal(roundCoordinate(17.4375006), 17.437501)
  })

  it("explains each location failure in plain words", () => {
    assert.match(locationErrorMessage(1), /permission is off/)
    assert.match(locationErrorMessage(2), /could not be found/)
    assert.match(locationErrorMessage(3), /took too long/)
    assert.match(locationErrorMessage(null), /cannot share your location/)
  })
})
