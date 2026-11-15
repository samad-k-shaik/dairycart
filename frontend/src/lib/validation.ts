/**
 * Checkout field validation (FR-C5, API contract validation table).
 * The UI checks give fast, friendly feedback; the backend validates again.
 * Each function returns an error message, or null when the value is valid.
 */
export const NAME_MIN = 2
export const NAME_MAX = 100

/** 10-digit Indian mobile number: starts with 6, 7, 8 or 9 (contract: `^[6-9]\d{9}$`). */
export const PHONE_PATTERN = /^[6-9]\d{9}$/

export function validateName(value: string): string | null {
  const name = value.trim()
  if (name.length === 0) return "Please enter your name."
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return `Name must be ${NAME_MIN}–${NAME_MAX} characters.`
  }
  return null
}

export function validatePhone(value: string): string | null {
  if (value.length === 0) return "Please enter your mobile number."
  if (!PHONE_PATTERN.test(value)) {
    return "Enter a 10-digit mobile number starting with 6, 7, 8 or 9."
  }
  return null
}
