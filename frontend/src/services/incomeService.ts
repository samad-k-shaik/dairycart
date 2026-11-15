/**
 * Income service (#105): GET /api/v1/admin/income (ADMIN only). Real backend only.
 */
import { api, queryString } from "@/services/apiClient"
import { USE_MOCKS } from "@/services/mockMode"
import { ServiceError } from "@/services/serviceError"
import type { IncomeReport } from "@/types/income"

export function getIncome(from: string, to: string): Promise<IncomeReport> {
  if (USE_MOCKS) {
    return Promise.reject(
      new ServiceError(503, {
        error: {
          code: "INTERNAL_ERROR",
          message: "Income needs the real backend. Set VITE_USE_MOCKS=false.",
          request_id: "mock",
        },
      }),
    )
  }
  return api.get(`/admin/income${queryString({ from, to })}`)
}
