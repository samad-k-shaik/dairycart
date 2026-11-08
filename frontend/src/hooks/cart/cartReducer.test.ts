/** Unit tests for the cart reducer (M2-07 testing requirement). */
import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  cartEstimatedTotal,
  cartItemCount,
  cartReducer,
  emptyCart,
  lineSubtotal,
  parseStoredCart,
  serializeCart,
  type CartState,
} from "./cartReducer.ts"

const cow1L = { product_id: 2, name: "Cow Milk", size: "1 Litre", price: "60.00" }
const buffalo500 = { product_id: 3, name: "Buffalo Milk", size: "500 ml", price: "35.00" }

const add = (state: CartState, product: typeof cow1L, quantity: number) =>
  cartReducer(state, { type: "add", product, quantity })

describe("add", () => {
  it("adds a new product as a new line with a display snapshot", () => {
    const state = add(emptyCart, cow1L, 2)
    assert.deepEqual(state.lines, [{ ...cow1L, quantity: 2 }])
  })

  it("merges the same product into one line (quantity increases)", () => {
    const state = add(add(emptyCart, cow1L, 2), cow1L, 3)
    assert.equal(state.lines.length, 1)
    assert.equal(state.lines[0].quantity, 5)
  })

  it("caps a merged line at 20", () => {
    const state = add(add(emptyCart, cow1L, 15), cow1L, 10)
    assert.equal(state.lines[0].quantity, 20)
  })

  it("keeps different products as separate lines, in the order added", () => {
    const state = add(add(emptyCart, cow1L, 1), buffalo500, 1)
    assert.deepEqual(
      state.lines.map((l) => l.product_id),
      [2, 3],
    )
  })

  it("does not change the previous state object (immutability)", () => {
    const before = add(emptyCart, cow1L, 1)
    add(before, cow1L, 1)
    assert.equal(before.lines[0].quantity, 1)
  })
})

describe("setQuantity", () => {
  it("sets the quantity, kept within 1–20", () => {
    const state = add(emptyCart, cow1L, 2)
    assert.equal(cartReducer(state, { type: "setQuantity", productId: 2, quantity: 7 }).lines[0].quantity, 7)
    assert.equal(cartReducer(state, { type: "setQuantity", productId: 2, quantity: 0 }).lines[0].quantity, 1)
    assert.equal(cartReducer(state, { type: "setQuantity", productId: 2, quantity: 99 }).lines[0].quantity, 20)
  })
})

describe("remove and clear", () => {
  it("removes only the chosen product", () => {
    const state = add(add(emptyCart, cow1L, 1), buffalo500, 1)
    assert.deepEqual(
      cartReducer(state, { type: "remove", productId: 2 }).lines.map((l) => l.product_id),
      [3],
    )
  })

  it("clear empties the cart", () => {
    const state = add(add(emptyCart, cow1L, 1), buffalo500, 1)
    assert.deepEqual(cartReducer(state, { type: "clear" }), emptyCart)
  })
})

describe("derived values (paise maths)", () => {
  it("counts bottles and estimates the total exactly", () => {
    const state = add(add(emptyCart, cow1L, 2), buffalo500, 1) // the contract's example
    assert.equal(cartItemCount(state), 3)
    assert.equal(lineSubtotal(state.lines[0]), "120.00")
    assert.equal(cartEstimatedTotal(state), "155.00")
    assert.equal(cartEstimatedTotal(emptyCart), "0.00")
  })
})

describe("localStorage restore (corrupt data must not crash)", () => {
  it("round-trips a cart through save and restore", () => {
    const state = add(add(emptyCart, cow1L, 2), buffalo500, 1)
    assert.deepEqual(parseStoredCart(serializeCart(state)), state)
  })

  it("returns an empty cart for missing, non-JSON or wrongly shaped data", () => {
    for (const raw of [null, "", "not json {", "42", "null", '"text"', "[]", '{"lines":"x"}']) {
      assert.deepEqual(parseStoredCart(raw), emptyCart, `raw=${raw}`)
    }
  })

  it("keeps valid lines, drops invalid ones, fixes bad quantities and merges duplicates", () => {
    const raw = JSON.stringify({
      lines: [
        { ...cow1L, quantity: 3 },
        { product_id: "x", name: "Bad", size: "1 L", price: "1.00", quantity: 1 }, // bad id
        { ...buffalo500, price: 35, quantity: 1 }, // price not a money string
        { ...cow1L, quantity: 30 }, // duplicate → merged, capped at 20
        { product_id: 4, name: "Buffalo Milk", size: "1 Litre", price: "70.00", quantity: -4 },
        null,
      ],
    })
    const state = parseStoredCart(raw)
    assert.deepEqual(
      state.lines.map((l) => `${l.product_id}×${l.quantity}`),
      ["2×20", "4×1"],
    )
  })
})
