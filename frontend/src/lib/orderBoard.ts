/**
 * Orders board helpers (#104). Pure functions, tested in lib/orderBoard.test.ts.
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */
import type { AdminOrderLine } from "../types/order.ts"
import { readDate } from "./deliveries.ts"

/** How many item lines a card shows before "See more". */
export const CARD_LINES = 2

/** 7 → "#007", 1234 → "#1234" (like the order board in the design). */
export function orderNumber(orderId: number): string {
  return `#${String(orderId).padStart(3, "0")}`
}

/** The board's day: a real "YYYY-MM-DD", "all" (every date), or today when missing/invalid. */
export function readBoardDate(value: string | null, today: string): string {
  if (value === "all") return "all"
  return readDate(value) ?? today
}

/** The first lines of a card and how many more there are. */
export function cardLines(items: AdminOrderLine[], max = CARD_LINES) {
  return { shown: items.slice(0, max), more: Math.max(items.length - max, 0) }
}

const cardTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
})

/** "2026-11-14T02:30:00Z" → "14 Nov, 8:00 am" in India time. */
export function formatCardTime(iso: string): string {
  return cardTime.format(new Date(iso)).replace(" at ", ", ")
}
