/**
 * apiClient: the ONE place that talks HTTP to the backend (M3-08).
 *
 * Services call get / post / patch / del with a path such as "/products"; this file adds
 * the base URL, sends JSON, and turns every failure into a ServiceError with the
 * backend's message, so pages handle errors the same way as before.
 *
 * The backend address comes from VITE_API_BASE_URL (see frontend/.env.example).
 * Vite reads VITE_* variables at BUILD/START time: restart `npm run dev` after changing them.
 *
 * Logged in (#89)? Every request carries `Authorization: Bearer <token>`. If the API then
 * answers 401, the token is expired or invalid: we clear the session, so the app shows
 * the user as logged out and the login page can be shown.
 */
import { clearSession, readSession } from "@/lib/sessionStore"
import { errorFromResponse, networkError } from "@/services/apiError"

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, "")

type Method = "GET" | "POST" | "PATCH" | "DELETE"

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const session = readSession()
  const headers: Record<string, string> = { Accept: "application/json" }
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (session) headers.Authorization = `Bearer ${session.token}`

  let response: Response
  try {
    response = await fetch(API_BASE_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // fetch only throws when there is NO response: server down, offline, or CORS blocked.
    throw networkError()
  }

  if (response.status === 204) return undefined as T // e.g. DELETE: no body

  const json: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    // Token expired or invalid → log out. (Not for a wrong password on the login form.)
    if (response.status === 401 && session && path !== "/auth/login") clearSession()
    throw errorFromResponse(response.status, json, response.headers.get("X-Request-ID"))
  }
  return json as T
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  del: (path: string) => request<void>("DELETE", path),
}

/** Build "?a=1&b=2" from an object, skipping undefined values. "" when nothing is set. */
export function queryString(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ""
}
