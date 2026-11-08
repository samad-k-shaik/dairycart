/**
 * Tests for the MOCK order service. They check that it follows the same
 * business rules as the real backend, so the UI is built against realistic behaviour:
 *  - prices and totals come from the product data, never from the request (BR-1, BR-2)
 *  - unavailable products reject the whole order (BR-3)
 *  - illegal status changes are rejected (FR-A4)
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { CreateOrderRequest } from '@/types/order'
import { isApiRequestError } from './apiError'
import { mockDb } from './mock/mockDb'
import { createOrder, getAdminOrders, getOrdersByPhone, updateOrderStatus } from './orderService'

const customer = { name: 'Test Customer', phone: '9123400000' }

beforeEach(() => {
  mockDb.reset() // every test starts from the original JSON data
})

describe('createOrder', () => {
  it('calculates prices and totals itself and ignores prices sent by the client', async () => {
    // A tampered request that tries to pay 1 rupee. TypeScript would normally stop this,
    // so we cast to simulate someone editing the request in dev tools.
    const request = {
      customer,
      items: [
        { product_id: 2, quantity: 2, price: '1.00' },
        { product_id: 3, quantity: 1 },
      ],
      total_amount: '1.00',
    } as unknown as CreateOrderRequest

    const order = await createOrder(request)
    expect(order.status).toBe('PLACED')
    expect(order.items.map((i) => [i.unit_price, i.subtotal])).toEqual([
      ['60.00', '120.00'],
      ['35.00', '35.00'],
    ])
    expect(order.total_amount).toBe('155.00')
  })

  it('rejects an order containing an unavailable product (409)', async () => {
    const error = await createOrder({ customer, items: [{ product_id: 5, quantity: 1 }] }).catch((e: unknown) => e)
    expect(isApiRequestError(error) && error.code).toBe('PRODUCT_UNAVAILABLE')
  })

  it('rejects an invalid phone number (422)', async () => {
    const error = await createOrder({ customer: { name: 'Ravi', phone: '12345' }, items: [{ product_id: 1, quantity: 1 }] }).catch(
      (e: unknown) => e,
    )
    expect(isApiRequestError(error) && error.code).toBe('VALIDATION_ERROR')
  })

  it('makes the new order appear in the customer history, newest first', async () => {
    const order = await createOrder({ customer, items: [{ product_id: 1, quantity: 1 }] })
    const history = await getOrdersByPhone(customer.phone)
    expect(history[0].order_id).toBe(order.order_id)
  })
})

describe('updateOrderStatus', () => {
  it('applies an allowed transition', async () => {
    const order = await updateOrderStatus(101, 'CONFIRMED') // 101 is PLACED in the seed data
    expect(order.status).toBe('CONFIRMED')
  })

  it('rejects an illegal transition (409)', async () => {
    const error = await updateOrderStatus(98, 'PLACED').catch((e: unknown) => e) // 98 is DELIVERED
    expect(isApiRequestError(error) && error.code).toBe('INVALID_STATUS_TRANSITION')
  })
})

describe('getAdminOrders', () => {
  it('filters by status and still counts every status', async () => {
    const page = await getAdminOrders({ status: 'DELIVERED' })
    expect(page.items.every((o) => o.status === 'DELIVERED')).toBe(true)
    expect(page.total).toBe(5)
    expect(page.status_counts).toEqual({ PLACED: 1, CONFIRMED: 1, OUT_FOR_DELIVERY: 1, DELIVERED: 5, CANCELLED: 2 })
  })
})
