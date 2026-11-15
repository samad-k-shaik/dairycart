/**
 * useIncome (#105): the admin Income report for a period. Under the "orders" key, so a
 * status change (e.g. an order marked Delivered) refreshes it.
 */
import { useQuery } from "@tanstack/react-query"

import { orderKeys } from "@/hooks/orderKeys"
import { getIncome } from "@/services/incomeService"

export function useIncome(from: string, to: string) {
  return useQuery({
    queryKey: [...orderKeys.all, "income", from, to] as const,
    queryFn: () => getIncome(from, to),
    placeholderData: (previous) => previous, // keep the charts while another period loads
  })
}
