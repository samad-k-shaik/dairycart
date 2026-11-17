import assert from "node:assert/strict"
import { describe, it } from "vitest"

import {
  changeLabel,
  chartMoney,
  compactRupees,
  formatLitres,
  matchPreset,
  monthLabel,
  presetPeriod,
  shortDay,
} from "./income.ts"

describe("income periods (#105)", () => {
  const today = "2026-11-13" // a Friday

  it("works out the presets, ending today", () => {
    assert.deepEqual(presetPeriod("today", today), { from: today, to: today })
    assert.deepEqual(presetPeriod("week", today), { from: "2026-11-09", to: today }) // Monday
    assert.deepEqual(presetPeriod("month", today), { from: "2026-11-01", to: today })
    assert.deepEqual(presetPeriod("year", today), { from: "2026-01-01", to: today })
    assert.deepEqual(presetPeriod("week", "2026-11-09"), { from: "2026-11-09", to: "2026-11-09" })
    assert.deepEqual(presetPeriod("week", "2026-11-15"), { from: "2026-11-09", to: "2026-11-15" }) // Sunday
  })

  it("recognises a preset or a custom range", () => {
    assert.equal(matchPreset({ from: "2026-11-01", to: today }, today), "month")
    assert.equal(matchPreset({ from: "2026-10-01", to: "2026-10-31" }, today), null)
  })
})

describe("income labels (#105)", () => {
  it("writes changes with a sign", () => {
    assert.equal(changeLabel(8.5), "+8.5%")
    assert.equal(changeLabel(-3), "−3.0%")
    assert.equal(changeLabel(0), "0.0%")
    assert.equal(changeLabel(null), null)
  })

  it("turns chart numbers into money strings for the tooltip", () => {
    assert.equal(chartMoney(850), "850.00")
    assert.equal(chartMoney(202.3333), "202.33")
    assert.equal(chartMoney("120"), "120.00")
    assert.equal(chartMoney(undefined), "0.00")
  })

  it("formats litres, months, days and axis money", () => {
    assert.equal(formatLitres(3580), "3,580 L")
    assert.equal(formatLitres(22.5), "22.5 L")
    assert.equal(monthLabel("2026-11"), "Nov")
    assert.equal(monthLabel("2026-11", true), "Nov 2026")
    assert.equal(shortDay("2026-11-03"), "3 Nov")
    assert.equal(compactRupees(900), "₹900")
    assert.equal(compactRupees(15820), "₹16K")
    assert.equal(compactRupees(1400), "₹1.4K")
    assert.equal(compactRupees(1050), "₹1.1K") // not the same label as 1400
    assert.equal(compactRupees(2000), "₹2K")
    assert.equal(compactRupees(250000), "₹2.5L")
  })
})
