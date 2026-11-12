/**
 * Error types: the single error shape every non-2xx API response uses
 * (see "Error format" in `docs/05-api/api-contracts.md`).
 */

/** Error codes documented in the API contract. */
export type ApiErrorCode =
  | "VALIDATION_ERROR" // 422: request shape is wrong
  | "DUPLICATE_PRODUCT" // 400: same product twice in one order
  | "NOT_FOUND" // 404: product or order does not exist
  | "PRODUCT_UNAVAILABLE" // 409: product has is_available = false
  | "INVALID_STATUS_TRANSITION" // 409: e.g. DELIVERED -> PLACED
  | "PRODUCT_ALREADY_EXISTS" // 409: admin add/edit, same name and size (#86)
  | "PRODUCT_IN_USE" // 409: admin delete of a product that was already ordered (#86)
  | "INTERNAL_ERROR" // 500: unexpected server error
  | "METHOD_NOT_ALLOWED" // 405: wrong HTTP method
  | "NETWORK_ERROR" // frontend only: no answer at all (server down, offline, CORS)
  | "UNAUTHORIZED" // 401: not logged in, session expired, or wrong login details (#89)
  | "FORBIDDEN" // 403: logged in, but not allowed (e.g. a USER on an admin API) (#89)
  | "USER_ALREADY_EXISTS" // 409: sign-up with an email or username that is taken (#89)
  | "INSUFFICIENT_STOCK" // 409: more than the stock (#92)
  | "SUBSCRIPTION_ALREADY_ACTIVE" // 409: the user already has an active subscription (#97)
  | "SUBSCRIPTION_NOT_ACTIVE" // 409: cancel of a cancelled/completed subscription (#97)

export type ApiErrorDetail = {
  field: string
  issue: string
}

/** Body of every error response: `{ "error": { ... } }`. */
export type ApiError = {
  error: {
    code: ApiErrorCode
    message: string
    details?: ApiErrorDetail[]
    request_id: string
  }
}
