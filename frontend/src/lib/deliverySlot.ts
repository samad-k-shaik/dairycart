/**
 * Delivery slot helpers (#100): showing times, and the admin slot form rules.
 * The limits match the backend (name 2–50 characters, capacity 1–1000, end after start).
 * The UI checks give fast feedback; the backend validates again.
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */
import type { AdminDeliverySlot, DeliverySlot, DeliverySlotCreate, DeliverySlotUpdate } from "../types/deliverySlot.ts"

export const SLOT_NAME_MIN = 2
export const SLOT_NAME_MAX = 50
export const SLOT_CAPACITY_MAX = 1000

/** "08:00:00" or "08:00" → "8:00 AM"; "17:30:00" → "5:30 PM". */
export function formatSlotTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number)
  const hour12 = hours % 12 || 12
  return `${hour12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`
}

/** "8:00 AM – 9:00 AM" */
export function slotTimeRange(slot: { start_time: string; end_time: string }): string {
  return `${formatSlotTime(slot.start_time)} – ${formatSlotTime(slot.end_time)}`
}

/** What a customer sees under a slot: "Full", "1 place left", "12 places left". */
export function spacesLeftText(slot: Pick<DeliverySlot, "spaces_left" | "is_full">): string {
  if (slot.is_full) return "Full"
  return `${slot.spaces_left} ${slot.spaces_left === 1 ? "place" : "places"} left`
}

/** The first slot that is not full: the checkout's starting choice (or null). */
export function firstOpenSlot<T extends Pick<DeliverySlot, "is_full">>(slots: T[]): T | null {
  return slots.find((slot) => !slot.is_full) ?? null
}

// ---- Admin form ----

/** What the form fields hold: text exactly as typed (times as "HH:MM" from <input type=time>). */
export type SlotFormValues = {
  name: string
  start_time: string
  end_time: string
  capacity: string
  is_active: boolean
}

export type SlotFormErrors = Partial<Record<"name" | "start_time" | "end_time" | "capacity", string>>

export const EMPTY_SLOT_FORM: SlotFormValues = {
  name: "",
  start_time: "",
  end_time: "",
  capacity: "50",
  is_active: true,
}

/** "08:00:00" → "08:00" (what <input type="time"> uses). */
export function toInputTime(time: string): string {
  return time.slice(0, 5)
}

export function validateSlotForm(values: SlotFormValues): SlotFormErrors {
  const errors: SlotFormErrors = {}
  const name = values.name.trim()
  if (name.length === 0) errors.name = "Please enter a name, e.g. Morning."
  else if (name.length < SLOT_NAME_MIN || name.length > SLOT_NAME_MAX) {
    errors.name = `Name must be ${SLOT_NAME_MIN}–${SLOT_NAME_MAX} characters.`
  }
  if (!/^\d{2}:\d{2}$/.test(values.start_time)) errors.start_time = "Please choose a start time."
  if (!/^\d{2}:\d{2}$/.test(values.end_time)) errors.end_time = "Please choose an end time."
  // "HH:MM" strings compare correctly as text: "08:00" < "09:00".
  else if (!errors.start_time && values.end_time <= values.start_time) {
    errors.end_time = "The end time must be after the start time."
  }
  const capacity = values.capacity.trim()
  if (!/^\d+$/.test(capacity) || Number(capacity) < 1 || Number(capacity) > SLOT_CAPACITY_MAX) {
    errors.capacity = `Enter a whole number from 1 to ${SLOT_CAPACITY_MAX}.`
  }
  return errors
}

/** A slot's current values, to fill the Edit form. */
export function toSlotFormValues(slot: AdminDeliverySlot): SlotFormValues {
  return {
    name: slot.name,
    start_time: toInputTime(slot.start_time),
    end_time: toInputTime(slot.end_time),
    capacity: String(slot.capacity),
    is_active: slot.is_active,
  }
}

/** Clean form values, ready to send. Call after validateSlotForm. */
export function toSlotInput(values: SlotFormValues): DeliverySlotCreate {
  return {
    name: values.name.trim(),
    start_time: values.start_time,
    end_time: values.end_time,
    capacity: Number(values.capacity.trim()),
    is_active: values.is_active,
  }
}

/** For PATCH: only the fields that changed. Empty object = nothing to save. */
export function changedSlotFields(slot: AdminDeliverySlot, values: SlotFormValues): DeliverySlotUpdate {
  const input = toSlotInput(values)
  const changes: DeliverySlotUpdate = {}
  if (input.name !== slot.name) changes.name = input.name
  if (input.start_time !== toInputTime(slot.start_time)) changes.start_time = input.start_time
  if (input.end_time !== toInputTime(slot.end_time)) changes.end_time = input.end_time
  if (input.capacity !== slot.capacity) changes.capacity = input.capacity
  if (input.is_active !== slot.is_active) changes.is_active = input.is_active
  return changes
}
