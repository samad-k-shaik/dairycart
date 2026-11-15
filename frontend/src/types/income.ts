/**
 * Admin Income tab types (#105): mirror `docs/05-api/api-contracts.md` → Income.
 * `*_change` / `growth`: percent vs the previous period (8.5 = +8.5 %), null = nothing
 * to compare with.
 */
import type { Money } from "./product.ts"

export type OrderKind = "SUBSCRIPTION" | "ONE_TIME"

export type IncomeReport = {
  start: string
  end: string
  previous_start: string
  previous_end: string
  days: number
  summary: {
    litres: number
    litres_change: number | null
    income: Money
    income_change: number | null
    avg_daily_income: Money
    avg_daily_change: number | null
    delivered_orders: number
    delivered_orders_change: number | null
    pending_income: Money
    pending_orders: number
  }
  daily: { date: string; income: Money; orders: number }[]
  monthly: { month: string; income: Money; orders: number }[]
  by_type: { type: OrderKind; income: Money; orders: number; share: number }[]
  by_product: {
    product_id: number
    name: string
    size: string
    quantity: number
    litres: number | null
    income: Money
    share: number
  }[]
  by_area: {
    pincode: string | null
    area_name: string | null
    litres: number
    income: Money
    orders: number
    customers: number
    growth: number | null
  }[]
  subscriptions: { active: number; income: Money; income_change: number | null }
  recent: { order_id: number; date: string; customer_name: string; type: OrderKind; amount: Money }[]
  insights: string[]
}
