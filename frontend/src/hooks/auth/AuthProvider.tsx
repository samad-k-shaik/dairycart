/**
 * AuthProvider (#89): knows who is logged in and shares it with every component.
 *
 * - On start it reads the saved session (lib/sessionStore.ts) and asks the backend
 *   GET /auth/me once, so a role change or a deleted account is noticed. If the token is
 *   no longer valid, apiClient gets a 401 and clears the session.
 * - It re-reads the session whenever it changes: login, logout, a 401, or another tab.
 * - It logs out by itself when the token expires.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { sessionFromLogin } from "@/lib/authSession"
import { clearSession, onSessionChange, readSession, saveSession } from "@/lib/sessionStore"
import { getMe, login as loginRequest } from "@/services/authService"
import type { LoginRequest, User } from "@/types/auth"

import { AuthContext, type AuthContextValue } from "./authContext"

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState(readSession)

  // Follow every change of the stored session (this tab and other tabs).
  useEffect(() => onSessionChange(() => setSession(readSession())), [])

  // Check the saved session with the backend once per token.
  const token = session?.token
  useEffect(() => {
    if (!token) return
    getMe()
      .then((user) => {
        const current = readSession()
        if (current?.token === token && (current.user.role !== user.role || current.user.full_name !== user.full_name)) {
          saveSession({ ...current, user })
        }
      })
      .catch(() => {
        // 401: apiClient already cleared the session. Network error: keep the session.
      })
  }, [token])

  // Log out automatically when the token expires.
  const expiresAt = session?.expiresAt
  useEffect(() => {
    if (!expiresAt) return
    const timer = window.setTimeout(clearSession, Math.max(0, expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [expiresAt])

  const login = useCallback(async (request: LoginRequest): Promise<User> => {
    const response = await loginRequest(request)
    saveSession(sessionFromLogin(response.access_token, response.expires_in, response.user))
    return response.user
  }, [])

  const logout = useCallback(() => {
    clearSession()
    // Drop every cached response (admin orders, user lists…): the next person using this
    // browser must not see the previous user's data.
    queryClient.clear()
  }, [queryClient])

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null
    return { user, isAdmin: user?.role === "ADMIN", login, logout }
  }, [session, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
