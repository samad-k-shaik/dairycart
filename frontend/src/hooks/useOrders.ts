/**
 * Customer order hooks: place an order (#28), read one order, order history (#29).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isValidPhone } from '@/lib/validation'
import { createOrder, getOrder, getOrdersByPhone } from '@/services/orderService'
import type { CreateOrderRequest } from '@/types/order'
import { queryKeys } from './queryKeys'

/** One full order (confirmation page, order details, admin details sheet). */
export function useOrder(orderId: number) {
  return useQuery({
    queryKey: queryKeys.order(orderId),
    queryFn: () => getOrder(orderId),
    enabled: Number.isInteger(orderId) && orderId > 0,
  })
}

/**
 * Order history for a phone number (FR-C7).
 * `enabled` = a CONDITIONAL query: nothing is requested until the customer has
 * typed a valid phone number and pressed "Find orders".
 */
export function useCustomerOrders(phone: string) {
  return useQuery({
    queryKey: queryKeys.ordersByPhone(phone),
    queryFn: () => getOrdersByPhone(phone),
    enabled: isValidPhone(phone),
  })
}

/**
 * Place an order (FR-C5).
 * `useMutation` is TanStack Query's tool for actions that CHANGE data
 * (POST/PATCH). It gives `mutate()`, `isPending` (to disable the button) and `error`.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateOrderRequest) => createOrder(request),
    onSuccess: (order) => {
      // Put the new order in the cache so the confirmation page shows it instantly.
      queryClient.setQueryData(queryKeys.order(order.order_id), order)
      // Order lists (history, admin) are now out of date → refetch them when next shown.
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders() })
    },
  })
}
