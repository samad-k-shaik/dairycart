/**
 * In-browser mock "database" for M2.
 *
 * Starts from the JSON files in this folder (products.json, orders.json).
 * Orders and customers are saved to localStorage, so an order placed at
 * checkout is still there after a refresh, and an admin status change is
 * visible in the customer's order history. That lets us demo the full flow
 * customer → admin → customer before the backend exists.
 *
 * To reset the mock data: run `localStorage.removeItem('milk-mock-db-v1')`
 * in the browser console, or use "Reset mock data" in the DevMockSwitch.
 *
 * Only the mock services (src/services/*Service.ts) may import this file.
 * Pages must never import mock data directly (#22).
 */
import { STORAGE_KEYS } from '@/lib/constants'
import type { Customer, Order } from '@/types/order'
import type { Product } from '@/types/product'
import ordersJson from './orders.json'
import productsJson from './products.json'

interface MockDbState {
  orders: Order[]
  customers: Customer[]
}

/** Products are read-only in the POC, so they come straight from the JSON. */
export const mockProducts: readonly Product[] = productsJson

/** Builds the starting state from the JSON seed data. */
function seedState(): MockDbState {
  // JSON imports are typed loosely (status: string), so we tell TypeScript the real type.
  const orders = structuredClone(ordersJson) as Order[]
  // Collect each distinct customer from the seed orders.
  const customers = new Map<number, Customer>()
  for (const order of orders) customers.set(order.customer.customer_id, order.customer)
  return { orders, customers: [...customers.values()] }
}

/** Loads saved state from localStorage; falls back to the seed if missing or corrupt. */
function loadState(): MockDbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.mockDb)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MockDbState>
      if (Array.isArray(parsed.orders) && Array.isArray(parsed.customers)) {
        return { orders: parsed.orders, customers: parsed.customers }
      }
    }
  } catch {
    // Corrupt JSON or blocked storage → start fresh instead of crashing.
  }
  return seedState()
}

/** The live state. Module-level variable = one shared "database" for the whole app. */
let state: MockDbState = loadState()

/** Writes the state back to localStorage after every change. */
function saveState(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.mockDb, JSON.stringify(state))
  } catch {
    // Storage full or blocked: the app still works for this session.
  }
}

export const mockDb = {
  getOrders(): Order[] {
    return state.orders
  },

  findOrder(orderId: number): Order | undefined {
    return state.orders.find((order) => order.order_id === orderId)
  },

  /** BR-5: find a customer by phone; if not found, create one with the given name. */
  findOrCreateCustomer(name: string, phone: string): Customer {
    const existing = state.customers.find((customer) => customer.phone === phone)
    if (existing) return existing
    const nextId = Math.max(0, ...state.customers.map((c) => c.customer_id)) + 1
    const customer: Customer = { customer_id: nextId, name, phone }
    state.customers.push(customer)
    return customer
  },

  nextOrderId(): number {
    return Math.max(0, ...state.orders.map((o) => o.order_id)) + 1
  },

  nextOrderItemId(): number {
    const ids = state.orders.flatMap((o) => o.items.map((i) => i.order_item_id))
    return Math.max(0, ...ids) + 1
  },

  addOrder(order: Order): void {
    state.orders.unshift(order) // newest first, like the API
    saveState()
  },

  updateOrder(updated: Order): void {
    state.orders = state.orders.map((o) => (o.order_id === updated.order_id ? updated : o))
    saveState()
  },

  /** Back to the original JSON data (used by the dev switch). */
  reset(): void {
    state = seedState()
    try {
      localStorage.removeItem(STORAGE_KEYS.mockDb)
    } catch {
      // ignore
    }
  },
}
