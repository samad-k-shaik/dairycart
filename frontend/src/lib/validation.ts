/**
 * Form validation rules for checkout and order lookup (FR-C5, FR-C7).
 *
 * The SAME rules exist in the backend (Pydantic schemas, M3). Frontend
 * validation is only for a nicer experience (instant, friendly messages);
 * the backend is the real gatekeeper because anyone can bypass a browser.
 * Rules: docs/05-api/api-contracts.md → POST /orders → Validation.
 */

/** Indian mobile number: 10 digits, starting with 6, 7, 8 or 9. */
export const PHONE_PATTERN = /^[6-9]\d{9}$/

export const NAME_MIN_LENGTH = 2
export const NAME_MAX_LENGTH = 100

/** Returns an error message, or `undefined` when the name is valid. */
export function validateName(name: string): string | undefined {
  const trimmed = name.trim() // the backend also trims, so "  Ravi " counts as "Ravi"
  if (trimmed.length === 0) return 'Please enter your name.'
  if (trimmed.length < NAME_MIN_LENGTH) return `Name must be at least ${NAME_MIN_LENGTH} characters.`
  if (trimmed.length > NAME_MAX_LENGTH) return `Name must be at most ${NAME_MAX_LENGTH} characters.`
  return undefined
}

/** Returns an error message, or `undefined` when the phone number is valid. */
export function validatePhone(phone: string): string | undefined {
  const trimmed = phone.trim()
  if (trimmed.length === 0) return 'Please enter your mobile number.'
  if (!PHONE_PATTERN.test(trimmed)) return 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.'
  return undefined
}

/** Convenience: true when the phone number passes validation. */
export function isValidPhone(phone: string): boolean {
  return validatePhone(phone) === undefined
}
