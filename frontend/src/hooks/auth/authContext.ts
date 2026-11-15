/**
 * The auth "context" (#89): a shared box that AuthProvider fills and useAuth() reads.
 * Kept in its own file so AuthProvider.tsx only exports a component (React fast refresh).
 */
import { createContext } from "react"

import type { LoginRequest, User } from "@/types/auth"

export type AuthContextValue = {
  /** The logged-in user, or null. */
  user: User | null
  isAdmin: boolean
  /** Log in; resolves with the user, or rejects with a ServiceError (e.g. 401). */
  login: (request: LoginRequest) => Promise<User>
  /** Log out: forget the token and every cached server response. */
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
