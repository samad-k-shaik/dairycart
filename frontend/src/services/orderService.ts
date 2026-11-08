/**
 * Order service – the ONLY place the app creates, reads or updates orders.
 *
 * In M2 every function is backed by the mock database, but it follows the API
 * contract exactly: same inputs, same outputs, same error codes. The mock
 * deliberately copies the BACKEND's business rules (price lookup, totals,
 * status transitions) so the UI can be tested against realistic behaviour.
 *
 * FUTURE (M3, #310/#311): replace each body with an `apiClient` HTTP call.
 */
import { MAX_QUANTITY, MIN_QUANTITY } from '@/lib/constants'
import { multiplyMoney, sumMoney } from '@/lib/money'
import { canTransition, STATUS_LABELS } from '@/lib/orderStatus'
import { validateName, validatePhone } from '@/lib/validation'
import { ApiRequestError } from '@/services/apiError'
import { mockDb, mockProducts } from '@/services/mock/mockDb'
import { simulateRequest } from '@/services/mock/mockServer'
import type { ApiErrorDetail } from '@/types/api'
import type {
  AdminOrderPage,
  AdminOrderQuery,
  CreateOrderRequest,
  Order,
  OrderItem,
  OrderStatus,
  OrderSummary,
} from '@/types/order'

/** Dates in the API look like "2026-11-07T04:30:00Z" (no milliseconds). */
function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function notFound(message: string): ApiRequestError {
  return new ApiRequestError(404, { code: 'NOT_FOUND', message })
}

/** Same checks as the backend's Pydantic schema → 422 VALIDATION_ERROR. */
function validateCreateOrder(request: CreateOrderRequest): void {
  const details: ApiErrorDetail[] = []
  const nameError = validateName(request.customer.name)
  if (nameError) details.push({ field: 'customer.name', issue: nameError })
  const phoneError = validatePhone(request.customer.phone)
  if (phoneError) details.push({ field: 'customer.phone', issue: phoneError })
  if (request.items.length < 1 || request.items.length > 10) {
    details.push({ field: 'items', issue: 'must contain 1–10 items' })
  }
  request.items.forEach((item, index) => {
    if (!Number.isInteger(item.quantity) || item.quantity < MIN_QUANTITY || item.quantity > MAX_QUANTITY) {
      details.push({ field: `items[${index}].quantity`, issue: `must be between ${MIN_QUANTITY} and ${MAX_QUANTITY}` })
    }
  })
  if (details.length > 0) {
    throw new ApiRequestError(422, { code: 'VALIDATION_ERROR', message: 'Request validation failed.', details })
  }
}

/**
 * POST /api/v1/orders – place an order (FR-C5).
 *
 * The request contains ONLY product ids and quantities. Prices are looked up
 * here from the "database" (BR-1) and totals are calculated here (BR-2), just
 * like the real backend. Any price the client might send is ignored.
 * If any item is invalid the WHOLE order is rejected and nothing is saved (BR-3).
 */
export function createOrder(request: CreateOrderRequest): Promise<Order> {
  return simulateRequest(() => {
    validateCreateOrder(request)

    // BR-4: the same product must not appear twice (the cart merges lines, so this is rare).
    const ids = request.items.map((item) => item.product_id)
    if (new Set(ids).size !== ids.length) {
      throw new ApiRequestError(400, { code: 'DUPLICATE_PRODUCT', message: 'The same product appears more than once.' })
    }

    let nextItemId = mockDb.nextOrderItemId()
    const items: OrderItem[] = request.items.map((line) => {
      const product = mockProducts.find((p) => p.product_id === line.product_id)
      if (!product) throw notFound(`Product ${line.product_id} was not found.`)
      if (!product.is_available) {
        throw new ApiRequestError(409, {
          code: 'PRODUCT_UNAVAILABLE',
          message: `Product '${product.name} ${product.size}' is currently unavailable.`,
        })
      }
      return {
        order_item_id: nextItemId++,
        product_id: product.product_id,
        product_name: product.name,
        size: product.size,
        quantity: line.quantity,
        unit_price: product.price, // price from the DATABASE, not from the client
        subtotal: multiplyMoney(product.price, line.quantity),
      }
    })

    const order: Order = {
      order_id: mockDb.nextOrderId(),
      customer: mockDb.findOrCreateCustomer(request.customer.name.trim(), request.customer.phone.trim()),
      order_date: nowIso(),
      status: 'PLACED', // every new order starts as PLACED
      items,
      total_amount: sumMoney(items.map((item) => item.subtotal)),
    }
    mockDb.addOrder(order)
    return order
  })
}

/** GET /api/v1/orders/{id} – full order details (confirmation, history details, admin sheet). */
export function getOrder(orderId: number): Promise<Order> {
  return simulateRequest(() => {
    const order = mockDb.findOrder(orderId)
    if (!order) throw notFound(`Order ${orderId} was not found.`)
    return order
  })
}

/** Sorts newest first by order_date (ISO strings sort correctly as text). */
function newestFirst<T extends { order_date: string }>(a: T, b: T): number {
  return b.order_date.localeCompare(a.order_date)
}

/**
 * GET /api/v1/orders?phone= – customer order history (FR-C7, ADR-005).
 * Unknown phone → empty list (not an error), exactly as the contract says.
 */
export function getOrdersByPhone(phone: string): Promise<OrderSummary[]> {
  return simulateRequest(() => {
    const phoneError = validatePhone(phone)
    if (phoneError) {
      throw new ApiRequestError(422, {
        code: 'VALIDATION_ERROR',
        message: phoneError,
        details: [{ field: 'phone', issue: phoneError }],
      })
    }
    return mockDb
      .getOrders()
      .filter((order) => order.customer.phone === phone)
      .sort(newestFirst)
      .map((order) => ({
        order_id: order.order_id,
        order_date: order.order_date,
        status: order.status,
        total_amount: order.total_amount,
        item_count: order.items.length,
      }))
  })
}

/**
 * GET /api/v1/admin/orders?status=&page=&page_size= (FR-A1, FR-A2).
 * Returns one page of orders (newest first) plus `status_counts` over ALL orders.
 */
export function getAdminOrders(query: AdminOrderQuery = {}): Promise<AdminOrderPage> {
  return simulateRequest(() => {
    const page = Math.max(1, query.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, query.page_size ?? 20))
    const all = [...mockDb.getOrders()].sort(newestFirst)

    const status_counts: Record<OrderStatus, number> = {
      PLACED: 0,
      CONFIRMED: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    }
    for (const order of all) status_counts[order.status] += 1

    const filtered = query.status ? all.filter((order) => order.status === query.status) : all
    const start = (page - 1) * pageSize // page 2 with size 20 starts at index 20

    return {
      items: filtered.slice(start, start + pageSize).map((order) => ({
        order_id: order.order_id,
        customer_name: order.customer.name,
        customer_phone: order.customer.phone,
        order_date: order.order_date,
        status: order.status,
        total_amount: order.total_amount,
        item_count: order.items.length,
      })),
      page,
      page_size: pageSize,
      total: filtered.length,
      status_counts,
    }
  })
}

/**
 * PATCH /api/v1/admin/orders/{id}/status (FR-A4).
 * Rejects illegal changes (e.g. DELIVERED → PLACED) with 409, like the backend will.
 */
export function updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
  return simulateRequest(() => {
    const order = mockDb.findOrder(orderId)
    if (!order) throw notFound(`Order ${orderId} was not found.`)
    if (!canTransition(order.status, status)) {
      throw new ApiRequestError(409, {
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot change status from ${STATUS_LABELS[order.status]} to ${STATUS_LABELS[status]}.`,
      })
    }
    const updated: Order = { ...order, status }
    mockDb.updateOrder(updated)
    return updated
  })
}
