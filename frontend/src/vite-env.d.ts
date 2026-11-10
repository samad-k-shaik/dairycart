/// <reference types="vite/client" />

/** The VITE_* settings the app reads (see frontend/.env.example). */
interface ImportMetaEnv {
  /** Backend address including /api/v1, e.g. http://localhost:8000/api/v1 */
  readonly VITE_API_BASE_URL?: string
  /** "true" = use the M2 mock services instead of the backend */
  readonly VITE_USE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
