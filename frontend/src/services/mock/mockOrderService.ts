/**
 * MOCK order service (M2). Used only when VITE_USE_MOCKS=true; the real one is
 * services/orderService.ts. It follows the API contract, including its validation
 * and errors, so screens can be worked on without a backend.
 *
 * The price/total maths in createOrder only imitates the backend. In the real
 * system the BACKEND calculates totals from database prices; the frontend never
 * sends prices (see CreateOrderRequest).
 */
import type { ApiErrorDetail } from "@/types/api"
import type {
  AdminOrderPage,
  AdminOrderQuery,
  AdminOrderSummary,
  CreateOrderRequest,
  Order,
  OrderItem,
  OrderStatus,
  OrderSummary,
} from "@/types/order"
import { ORDER_STATUSES } from "@/types/order"
import { canTransition } from "@/lib/orderStatus"
import {
  db,
  fail,
  fromPaise,
  ids,
  readDb,
  respond,
  saveDb,
  toPaise,
} from "@/services/mock/mockServer"

/** 10-digit Indian mobile number (contract: `^[6-9]\d{9}$`). */
const PHONE_PATTERN = /^[6-9]\d{9}$/

/**
 * Newest first, by order date; orders placed in the same second fall back to the
 * higher order id first, so the order is stable (backend: ORDER BY order_date DESC, order_id DESC).
 */
const newestFirst = (a: Order, b: Order) =>
  b.order_date.localeCompare(a.order_date) || b.order_id - a.order_id

/** POST /api/v1/orders — place an order. Resolves with the created order (201). */
export function createOrder(request: CreateOrderRequest): Promise<Order> {
  // 1. Validation (422), same rules as the contract's validation table.
  const details: ApiErrorDetail[] = []
  const name = request.customer.name.trim()
  if (name.length < 2 || name.length > 100) {
    details.push({ field: "customer.name", issue: "must be 2–100 characters" })
  }
  if (!PHONE_PATTERN.test(request.customer.phone)) {
    details.push({ field: "customer.phone", issue: "must be a 10-digit Indian mobile number" })
  }
  if (request.items.length < 1 || request.items.length > 10) {
    details.push({ field: "items", issue: "must contain 1–10 items" })
  }
  request.items.forEach((item, index) => {
    if (!Number.isInteger(item.product_id) || item.product_id < 1) {
      details.push({ field: `items[${index}].product_id`, issue: "must be a positive integer" })
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      details.push({ field: `items[${index}].quantity`, issue: "must be between 1 and 20" })
    }
  })
  if (details.length > 0) {
    return fail(422, "VALIDATION_ERROR", "Request validation failed.", details)
  }

  // 2. Same product twice (400, BR-4).
  const productIds = request.items.map((item) => item.product_id)
  const duplicateIndex = productIds.findIndex((id, index) => productIds.indexOf(id) !== index)
  if (duplicateIndex !== -1) {
    return fail(400, "DUPLICATE_PRODUCT", "The same product appears more than once.", [
      { field: `items[${duplicateIndex}].product_id`, issue: "duplicate" },
    ])
  }

  // 3. Look up each product's CURRENT price; reject the whole order if any fails (BR-3).
  const items: OrderItem[] = []
  for (const [index, requested] of request.items.entries()) {
    const product = db.products.find((p) => p.product_id === requested.product_id)
    if (!product) {
      return fail(404, "NOT_FOUND", `Product ${requested.product_id} was not found.`, [
        { field: `items[${index}].product_id`, issue: "not found" },
      ])
    }
    if (!product.is_available) {
      return fail(
        409,
        "PRODUCT_UNAVAILABLE",
        `Product '${product.name} ${product.size}' is currently unavailable.`,
        [{ field: `items[${index}].product_id`, issue: "unavailable" }],
      )
    }
    items.push({
      order_item_id: ids.orderItem++,
      product_id: product.product_id,
      product_name: product.name,
      size: product.size,
      quantity: requested.quantity,
      unit_price: product.price, // price snapshot (BR-1)
      subtotal: fromPaise(toPaise(product.price) * requested.quantity), // BR-2
    })
  }

  // 4. Find the customer by phone, or create one (BR-5).
  const existing = db.orders.find((o) => o.customer.phone === request.customer.phone)
  const customer = existing
    ? existing.customer
    : { customer_id: ids.customer++, name, phone: request.customer.phone }

  // 5. Save the order with status PLACED and the calculated total.
  const totalPaise = items.reduce((sum, item) => sum + toPaise(item.subtotal), 0)
  const order: Order = {
    order_id: ids.order++,
    customer,
    order_date: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    status: "PLACED",
    items,
    total_amount: fromPaise(totalPaise),
  }
  db.orders.push(order)
  saveDb() // keep it after a reload and share it with other tabs (mock only)
  return respond(order)
}

/** GET /api/v1/orders/{id} */
export function getOrder(orderId: number): Promise<Order> {
  const order = db.orders.find((o) => o.order_id === orderId)
  if (!order) {
    return fail(404, "NOT_FOUND", `Order ${orderId} was not found.`)
  }
  return respond(order)
}

/** GET /api/v1/orders?phone= — customer order history, newest first (proposed, ADR-005). */
export function getOrdersByPhone(phone: string): Promise<OrderSummary[]> {
  if (!PHONE_PATTERN.test(phone)) {
    return fail(422, "VALIDATION_ERROR", "Request validation failed.", [
      { field: "phone", issue: "must be a 10-digit Indian mobile number" },
    ])
  }
  const summaries: OrderSummary[] = readDb().orders
    .filter((o) => o.customer.phone === phone)
    .sort(newestFirst)
    .map((o) => ({
      order_id: o.order_id,
      order_date: o.order_date,
      status: o.status,
      total_amount: o.total_amount,
      item_count: o.items.length,
    }))
  return respond(summaries) // unknown phone → [] (not an error), as in the contract
}

/** GET /api/v1/admin/orders — filter by status, paginate, plus dashboard counts. */
export function getAdminOrders(query: AdminOrderQuery = {}): Promise<AdminOrderPage> {
  const page = query.page ?? 1
  const pageSize = query.page_size ?? 20
  if (!Number.isInteger(page) || page < 1) {
    return fail(422, "VALIDATION_ERROR", "Request validation failed.", [
      { field: "page", issue: "must be an integer ≥ 1" },
    ])
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return fail(422, "VALIDATION_ERROR", "Request validation failed.", [
      { field: "page_size", issue: "must be an integer between 1 and 100" },
    ])
  }

  const allOrders = readDb().orders // empty in the dev "empty" mock mode
  const filtered = allOrders
    .filter((o) => query.status === undefined || o.status === query.status)
    .sort(newestFirst)
  const start = (page - 1) * pageSize
  const items: AdminOrderSummary[] = filtered.slice(start, start + pageSize).map((o) => ({
    order_id: o.order_id,
    customer_name: o.customer.name,
    customer_phone: o.customer.phone,
    order_date: o.order_date,
    status: o.status,
    total_amount: o.total_amount,
    item_count: o.items.length,
  }))

  // Counts across ALL orders, ignoring the status filter (contract).
  const statusCounts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<
    OrderStatus,
    number
  >
  for (const order of allOrders) statusCounts[order.status] += 1

  return respond({
    items,
    page,
    page_size: pageSize,
    total: filtered.length,
    status_counts: statusCounts,
  })
}

/** PATCH /api/v1/admin/orders/{id}/status — only along allowed transitions. */
export function updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
  if (!ORDER_STATUSES.includes(status)) {
    return fail(422, "VALIDATION_ERROR", "Request validation failed.", [
      { field: "status", issue: `must be one of ${ORDER_STATUSES.join(", ")}` },
    ])
  }
  const order = db.orders.find((o) => o.order_id === orderId)
  if (!order) {
    return fail(404, "NOT_FOUND", `Order ${orderId} was not found.`)
  }
  if (!canTransition(order.status, status)) {
    return fail(
      409,
      "INVALID_STATUS_TRANSITION",
      `Cannot change status from ${order.status} to ${status}.`,
    )
  }
  order.status = status
  saveDb()
  return respond(order)
}
