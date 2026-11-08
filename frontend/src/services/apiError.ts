/**
 * ApiRequestError – the ONE error type every service throws.
 *
 * WHY: pages should not care whether an error came from the mock (M2) or the
 * real backend (M3). Both produce an ApiRequestError carrying the contract's
 * error shape (code, message, details), so a page can simply show
 * `error.message`, or check `error.code === 'NOT_FOUND'` to show a special state.
 *
 * FUTURE (M3, #308): `apiClient.ts` will turn non-2xx HTTP responses into this
 * same class, so no page or hook needs to change.
 */
import type { ApiError, ApiErrorCode, ApiErrorDetail } from '@/types/api'

export class ApiRequestError extends Error {
  readonly status: number // HTTP status, e.g. 404
  readonly code: ApiErrorCode // e.g. 'NOT_FOUND'
  readonly details: ApiErrorDetail[]
  readonly requestId?: string

  constructor(status: number, error: ApiError) {
    super(error.message) // `.message` is the human-readable text
    this.name = 'ApiRequestError'
    this.status = status
    this.code = error.code
    this.details = error.details ?? []
    this.requestId = error.request_id
  }
}

/** Helper: is this unknown thrown value one of our API errors? */
export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError
}

/**
 * Turns ANY thrown value into a message that is safe to show a customer.
 * Raw technical errors (stack traces, "TypeError: undefined…") are never shown (#32).
 */
export function getErrorMessage(error: unknown): string {
  if (isApiRequestError(error)) return error.message
  return 'Something went wrong. Please try again.'
}
