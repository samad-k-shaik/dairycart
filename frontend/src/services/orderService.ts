/**
 * Order service: the ONLY place pages get or send order data (M3-10, M3-11).
 *
 * Calls the real backend through apiClient. The BACKEND calculates every price and total
 * from the database; we only send product ids and quantities (CreateOrderRequest).
 * With VITE_USE_MOCKS=true the M2 mock in services/mock/ answers instead.
 */
import { api, queryString } from "@/services/apiClient"
import * as mock from "@/services/mock/mockOrderService"
import { USE_MOCKS } from "@/services/mockMode"
import type {
  AdminOrderPage,
  AdminOrderQuery,
  CreateOrderRequest,
  Order,
  OrderStatus,
  OrderSummary,
  UpdateOrderStatusRequest,
} from "@/types/order"

/** POST /api/v1/orders: place an order. Resolves with the created order (201). */
export function createOrder(request: CreateOrderRequest): Promise<Order> {
  if (USE_MOCKS) return mock.createOrder(request)
  return api.post("/orders", request)
}

/** GET /api/v1/orders/{id} */
export function getOrder(orderId: number): Promise<Order> {
  if (USE_MOCKS) return mock.getOrder(orderId)
  return api.get(`/orders/${orderId}`)
}

/** GET /api/v1/orders/mine: the logged-in user's orders, newest first (#90). */
export function getMyOrders(): Promise<OrderSummary[]> {
  if (USE_MOCKS) return mock.getMyOrders()
  return api.get("/orders/mine")
}

/** GET /api/v1/admin/orders: filter by status, paginate, plus dashboard counts. */
export function getAdminOrders(query: AdminOrderQuery = {}): Promise<AdminOrderPage> {
  if (USE_MOCKS) return mock.getAdminOrders(query)
  return api.get(`/admin/orders${queryString(query)}`)
}

/** PATCH /api/v1/admin/orders/{id}/status: only along allowed transitions (409 otherwise). */
export function updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
  if (USE_MOCKS) return mock.updateOrderStatus(orderId, status)
  const body: UpdateOrderStatusRequest = { status }
  return api.patch(`/admin/orders/${orderId}/status`, body)
}
