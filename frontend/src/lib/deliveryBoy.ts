/**
 * Delivery boy form rules (#103): same limits as the backend. Pure functions, tested in
 * lib/deliveryBoy.test.ts. (Relative ".ts" imports so Node's test runner can load this.)
 */
import type { DeliveryArea, DeliveryBoy, DeliveryBoyUpdate } from "../types/deliveryBoy.ts"
import { validateName, validatePhone } from "./validation.ts"

export type BoyFormValues = { name: string; phone: string; is_active: boolean }
export type BoyFormErrors = Partial<Record<"name" | "phone", string>>

export const EMPTY_BOY_FORM: BoyFormValues = { name: "", phone: "", is_active: true }

export function validateBoyForm(values: BoyFormValues): BoyFormErrors {
  const errors: BoyFormErrors = {}
  // Same rules as checkout, but the admin types someone else's details.
  const name = values.name.trim() ? validateName(values.name) : "Please enter the delivery boy's name."
  const phone = values.phone ? validatePhone(values.phone) : "Please enter his mobile number."
  if (name) errors.name = name
  if (phone) errors.phone = phone
  return errors
}

/** For PATCH: only the fields that changed. */
export function changedBoyFields(boy: DeliveryBoy, values: BoyFormValues): DeliveryBoyUpdate {
  const changes: DeliveryBoyUpdate = {}
  if (values.name.trim() !== boy.name) changes.name = values.name.trim()
  if (values.phone !== boy.phone) changes.phone = values.phone
  if (values.is_active !== boy.is_active) changes.is_active = values.is_active
  return changes
}

/** Indian PIN code: 6 digits, not starting with 0. */
export function validatePincode(value: string): string {
  const pin = value.trim()
  if (pin.length === 0) return "Enter a 6-digit PIN code."
  if (!/^[1-9][0-9]{5}$/.test(pin)) return "Enter a 6-digit PIN code, e.g. 500016."
  return ""
}

/** "500016 · Ameerpet" or "500016". */
export function areaLabel(area: DeliveryArea): string {
  return area.area_name ? `${area.pincode} · ${area.area_name}` : area.pincode
}

/** The `boy` filter on the Deliveries page: "" (all), "unassigned", or an id as text. */
export type BoyFilter = "" | "unassigned" | `${number}`

export function readBoyFilter(value: string | null): BoyFilter {
  if (value === "unassigned") return "unassigned"
  if (value && /^[1-9][0-9]*$/.test(value)) return value as `${number}`
  return ""
}
