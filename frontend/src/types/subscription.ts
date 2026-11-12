/**
 * Subscription types (#97): mirror `docs/05-api/api-contracts.md` → Subscriptions.
 * Field names stay in snake_case exactly as the API sends them.
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */
import type { Customer, IsoDateTime } from "./order.ts"
import type { Money } from "./product.ts"

/** 7, 15 or 30 days. The day count comes from the API (`days`) or lib/subscription.ts. */
export const SUBSCRIPTION_PLANS = ["WEEK", "HALF_MONTH", "MONTH"] as const
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number]

/** #99: deliver every day (1), every 2nd day (2) or every 3rd day (3). */
export type EveryNDays = 1 | 2 | 3

export const SUBSCRIPTION_STATUSES = ["ACTIVE", "CANCELLED", "COMPLETED"] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

/** A calendar day without time: "2026-11-21". */
export type IsoDate = string

export type SubscriptionItem = {
  product_id: number
  product_name: string
  size: string
  quantity: number
  /** Price locked when the user subscribed; every day's order uses it. */
  unit_price: Money
  subtotal: Money
}

/** POST /subscriptions (201), GET /subscriptions/mine, GET /subscriptions/{id}, cancel. */
export type Subscription = {
  subscription_id: number
  plan: SubscriptionPlan
  days: number
  /** #99: 1 = every day, 2 = every 2nd day, 3 = every 3rd day. */
  every_n_days: EveryNDays
  /** #99: number of deliveries in the plan (7 days every 2 days → 4). */
  deliveries: number
  start_date: IsoDate
  /** Last delivery day, included. */
  end_date: IsoDate
  status: SubscriptionStatus
  customer: Customer
  items: SubscriptionItem[]
  /** One delivery's total. */
  daily_total: Money
  /** daily_total × deliveries. */
  plan_total: Money
  /** How many delivery orders have been created so far. */
  orders_created: number
  created_at: IsoDateTime
  cancelled_at: IsoDateTime | null
}

/** POST /subscriptions body. No prices or totals: the backend calculates them. */
export type CreateSubscriptionRequest = {
  plan: SubscriptionPlan
  start_date: IsoDate
  every_n_days: EveryNDays
  customer: { name: string; phone: string }
  items: { product_id: number; quantity: number }[]
}

/** One row of GET /admin/subscriptions. */
export type AdminSubscriptionSummary = {
  subscription_id: number
  username: string
  customer_name: string
  customer_phone: string
  plan: SubscriptionPlan
  every_n_days: EveryNDays
  start_date: IsoDate
  end_date: IsoDate
  status: SubscriptionStatus
  daily_total: Money
  orders_created: number
}

