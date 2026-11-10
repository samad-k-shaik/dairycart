/**
 * Real backend or mock data?
 *
 * The app uses the REAL backend (VITE_API_BASE_URL). The M2 mock services are only used
 * when VITE_USE_MOCKS=true, e.g. to work on screens offline (M3-08). Restart `npm run dev`
 * after changing it.
 */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true"
