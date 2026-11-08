/**
 * ServiceError: what every service function throws when the "API" returns an error.
 *
 * The mock services (M2) and the real HTTP client (M3) both throw this same class,
 * so pages handle errors one way and never need to know where data came from.
 */
import type { ApiError, ApiErrorCode } from "@/types/api"

export class ServiceError extends Error {
  /** HTTP status code, e.g. 404 or 409. */
  readonly status: number
  /** The error body exactly as the API contract defines it. */
  readonly body: ApiError

  constructor(status: number, body: ApiError) {
    super(body.error.message)
    this.name = "ServiceError"
    this.status = status
    this.body = body
  }

  /** Shortcut for the machine-readable code, e.g. "NOT_FOUND". */
  get code(): ApiErrorCode {
    return this.body.error.code
  }
}
