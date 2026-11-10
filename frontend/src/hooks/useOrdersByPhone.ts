/**
 * useOrdersByPhone(phone): a customer's order history, newest first
 * (GET /orders?phone=, proposed in ADR-005; mocked in M2).
 *
 * `enabled`: the query only runs for a valid 10-digit phone. With an empty or
 * half-typed number nothing is fetched and the hook stays idle.
 */
import { useQuery } from "@tanstack/react-query"

import { orderKeys } from "@/hooks/orderKeys"
import { PHONE_PATTERN } from "@/lib/validation"
import { getOrdersByPhone } from "@/services/orderService"

export function useOrdersByPhone(phone: string) {
  return useQuery({
    queryKey: orderKeys.byPhone(phone),
    queryFn: () => getOrdersByPhone(phone),
    enabled: PHONE_PATTERN.test(phone),
  })
}
