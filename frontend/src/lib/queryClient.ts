/**
 * The app's single TanStack Query client: it fetches, caches and tracks loading/error
 * state for server data (products, orders). Provided to the app in main.tsx.
 */
import { QueryClient } from "@tanstack/react-query"

import { ServiceError } from "@/services/serviceError"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data counts as fresh for 30 s: revisiting a page in that time reuses the cache.
      staleTime: 30_000,
      // Retry only failures that might succeed next time (network/5xx), at most twice.
      // A 4xx answer such as 404 "not found" or 422 "invalid" will not change, so never retry it.
      retry: (failureCount, error) => {
        if (error instanceof ServiceError && error.status < 500) return false
        return failureCount < 2
      },
    },
  },
})
