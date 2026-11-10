/**
 * Mock server helpers (M2 only).
 *
 * They make the mock services behave like the real API from the contract:
 * a network delay, errors in the contract's error format, and a small "database"
 * kept in memory AND saved to localStorage, so orders survive a page reload and
 * appear in other tabs of the same browser (like a real backend would).
 * In M3 the services call the real backend instead and this folder is no longer used.
 */
import type { ApiErrorCode, ApiErrorDetail } from "@/types/api"
import { ORDER_STATUSES, type Order } from "@/types/order"
import type { Money, Product } from "@/types/product"
import { ServiceError } from "@/services/serviceError"

import { getMockMode } from "./mockSettings"
import ordersJson from "./orders.json"
import productsJson from "./products.json"

/** Simulated network latency for every mock call ("slow" dev mode: 3 s). */
export const MOCK_LATENCY_MS = 300
const SLOW_LATENCY_MS = 3000

// ---- The mock "database" ----

/** localStorage key for the saved mock data. Bump the version if the shape changes. */
export const MOCK_DB_STORAGE_KEY = "dairycart-mock-db-v1"

type MockData = { products: Product[]; orders: Order[] }

/** The original seed data. structuredClone = deep copy, so the imported JSON is never changed. */
function seedData(): MockData {
  // `as`: JSON gives `status: string`; mockData.test.ts checks every status is valid.
  return {
    products: structuredClone(productsJson) as Product[],
    orders: structuredClone(ordersJson) as Order[],
  }
}

/** Light shape check, so damaged or old saved data falls back to the seed instead of crashing. */
function isMockData(value: unknown): value is MockData {
  const data = value as Partial<MockData> | null
  return (
    Array.isArray(data?.products) &&
    Array.isArray(data?.orders) &&
    data.orders.every(
      (o) =>
        Number.isInteger(o?.order_id) &&
        ORDER_STATUSES.includes(o?.status) &&
        Array.isArray(o?.items) &&
        typeof o?.customer?.phone === "string",
    )
  )
}

function loadSavedData(): MockData | null {
  try {
    const raw = window.localStorage.getItem(MOCK_DB_STORAGE_KEY)
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    return isMockData(data) ? data : null
  } catch {
    return null // storage blocked or not JSON: use the seed
  }
}

export const db: MockData = loadSavedData() ?? seedData()

/** Saves the mock data after every change. If storage is blocked or full, it just stays in memory. */
export function saveDb() {
  try {
    window.localStorage.setItem(MOCK_DB_STORAGE_KEY, JSON.stringify(db))
  } catch {
    // ignore: the mock still works for this visit
  }
}

/** Next free ids, continuing after the highest id in the data. */
export const ids = { order: 0, orderItem: 0, customer: 0 }
function recalculateIds() {
  ids.order = Math.max(0, ...db.orders.map((o) => o.order_id)) + 1
  ids.orderItem = Math.max(0, ...db.orders.flatMap((o) => o.items.map((i) => i.order_item_id))) + 1
  ids.customer = Math.max(0, ...db.orders.map((o) => o.customer.customer_id)) + 1
}
recalculateIds()

// Another tab saved new data (e.g. an order placed in the customer tab, or a product added
// in the admin tab): use it here too. The screens refetch via lib/crossTabSync.ts.
// (The 'storage' event only fires in OTHER tabs, never the one that saved.)
window.addEventListener("storage", (event) => {
  if (event.key !== MOCK_DB_STORAGE_KEY) return
  const saved = loadSavedData() ?? seedData()
  db.products = saved.products
  db.orders = saved.orders
  recalculateIds()
})

/** Dev "Reset mock data": forget saved changes and go back to the original seed data. */
export function resetMockDb() {
  try {
    window.localStorage.removeItem(MOCK_DB_STORAGE_KEY)
  } catch {
    // ignore
  }
  const seed = seedData()
  db.products = seed.products
  db.orders = seed.orders
  recalculateIds()
}

/**
 * Data for LIST reads. In the dev "empty" mode the lists are empty, to show empty states;
 * otherwise it is the normal in-memory data.
 */
export function readDb(): { products: Product[]; orders: Order[] } {
  return getMockMode() === "empty" ? { products: [], orders: [] } : db
}

// ---- Simulated responses ----

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const latency = () => (getMockMode() === "slow" ? SLOW_LATENCY_MS : MOCK_LATENCY_MS)

function serviceError(status: number, code: ApiErrorCode, message: string, details?: ApiErrorDetail[]) {
  return new ServiceError(status, {
    error: { code, message, details, request_id: crypto.randomUUID() },
  })
}

/** Simulates a successful response: waits, then returns a copy of the data. */
export async function respond<T>(data: T): Promise<T> {
  await wait(latency())
  if (getMockMode() === "error") {
    // Dev "error" mode: every call fails like a broken server would.
    throw serviceError(500, "INTERNAL_ERROR", "Something went wrong on our side. Please try again.")
  }
  return structuredClone(data)
}

/** Simulates an error response: waits, then throws a ServiceError in the contract's format. */
export async function fail(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetail[],
): Promise<never> {
  await wait(latency())
  throw serviceError(status, code, message, details)
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
