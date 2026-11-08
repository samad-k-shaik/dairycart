/**
 * Cart logic as a pure "reducer": (current cart, action) → new cart.
 * No React, no storage here, so every rule is easy to unit-test (cartReducer.test.ts).
 *
 * ADR-004: the cart lives in the browser. We store only product_id, quantity and a
 * display snapshot (name, size, price). The estimated total is for display only;
 * the backend calculates the real total from database prices at checkout.
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */
import { fromPaise, toPaise } from "../../lib/money.ts"
import { clampQuantity, MAX_QUANTITY } from "../../lib/quantity.ts"
import type { Money, Product } from "../../types/product.ts"

/** One line in the cart. */
export type CartLine = {
  product_id: number
  name: string
  size: string
  /** Price snapshot when added, for the estimate only. */
  price: Money
  quantity: number
}

export type CartState = { lines: CartLine[] }

export type CartAction =
  | { type: "add"; product: Pick<Product, "product_id" | "name" | "size" | "price">; quantity: number }
  | { type: "setQuantity"; productId: number; quantity: number }
  | { type: "remove"; productId: number }
  /** Undo a remove: put the line back at its old position. */
  | { type: "restore"; line: CartLine; index: number }
  | { type: "clear" }

export const emptyCart: CartState = { lines: [] }

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const { product } = action
      const existing = state.lines.find((line) => line.product_id === product.product_id)
      if (existing) {
        // Same product again → merge into one line (BR-4), never above 20.
        const quantity = Math.min(MAX_QUANTITY, existing.quantity + clampQuantity(action.quantity))
        return {
          lines: state.lines.map((line) =>
            line.product_id === product.product_id ? { ...line, quantity } : line,
          ),
        }
      }
      const line: CartLine = {
        product_id: product.product_id,
        name: product.name,
        size: product.size,
        price: product.price,
        quantity: clampQuantity(action.quantity),
      }
      return { lines: [...state.lines, line] }
    }
    case "setQuantity":
      return {
        lines: state.lines.map((line) =>
          line.product_id === action.productId
            ? { ...line, quantity: clampQuantity(action.quantity) }
            : line,
        ),
      }
    case "remove":
      return { lines: state.lines.filter((line) => line.product_id !== action.productId) }
    case "restore": {
      // If the product was added again in the meantime, merge instead of duplicating.
      if (state.lines.some((line) => line.product_id === action.line.product_id)) {
        return cartReducer(state, { type: "add", product: action.line, quantity: action.line.quantity })
      }
      const lines = [...state.lines]
      const index = Math.min(Math.max(0, action.index), lines.length)
      lines.splice(index, 0, { ...action.line, quantity: clampQuantity(action.line.quantity) })
      return { lines }
    }
    case "clear":
      return emptyCart
  }
}

// ---- Derived values ("selectors"): calculated from the lines, never stored ----

/** Total number of bottles (shown on the header cart icon). */
export function cartItemCount(state: CartState): number {
  return state.lines.reduce((sum, line) => sum + line.quantity, 0)
}

/** price × quantity for one line, as a money string. */
export function lineSubtotal(line: CartLine): Money {
  return fromPaise(toPaise(line.price) * line.quantity)
}

/** Sum of all line subtotals, as a money string. ESTIMATE only. */
export function cartEstimatedTotal(state: CartState): Money {
  return fromPaise(state.lines.reduce((sum, line) => sum + toPaise(line.price) * line.quantity, 0))
}

// ---- Saving and restoring (localStorage) ----

export const CART_STORAGE_KEY = "milk-cart-v1"

const MONEY = /^\d+\.\d{2}$/

function isValidLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false
  const line = value as Record<string, unknown>
  return (
    Number.isInteger(line.product_id) &&
    (line.product_id as number) > 0 &&
    typeof line.name === "string" &&
    typeof line.size === "string" &&
    typeof line.price === "string" &&
    MONEY.test(line.price) &&
    typeof line.quantity === "number"
  )
}

/**
 * Turns whatever is in localStorage back into a cart. Never throws:
 * missing, corrupt or tampered data gives an empty cart or keeps only the valid lines.
 */
export function parseStoredCart(raw: string | null): CartState {
  if (!raw) return emptyCart
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return emptyCart // not JSON at all
  }
  const lines = (data as { lines?: unknown } | null)?.lines
  if (!Array.isArray(lines)) return emptyCart

  // Rebuild through the reducer so the normal rules apply (merge duplicates, 1–20).
  return lines.filter(isValidLine).reduce<CartState>(
    (state, line) => cartReducer(state, { type: "add", product: line, quantity: line.quantity }),
    emptyCart,
  )
}

export function serializeCart(state: CartState): string {
  return JSON.stringify({ lines: state.lines })
}
