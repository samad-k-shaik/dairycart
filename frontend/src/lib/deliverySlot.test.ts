import assert from "node:assert/strict"
import { describe, it } from "vitest"

import {
  changedSlotFields,
  EMPTY_SLOT_FORM,
  firstOpenSlot,
  formatSlotTime,
  slotTimeRange,
  spacesLeftText,
  toSlotFormValues,
  toSlotInput,
  validateSlotForm,
} from "./deliverySlot.ts"
import type { AdminDeliverySlot } from "../types/deliverySlot.ts"

const MORNING: AdminDeliverySlot = {
  delivery_slot_id: 1,
  name: "Morning",
  start_time: "08:00:00",
  end_time: "09:00:00",
  label: "Morning, 8:00 AM – 9:00 AM",
  spaces_left: 48,
  is_full: false,
  capacity: 50,
  booked: 2,
  is_active: true,
}

describe("showing times (#100)", () => {
  it("uses 12-hour times like the backend label", () => {
    assert.equal(formatSlotTime("08:00:00"), "8:00 AM")
    assert.equal(formatSlotTime("00:15"), "12:15 AM")
    assert.equal(formatSlotTime("12:00:00"), "12:00 PM")
    assert.equal(formatSlotTime("17:30:00"), "5:30 PM")
    assert.equal(slotTimeRange(MORNING), "8:00 AM – 9:00 AM")
  })

  it("says how many places are left", () => {
    assert.equal(spacesLeftText({ spaces_left: 12, is_full: false }), "12 places left")
    assert.equal(spacesLeftText({ spaces_left: 1, is_full: false }), "1 place left")
    assert.equal(spacesLeftText({ spaces_left: 0, is_full: true }), "Full")
  })

  it("starts the checkout on the first slot that is not full", () => {
    const full = { ...MORNING, delivery_slot_id: 2, is_full: true }
    assert.equal(firstOpenSlot([full, MORNING])?.delivery_slot_id, 1)
    assert.equal(firstOpenSlot([full]), null)
    assert.equal(firstOpenSlot([]), null)
  })
})

describe("admin slot form (#100)", () => {
  const valid = { name: "Morning", start_time: "08:00", end_time: "09:00", capacity: "50", is_active: true }

  it("accepts a normal slot", () => {
    assert.deepEqual(validateSlotForm(valid), {})
  })

  it("explains every problem", () => {
    const errors = validateSlotForm({ ...EMPTY_SLOT_FORM, capacity: "0" })
    assert.deepEqual(Object.keys(errors).toSorted(), ["capacity", "end_time", "name", "start_time"])
    assert.match(validateSlotForm({ ...valid, end_time: "07:00" }).end_time ?? "", /after the start/)
    assert.match(validateSlotForm({ ...valid, end_time: "08:00" }).end_time ?? "", /after the start/)
    assert.ok(validateSlotForm({ ...valid, name: "M" }).name)
    assert.ok(validateSlotForm({ ...valid, capacity: "1001" }).capacity)
    assert.ok(validateSlotForm({ ...valid, capacity: "2.5" }).capacity)
  })

  it("sends clean values", () => {
    assert.deepEqual(toSlotInput({ ...valid, name: "  Morning ", capacity: " 20 " }), {
      name: "Morning",
      start_time: "08:00",
      end_time: "09:00",
      capacity: 20,
      is_active: true,
    })
  })

  it("edits send only what changed", () => {
    const values = toSlotFormValues(MORNING)
    assert.deepEqual(values, valid)
    assert.deepEqual(changedSlotFields(MORNING, values), {})
    assert.deepEqual(changedSlotFields(MORNING, { ...values, end_time: "09:30", is_active: false }), {
      end_time: "09:30",
      is_active: false,
    })
  })
})
