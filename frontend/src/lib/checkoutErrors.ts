/**
 * Backend validation errors (422) → messages next to the right checkout field (M3-10).
 *
 * The backend answers e.g. { field: "customer.phone", issue: "String should match
 * pattern '^[6-9]\d{9}$'" }. That text is for developers, so for the two form fields we
 * show the same friendly message as our own form check. Problems that belong to no
 * field (e.g. "items[1].product_id: unavailable") stay in the error box.
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */
import type { ApiErrorDetail } from "../types/api.ts"
import { NAME_MAX, NAME_MIN } from "./validation.ts"

export type CheckoutServerErrors = {
  name?: string
  phone?: string
  /** Details that do not belong to a form field. */
  other: ApiErrorDetail[]
}

const FRIENDLY: Record<string, { key: "name" | "phone"; message: string }> = {
  "customer.name": { key: "name", message: `Name must be ${NAME_MIN}–${NAME_MAX} characters.` },
  "customer.phone": { key: "phone", message: "Enter a 10-digit mobile number starting with 6, 7, 8 or 9." },
}

export function splitCheckoutErrors(details: ApiErrorDetail[] | undefined): CheckoutServerErrors {
  const result: CheckoutServerErrors = { other: [] }
  for (const detail of details ?? []) {
    const field = FRIENDLY[detail.field]
    if (field) result[field.key] = field.message
    else result.other.push(detail)
  }
  return result
}
