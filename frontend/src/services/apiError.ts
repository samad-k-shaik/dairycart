/**
 * Turns a failed HTTP response into a ServiceError (M3-08).
 *
 * Kept free of `fetch` and `import.meta.env` so Node's test runner can test it
 * (apiError.test.ts). Relative ".ts" imports for the same reason.
 */
import type { ApiError } from "../types/api.ts"
import { ServiceError } from "./serviceError.ts"

export const NETWORK_ERROR_MESSAGE =
  "We could not reach the DairyCart server. Check your connection and try again."

const GENERIC_MESSAGE = "Something went wrong on our side. Please try again."

/** True if the JSON has the contract's error shape: { "error": { "code", "message" } }. */
function isApiError(value: unknown): value is ApiError {
  const error = (value as Partial<ApiError> | null)?.error
  return typeof error?.code === "string" && typeof error?.message === "string"
}

/**
 * A non-2xx response → ServiceError carrying the backend's code, message, details and
 * request id. If the body is not in the contract's format (e.g. a proxy's HTML error
 * page), we still return a ServiceError with a safe generic message.
 */
export function errorFromResponse(status: number, body: unknown, requestIdHeader: string | null): ServiceError {
  if (isApiError(body)) {
    return new ServiceError(status, {
      error: {
        ...body.error,
        details: body.error.details ?? [],
        request_id: body.error.request_id ?? requestIdHeader ?? "",
      },
    })
  }
  return new ServiceError(status, {
    error: { code: "INTERNAL_ERROR", message: GENERIC_MESSAGE, details: [], request_id: requestIdHeader ?? "" },
  })
}

/** The request never got an answer (server stopped, no network, CORS refused). */
export function networkError(): ServiceError {
  return new ServiceError(0, {
    error: { code: "NETWORK_ERROR", message: NETWORK_ERROR_MESSAGE, details: [], request_id: "" },
  })
}
