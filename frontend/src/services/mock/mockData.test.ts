/**
 * Checks that the mock JSON obeys the API contract and the business rules,
 * so screens built on it never show impossible data (wrong totals, unknown statuses).
 * Runs with Node's built-in test runner (`npm test`).
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { ORDER_STATUSES } from "../../types/order.ts"
import orders from "./orders.json" with { type: "json" }
import products from "./products.json" with { type: "json" }

/** "60.00" → 6000. Whole paise avoid floating-point errors. */
const toPaise = (amount: string) => Math.round(Number(amount.replace(".", "")))
const MONEY = /^\d+\.\d{2}$/
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
const PHONE = /^[6-9]\d{9}$/

describe("mock products", () => {
  it("are the 4 products from the API contract", () => {
    const summary = products.map((p) => `${p.product_id} ${p.name} ${p.size} ${p.price}`)
    assert.deepEqual(summary, [
      "1 Cow Milk 500 ml 30.00",
      "2 Cow Milk 1 Litre 60.00",
      "3 Buffalo Milk 500 ml 35.00",
      "4 Buffalo Milk 1 Litre 70.00",
    ])
  })
})

describe("mock orders", () => {
  it("has about 8 orders covering every status", () => {
    assert.ok(orders.length >= 8, `expected at least 8 orders, got ${orders.length}`)
    const used = new Set(orders.map((o) => o.status))
    for (const status of ORDER_STATUSES) {
      assert.ok(used.has(status), `no mock order has status ${status}`)
    }
  })

  it("uses only valid statuses, dates, phones and money strings", () => {
    for (const order of orders) {
      const where = `order ${order.order_id}`
      assert.ok((ORDER_STATUSES as readonly string[]).includes(order.status), `${where}: status`)
      assert.match(order.order_date, ISO_UTC, `${where}: order_date`)
      assert.match(order.customer.phone, PHONE, `${where}: phone`)
      assert.match(order.total_amount, MONEY, `${where}: total_amount`)
    }
  })

  it("has unique order ids and order item ids", () => {
    const orderIds = orders.map((o) => o.order_id)
    const itemIds = orders.flatMap((o) => o.items.map((i) => i.order_item_id))
    assert.equal(new Set(orderIds).size, orderIds.length, "duplicate order_id")
    assert.equal(new Set(itemIds).size, itemIds.length, "duplicate order_item_id")
  })

  it("does the maths right: subtotal = unit_price × quantity, total = Σ subtotal (BR-2)", () => {
    for (const order of orders) {
      let sum = 0
      for (const item of order.items) {
        const where = `order ${order.order_id} item ${item.order_item_id}`
        assert.match(item.unit_price, MONEY, `${where}: unit_price`)
        assert.ok(item.quantity >= 1 && item.quantity <= 20, `${where}: quantity 1–20`)
        assert.equal(toPaise(item.subtotal), toPaise(item.unit_price) * item.quantity, where)
        sum += toPaise(item.subtotal)
      }
      assert.equal(toPaise(order.total_amount), sum, `order ${order.order_id}: total_amount`)
    }
  })

  it("never repeats a product inside one order (BR-4)", () => {
    for (const order of orders) {
      const ids = order.items.map((i) => i.product_id)
      assert.equal(new Set(ids).size, ids.length, `order ${order.order_id}`)
    }
  })

  it("matches item names and sizes to the product list", () => {
    for (const order of orders) {
      for (const item of order.items) {
        const product = products.find((p) => p.product_id === item.product_id)
        assert.ok(product, `order ${order.order_id}: unknown product ${item.product_id}`)
        assert.equal(item.product_name, product.name)
        assert.equal(item.size, product.size)
      }
    }
  })

  it("includes the contract's example order 101 totalling 155.00", () => {
    const order = orders.find((o) => o.order_id === 101)
    assert.ok(order)
    assert.equal(order.total_amount, "155.00")
  })
})
