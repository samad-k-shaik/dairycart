/**
 * Unit tests for the cart reducer (#26 testing requirement: add, merge, cap, remove, clear).
 * Because the reducer is a pure function, no React rendering is needed.
 */
import { describe, expect, it } from 'vitest'
import type { Product } from '@/types/product'
import { cartReducer, getCartItemCount, getEstimatedTotal, parseStoredCart, type CartState } from './cartReducer'

const cowMilk: Product = { product_id: 2, name: 'Cow Milk', size: '1 Litre', price: '60.00', is_available: true }
const buffaloMilk: Product = { product_id: 3, name: 'Buffalo Milk', size: '500 ml', price: '35.00', is_available: true }

describe('cartReducer', () => {
  it('adds a new product as a new line', () => {
    const state = cartReducer([], { type: 'add', product: cowMilk, quantity: 2 })
    expect(state).toEqual([{ product_id: 2, name: 'Cow Milk', size: '1 Litre', price: '60.00', quantity: 2 }])
  })

  it('merges the same product into one line', () => {
    let state: CartState = cartReducer([], { type: 'add', product: cowMilk, quantity: 2 })
    state = cartReducer(state, { type: 'add', product: cowMilk, quantity: 3 })
    expect(state).toHaveLength(1)
    expect(state[0].quantity).toBe(5)
  })

  it('caps a merged quantity at 20', () => {
    let state: CartState = cartReducer([], { type: 'add', product: cowMilk, quantity: 15 })
    state = cartReducer(state, { type: 'add', product: cowMilk, quantity: 10 })
    expect(state[0].quantity).toBe(20)
  })

  it('keeps setQuantity within 1–20', () => {
    const state = cartReducer([], { type: 'add', product: cowMilk, quantity: 1 })
    expect(cartReducer(state, { type: 'setQuantity', productId: 2, quantity: 0 })[0].quantity).toBe(1)
    expect(cartReducer(state, { type: 'setQuantity', productId: 2, quantity: 99 })[0].quantity).toBe(20)
    expect(cartReducer(state, { type: 'setQuantity', productId: 2, quantity: 7 })[0].quantity).toBe(7)
  })

  it('removes a line', () => {
    let state: CartState = cartReducer([], { type: 'add', product: cowMilk, quantity: 1 })
    state = cartReducer(state, { type: 'add', product: buffaloMilk, quantity: 1 })
    state = cartReducer(state, { type: 'remove', productId: 2 })
    expect(state.map((line) => line.product_id)).toEqual([3])
  })

  it('clears the cart', () => {
    const state = cartReducer([], { type: 'add', product: cowMilk, quantity: 1 })
    expect(cartReducer(state, { type: 'clear' })).toEqual([])
  })

  it('does not modify the previous state (immutability)', () => {
    const before: CartState = cartReducer([], { type: 'add', product: cowMilk, quantity: 1 })
    const snapshot = structuredClone(before)
    cartReducer(before, { type: 'add', product: cowMilk, quantity: 1 })
    expect(before).toEqual(snapshot)
  })
})

describe('cart totals', () => {
  it('counts units and calculates the estimated total in paise', () => {
    let state: CartState = cartReducer([], { type: 'add', product: cowMilk, quantity: 2 })
    state = cartReducer(state, { type: 'add', product: buffaloMilk, quantity: 1 })
    expect(getCartItemCount(state)).toBe(3)
    expect(getEstimatedTotal(state)).toBe('155.00') // 2 × 60 + 35
  })
})

describe('parseStoredCart', () => {
  it('returns an empty cart for missing or corrupt data instead of crashing', () => {
    expect(parseStoredCart(null)).toEqual([])
    expect(parseStoredCart('{not json')).toEqual([])
    expect(parseStoredCart('"a string"')).toEqual([])
  })

  it('drops invalid lines and clamps quantities', () => {
    const raw = JSON.stringify([
      { product_id: 2, name: 'Cow Milk', size: '1 Litre', price: '60.00', quantity: 50 },
      { product_id: 'x', name: 'Bad line' },
    ])
    expect(parseStoredCart(raw)).toEqual([
      { product_id: 2, name: 'Cow Milk', size: '1 Litre', price: '60.00', quantity: 20 },
    ])
  })
})
