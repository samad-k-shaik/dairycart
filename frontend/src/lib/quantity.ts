/**
 * Quantity rules for one cart line (FR-C3, API contract: integer 1–20).
 * The UI enforces them for a good experience; the backend still validates,
 * because anyone can send a request without using our UI.
 */
export const MIN_QUANTITY = 1
export const MAX_QUANTITY = 20

/** Keeps a quantity inside 1–20 and makes it a whole number. */
export function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return MIN_QUANTITY
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.round(value)))
}
