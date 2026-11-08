/**
 * Cart logic as a REDUCER (#26, FR-C4).
 *
 * A reducer is a pure function: (currentState, action) → newState.
 *  - It never changes the old state; it returns a new array instead.
 *  - It has no side effects (no localStorage, no network).
 * That makes every cart rule predictable and easy to unit-test
 * (see cartReducer.test.ts) without rendering any React component.
 *
 * React wires it up with `useReducer` in CartProvider.tsx.
 */
import { MAX_QUANTITY, MIN_QUANTITY } from '@/lib/constants'
import { fromPaise, toPaise } from '@/lib/money'
import type { Product } from '@/types/product'

/**
 * One cart line. We store the product id + quantity (all the backend needs)
 * plus a small display SNAPSHOT (name, size, price) so the cart page can render
 * instantly from localStorage. The snapshot price is for the ESTIMATE only;
 * the backend uses its own current price when the order is placed.
 */
export interface CartLine {
  product_id: number
  name: string
  size: string
  price: string
  quantity: number
}

export type CartState = CartLine[]

/** Everything that can happen to the cart. A "discriminated union" on `type`. */
export type CartAction =
  | { type: 'add'; product: Product; quantity: number }
  | { type: 'setQuantity'; productId: number; quantity: number }
  | { type: 'remove'; productId: number }
  | { type: 'clear' }

/** Keeps a quantity inside 1–20 and makes it a whole number. */
export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return MIN_QUANTITY
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.round(quantity)))
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const { product, quantity } = action
      const existing = state.find((line) => line.product_id === product.product_id)
      if (existing) {
        // Same product added again → MERGE into one line (BR-4), capped at 20.
        return state.map((line) =>
          line.product_id === product.product_id
            ? { ...line, quantity: clampQuantity(line.quantity + quantity) }
            : line,
        )
      }
      return [
        ...state,
        {
          product_id: product.product_id,
          name: product.name,
          size: product.size,
          price: product.price,
          quantity: clampQuantity(quantity),
        },
      ]
    }
    case 'setQuantity':
      return state.map((line) =>
        line.product_id === action.productId ? { ...line, quantity: clampQuantity(action.quantity) } : line,
      )
    case 'remove':
      return state.filter((line) => line.product_id !== action.productId)
    case 'clear':
      return []
  }
}

/** Total number of units in the cart, shown on the header cart badge. */
export function getCartItemCount(state: CartState): number {
  return state.reduce((count, line) => count + line.quantity, 0)
}

/** price × quantity for one line, e.g. "120.00". Display only. */
export function getLineSubtotal(line: CartLine): string {
  return fromPaise(toPaise(line.price) * line.quantity)
}

/**
 * ESTIMATED total of the whole cart, calculated in integer paise to avoid
 * floating-point errors. The real total comes from the backend at checkout.
 */
export function getEstimatedTotal(state: CartState): string {
  return fromPaise(state.reduce((sum, line) => sum + toPaise(line.price) * line.quantity, 0))
}

/**
 * Turns whatever is in localStorage into a valid cart, or [] if it is broken.
 * localStorage is user-editable and may hold old or corrupt data; the app must
 * never crash because of it (#26 acceptance criterion).
 */
export function parseStoredCart(raw: string | null): CartState {
  if (!raw) return []
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data
      .filter(
        (line): line is CartLine =>
          typeof line === 'object' &&
          line !== null &&
          Number.isInteger(line.product_id) &&
          typeof line.name === 'string' &&
          typeof line.size === 'string' &&
          typeof line.price === 'string' &&
          /^\d+(\.\d{1,2})?$/.test(line.price) &&
          typeof line.quantity === 'number',
      )
      .map((line) => ({ ...line, quantity: clampQuantity(line.quantity) }))
  } catch {
    return []
  }
}
