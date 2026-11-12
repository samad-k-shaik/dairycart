/**
 * useAuth(): who is logged in, and login/logout, from any component inside <AuthProvider>.
 *   const { user, isAdmin, login, logout } = useAuth()
 */
import { useContext } from "react"

import { AuthContext, type AuthContextValue } from "@/hooks/auth/authContext"

export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext)
  if (!auth) {
    throw new Error("useAuth() must be used inside <AuthProvider> (see App.tsx).")
  }
  return auth
}
