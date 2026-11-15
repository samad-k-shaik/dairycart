/**
 * CartProvider: holds the cart for the whole app (React context + useReducer)
 * and keeps it in localStorage so it survives a page refresh (ADR-004).
 */
import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from "react"

import { MAX_QUANTITY, clampQuantity } from "@/lib/quantity"
import { CartContext, type CartContextValue } from "./cartContext"
import {
  CART_STORAGE_KEY,
  cartEstimatedTotal,
  cartItemCount,
  cartReducer,
  emptyCart,
  parseStoredCart,
  serializeCart,
  type CartState,
} from "./cartReducer"

/** Reads the saved cart. Storage can be blocked (private mode) or corrupt: never crash. */
function loadCart(): CartState {
  try {
    return parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY))
  } catch {
    return emptyCart
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  // The third argument runs loadCart once, on first render ("lazy initial state").
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCart)

  // Save after every change. If storage is full or blocked, the cart still works for this visit.
  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(state))
    } catch {
      // Ignore: persistence is a convenience, not required for the cart to work.
    }
  }, [state])

  const add = useCallback<CartContextValue["add"]>(
    (product, quantity = 1) => {
      const current = state.lines.find((l) => l.product_id === product.product_id)?.quantity ?? 0
      const next = Math.min(MAX_QUANTITY, current + clampQuantity(quantity))
      dispatch({ type: "add", product, quantity })
      return { quantity: next, added: next - current }
    },
    [state.lines],
  )

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      itemCount: cartItemCount(state),
      estimatedTotal: cartEstimatedTotal(state),
      add,
      setQuantity: (productId, quantity) => dispatch({ type: "setQuantity", productId, quantity }),
      remove: (productId) => dispatch({ type: "remove", productId }),
      restore: (line, index) => dispatch({ type: "restore", line, index }),
      clear: () => dispatch({ type: "clear" }),
    }),
    [state, add],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
