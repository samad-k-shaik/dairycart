/**
 * Account service (#89): sign up, log in, who am I, and the admin user list.
 * Like every service, it only talks to the backend through apiClient.
 */
import { api } from "@/services/apiClient"
import type { LoginRequest, LoginResponse, RegisterRequest, User } from "@/types/auth"

/** POST /api/v1/auth/register → the new USER account (201). 409 if email/username is taken. */
export function register(request: RegisterRequest): Promise<User> {
  return api.post("/auth/register", request)
}

/** POST /api/v1/auth/login → token + user. 401 "Invalid username/email or password." */
export function login(request: LoginRequest): Promise<LoginResponse> {
  return api.post("/auth/login", request)
}

/** GET /api/v1/auth/me → the logged-in user (401 if the token is not valid any more). */
export function getMe(): Promise<User> {
  return api.get("/auth/me")
}

/** GET /api/v1/admin/users → every registered user (ADMIN only: 401/403 otherwise). */
export function getUsers(): Promise<User[]> {
  return api.get("/admin/users")
}
