/**
 * Account types (#89): mirror the backend's /api/v1/auth and /api/v1/admin/users responses.
 * #121: an account is identified by its mobile number (no email or username).
 */
import type { IsoDateTime } from "./order.ts"

/** #109: DELIVERY_BOY = a delivery boy's login (created by the admin); opens /delivery only. */
export type UserRole = "USER" | "ADMIN" | "DELIVERY_BOY"

/** POST /auth/register (201), GET /auth/me, one row of GET /admin/users. */
export type User = {
  user_id: number
  full_name: string
  /** The login: 10-digit mobile number, e.g. "9876543210". */
  phone: string
  role: UserRole
  created_at: IsoDateTime
}

/** GET /admin/users/{id} (#101): the user plus their order totals. */
export type AdminUserDetail = User & {
  order_count: number
  /** Sum of the orders that are not cancelled, e.g. "1440.00". */
  total_spent: string
}

/** POST /auth/register body. No role: every new account is a USER. */
export type RegisterRequest = {
  full_name: string
  phone: string
  password: string
}

/** POST /auth/login body (#121): the mobile number used at sign-up. */
export type LoginRequest = {
  phone: string
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
