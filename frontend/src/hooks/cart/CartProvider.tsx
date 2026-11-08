/**
 * CartProvider – owns the cart state and shares it with the whole app (#26).
 *
 * - State lives in `useReducer(cartReducer)` (rules are in cartReducer.ts).
 * - On first load the cart is RESTORED from localStorage, so it survives a
 *   page refresh (FR-C4, ADR-004: the cart is browser-only, not in the database).
 * - After every change it is SAVED back to localStorage.
 *
 * Mounted once in App.tsx, around the router, so every page can use useCart().
 */
import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { STORAGE_KEYS } from '@/lib/constants'
import type { Product } from '@/types/product'
import { CartContext, type CartContextValue } from './cartContext'
import { cartReducer, getCartItemCount, getEstimatedTotal, parseStoredCart, type CartState } from './cartReducer'

/** Reads the saved cart. Wrapped in try/catch: storage may be blocked (private mode). */
function loadCart(): CartState {
  try {
    return parseStoredCart(localStorage.getItem(STORAGE_KEYS.cart))
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  // The 3rd argument is a "lazy initialiser": loadCart runs only once, on first render.
  const [lines, dispatch] = useReducer(cartReducer, undefined, loadCart)

  // Save after every change. useEffect runs AFTER React has updated the screen.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(lines))
    } catch {
      // Storage full/blocked: the cart still works until the tab is closed.
    }
  }, [lines])

  // useCallback keeps the same function identity between renders,
  // so components receiving these functions do not re-render needlessly.
  const add = useCallback((product: Product, quantity = 1) => dispatch({ type: 'add', product, quantity }), [])
  const setQuantity = useCallback(
    (productId: number, quantity: number) => dispatch({ type: 'setQuantity', productId, quantity }),
    [],
  )
  const remove = useCallback((productId: number) => dispatch({ type: 'remove', productId }), [])
  const clear = useCallback(() => dispatch({ type: 'clear' }), [])

  // useMemo: build the context value only when the cart actually changes.
  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      itemCount: getCartItemCount(lines),
      estimatedTotal: getEstimatedTotal(lines),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [lines, add, setQuantity, remove, clear],
  )

  return <CartContext value={value}>{children}</CartContext>
}
