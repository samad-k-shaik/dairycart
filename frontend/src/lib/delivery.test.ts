import assert from "node:assert/strict"
import { describe, it } from "vitest"

import { navigationLink, nextDeliveryAction, summarize, waitingNote } from "./delivery.ts"
import type { DeliveryOrder } from "../types/delivery.ts"

function order(id: number, status: DeliveryOrder["status"]): DeliveryOrder {
  return {
    order_id: id,
    status,
    delivery_date: null,
    delivery_slot: null,
    customer_name: "Ravi",
    customer_phone: "9876543210",
    delivery_address: "12-3 Sai Residency, Hyderabad - 500016",
    delivery_pincode: "500016",
    delivery_latitude: null,
    delivery_longitude: null,
    total_amount: "120.00",
    items: [],
  }
}

describe("delivery boy actions (#109)", () => {
  it("follows the order steps: confirmed → out for delivery → delivered", () => {
    assert.deepEqual(nextDeliveryAction("CONFIRMED"), { status: "OUT_FOR_DELIVERY", label: "Start delivery" })
    assert.deepEqual(nextDeliveryAction("OUT_FOR_DELIVERY"), { status: "DELIVERED", label: "Mark delivered" })
  })

  it("has no button before confirmation or after delivery", () => {
    assert.equal(nextDeliveryAction("PLACED"), null)
    assert.equal(nextDeliveryAction("DELIVERED"), null)
    assert.equal(nextDeliveryAction("CANCELLED"), null)
  })

  it("explains why a placed order cannot be started yet", () => {
    assert.match(waitingNote("PLACED") ?? "", /Waiting for the dairy/)
    assert.equal(waitingNote("CONFIRMED"), null)
  })

  it("counts what is left to deliver", () => {
    const orders = [order(1, "DELIVERED"), order(2, "CONFIRMED"), order(3, "OUT_FOR_DELIVERY")]
    assert.deepEqual(summarize(orders), { total: 3, left: 2, delivered: 1 })
    assert.deepEqual(summarize([]), { total: 0, left: 0, delivered: 0 })
  })
})

describe("navigate to the customer (#134)", () => {
  it("uses the map pin when the order has one", () => {
    const pinned = { ...order(1, "CONFIRMED"), delivery_latitude: 17.4375, delivery_longitude: 78.4483 }
    assert.equal(navigationLink(pinned), "https://www.google.com/maps/dir/?api=1&destination=17.4375%2C78.4483")
  })

  it("falls back to the address text without a pin, and does not repeat the PIN code", () => {
    assert.equal(
      navigationLink(order(1, "CONFIRMED")),
      "https://www.google.com/maps/dir/?api=1&destination=12-3+Sai+Residency%2C+Hyderabad+-+500016",
    )
  })

  it("adds the PIN code when the address text does not have it", () => {
    const typed = { ...order(1, "CONFIRMED"), delivery_address: "Near temple, Ameerpet" }
    const url = new URL(navigationLink(typed) ?? "")
    assert.equal(url.searchParams.get("destination"), "Near temple, Ameerpet, 500016")
  })

  it("encodes characters that would otherwise break the link", () => {
    const tricky = { ...order(1, "CONFIRMED"), delivery_address: "Flat #4 & 5, 6/685 Road?" }
    const link = navigationLink(tricky) ?? ""
    assert.ok(!link.includes("#"), "a raw # would cut the link short")
    assert.equal(new URL(link).searchParams.get("destination"), "Flat #4 & 5, 6/685 Road?, 500016")
  })

  it("has no link without a pin or an address", () => {
    assert.equal(navigationLink({ ...order(1, "CONFIRMED"), delivery_address: null }), null)
    assert.equal(navigationLink({ ...order(1, "CONFIRMED"), delivery_address: "   " }), null)
  })
})
