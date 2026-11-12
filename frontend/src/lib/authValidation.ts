/**
 * Sign-up and login form checks (#89). The same rules as the backend's RegisterRequest:
 * the UI gives fast, friendly feedback; the backend validates again.
 * Each function returns an error message, or null when the value is valid.
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */
import type { RegisterRequest } from "../types/auth.ts"

export type SignUpValues = {
  full_name: string
  email: string
  username: string
  password: string
  confirm_password: string
}

export type SignUpErrors = Partial<Record<keyof SignUpValues, string>>

export const EMPTY_SIGN_UP: SignUpValues = {
  full_name: "",
  email: "",
  username: "",
  password: "",
  confirm_password: "",
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,30}$/

export function validateFullName(value: string): string | null {
  const name = value.trim()
  if (!name) return "Please enter your full name."
  if (name.length < 2 || name.length > 100) return "Name must be 2–100 characters."
  return null
}

export function validateEmail(value: string): string | null {
  const email = value.trim()
  if (!email) return "Please enter your email address."
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return "Enter a valid email address, e.g. ravi@example.com."
  return null
}

export function validateUsername(value: string): string | null {
  const username = value.trim()
  if (!username) return "Please choose a username."
  if (!USERNAME_PATTERN.test(username)) {
    return "Use 3–30 letters, numbers, dots, dashes or underscores (no spaces)."
  }
  return null
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
    ["email", validateEmail(values.email)],
    ["username", validateUsername(values.username)],
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

/** The body for POST /auth/register: trimmed, and WITHOUT confirm_password. */
export function toRegisterRequest(values: SignUpValues): RegisterRequest {
  return {
    full_name: values.full_name.trim(),
    email: values.email.trim(),
    username: values.username.trim(),
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
