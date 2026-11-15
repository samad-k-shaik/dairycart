/**
 * Sign-up and login form checks (#89; mobile number instead of email/username: #121).
 * The same rules as the backend's RegisterRequest: the UI gives fast, friendly feedback;
 * the backend validates again.
 * Each function returns an error message, or null when the value is valid.
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */
import type { RegisterRequest } from "../types/auth.ts"
import { normaliseMobile, validateName, validatePhone } from "./validation.ts"

export type SignUpValues = {
  full_name: string
  phone: string
  password: string
  confirm_password: string
}

export type SignUpErrors = Partial<Record<keyof SignUpValues, string>>

export const EMPTY_SIGN_UP: SignUpValues = {
  full_name: "",
  phone: "",
  password: "",
  confirm_password: "",
}

export function validateFullName(value: string): string | null {
  if (!value.trim()) return "Please enter your full name."
  return validateName(value) // same 2–100 characters as checkout
}

/** #121: the login. "+91 98765 43210" is fine: it is checked as 10 digits. */
export function validateMobile(value: string): string | null {
  return validatePhone(normaliseMobile(value))
}

export function validatePassword(value: string): string | null {
  if (!value) return "Please choose a password."
  if (value.length < 8) return "Password must be at least 8 characters."
  if (new TextEncoder().encode(value).length > 72) return "Password is too long (max 72 bytes)."
  if (!/[A-Za-z\p{L}]/u.test(value) || !/\d/.test(value)) return "Use at least one letter and one number."
  return null
}

export function validateSignUp(values: SignUpValues): SignUpErrors {
  const errors: SignUpErrors = {}
  const checks: [keyof SignUpValues, string | null][] = [
    ["full_name", validateFullName(values.full_name)],
    ["phone", validateMobile(values.phone)],
    ["password", validatePassword(values.password)],
    [
      "confirm_password",
      !values.confirm_password
        ? "Please type the password again."
        : values.confirm_password !== values.password
          ? "The passwords do not match."
          : null,
    ],
  ]
  for (const [field, message] of checks) if (message) errors[field] = message
  return errors
}

/** The body for POST /auth/register: trimmed, 10-digit phone, WITHOUT confirm_password. */
export function toRegisterRequest(values: SignUpValues): RegisterRequest {
  return {
    full_name: values.full_name.trim(),
    phone: normaliseMobile(values.phone),
    password: values.password,
  }
}

/** Where to go after login: the `next` page if it is a safe in-app path, else by role. */
export function pathAfterLogin(role: "USER" | "ADMIN", next: string | null): string {
  // Only paths inside this app ("/…", not "//evil.com" or "https://…"): an open redirect
  // would let a link send people to another site right after they log in.
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) return next
  return role === "ADMIN" ? "/admin" : "/account"
}
