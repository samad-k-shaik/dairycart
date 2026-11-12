/**
 * Account types (#89): mirror the backend's /api/v1/auth and /api/v1/admin/users responses.
 */
import type { IsoDateTime } from "./order.ts"

export type UserRole = "USER" | "ADMIN"

/** POST /auth/register (201), GET /auth/me, one row of GET /admin/users. */
export type User = {
  user_id: number
  full_name: string
  email: string
  username: string
  role: UserRole
  created_at: IsoDateTime
}

/** POST /auth/register body. No role: every new account is a USER. */
export type RegisterRequest = {
  full_name: string
  email: string
  username: string
  password: string
}

/** POST /auth/login body. `login` is the username OR the email. */
export type LoginRequest = {
  login: string
  password: string
}

/** POST /auth/login response. */
export type LoginResponse = {
  access_token: string
  token_type: "bearer"
  /** Seconds until the token expires. */
  expires_in: number
  user: User
}
