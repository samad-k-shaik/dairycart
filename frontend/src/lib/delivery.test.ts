import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { mapLink, nextDeliveryAction, summarize, waitingNote } from "./delivery.ts"
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

  it("links to the map pin only when there is one", () => {
    assert.equal(mapLink(order(1, "CONFIRMED")), null)
    assert.equal(
      mapLink({ delivery_latitude: 17.4375, delivery_longitude: 78.4483 }),
      "https://www.openstreetmap.org/?mlat=17.4375&mlon=78.4483#map=18/17.4375/78.4483",
    )
  })
})
