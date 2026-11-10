/**
 * The login session in the browser (#89): the token from POST /auth/login, when it
 * expires, and the user it belongs to.
 *
 * This file has the PURE rules (tested in auth.test.ts); lib/sessionStore.ts keeps the
 * session in the browser's localStorage.
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */
import type { User } from "../types/auth.ts"

export const SESSION_STORAGE_KEY = "dairycart-session-v1"

export type Session = {
  token: string
  /** Milliseconds since 1970 (Date.now() format). */
  expiresAt: number
  user: User
}

/** A stored value → a Session, or null if it is missing, damaged or expired. */
export function parseSession(raw: string | null, now: number = Date.now()): Session | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<Session> | null
    if (
      typeof value?.token !== "string" ||
      typeof value.expiresAt !== "number" ||
      typeof value.user?.username !== "string" ||
      (value.user.role !== "USER" && value.user.role !== "ADMIN")
    ) {
      return null
    }
    // Treat it as expired 30 s early, so we never send a token that dies on the way.
    return value.expiresAt - 30_000 > now ? (value as Session) : null
  } catch {
    return null
  }
}

export function sessionFromLogin(token: string, expiresInSeconds: number, user: User, now: number = Date.now()): Session {
  return { token, expiresAt: now + expiresInSeconds * 1000, user }
}
