/**
 * Error format – mirrors "Error format" in docs/05-api/api-contracts.md.
 *
 * Every failed API call returns the same JSON shape:
 *   { "error": { "code": "NOT_FOUND", "message": "...", "details": [...], "request_id": "..." } }
 * Having ONE shape means the UI can show any error the same way.
 */

/** Machine-readable error codes the backend can return. */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DUPLICATE_PRODUCT'
  | 'PRODUCT_UNAVAILABLE'
  | 'INVALID_STATUS_TRANSITION'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR' // frontend-only: the request never reached the server

/** Points at the field that failed, e.g. { field: "customer.phone", issue: "..." }. */
export interface ApiErrorDetail {
  field: string
  issue: string
}

/** The `error` object inside an error response. */
export interface ApiError {
  code: ApiErrorCode
  message: string // safe, human-readable text we can show to customers
  details?: ApiErrorDetail[]
  request_id?: string // helps developers find the matching backend log line
}

/** The full JSON body of an error response. */
export interface ApiErrorResponse {
  error: ApiError
}
