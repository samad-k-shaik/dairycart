/**
 * Builds the POST /orders request body from the checkout form and the cart.
 *
 * Only product ids and quantities are sent. Prices and totals are NEVER sent:
 * the backend looks up current prices in the database and calculates the total (BR-2).
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */
import type { CreateOrderRequest } from "../types/order.ts"

export function buildCreateOrderRequest(
  customer: { name: string; phone: string },
  lines: { product_id: number; quantity: number }[],
): CreateOrderRequest {
  return {
    customer: { name: customer.name.trim(), phone: customer.phone },
    // Pick the two allowed fields explicitly, so cart snapshot fields (name, size, price)
    // can never leak into the request.
    items: lines.map(({ product_id, quantity }) => ({ product_id, quantity })),
  }
}
