/**
 * Mock server helpers (M2 only).
 *
 * They make the mock services behave like the real API from the contract:
 * a network delay, errors in the contract's error format, and an in-memory
 * "database" that lives until the page is reloaded.
 * In M3 the services call the real backend instead and this folder is no longer used.
 */
import type { ApiErrorCode, ApiErrorDetail } from "@/types/api"
import type { Order } from "@/types/order"
import type { Money, Product } from "@/types/product"
import { ServiceError } from "@/services/serviceError"

import ordersJson from "./orders.json"
import productsJson from "./products.json"

/** Simulated network latency for every mock call. */
export const MOCK_LATENCY_MS = 300

// ---- In-memory "database" ----
// structuredClone makes a deep copy, so changes (new orders, status updates)
// never modify the imported JSON. Reloading the page resets everything.
// `as Order[]`: JSON gives `status: string`; mockData.test.ts checks every status is valid.
export const db = {
  products: structuredClone(productsJson) as Product[],
  orders: structuredClone(ordersJson) as Order[],
}

/** Next free ids, continuing after the highest id in the mock data. */
export const ids = {
  order: Math.max(...db.orders.map((o) => o.order_id)) + 1,
  orderItem: Math.max(...db.orders.flatMap((o) => o.items.map((i) => i.order_item_id))) + 1,
  customer: Math.max(...db.orders.map((o) => o.customer.customer_id)) + 1,
}

// ---- Simulated responses ----

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Simulates a successful response: waits, then returns a copy of the data. */
export async function respond<T>(data: T): Promise<T> {
  await wait(MOCK_LATENCY_MS)
  return structuredClone(data)
}

/** Simulates an error response: waits, then throws a ServiceError in the contract's format. */
export async function fail(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetail[],
): Promise<never> {
  await wait(MOCK_LATENCY_MS)
  throw new ServiceError(status, {
    error: { code, message, details, request_id: crypto.randomUUID() },
  })
}

// ---- Money maths (mock only; the real backend calculates totals) ----
// Work in whole paise (₹60.00 = 6000) so there are no floating-point rounding errors.

export function toPaise(amount: Money): number {
  const [rupees, paise = "00"] = amount.split(".")
  return Number(rupees) * 100 + Number(paise.padEnd(2, "0"))
}

export function fromPaise(paise: number): Money {
  const rupees = Math.floor(paise / 100)
  const rest = String(paise % 100).padStart(2, "0")
  return `${rupees}.${rest}`
}
