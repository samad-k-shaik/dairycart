/**
 * #50: QuantitySelector bounds, tested the way a user uses it: by pressing the − and +
 * buttons (found by their accessible names, like a screen reader would).
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { QuantitySelector } from "./QuantitySelector"

function setup(value: number, limits: { min?: number; max?: number } = {}) {
  const onChange = vi.fn<(value: number) => void>()
  render(<QuantitySelector value={value} onChange={onChange} {...limits} />)
  return {
    onChange,
    minus: screen.getByRole("button", { name: "Decrease quantity" }),
    plus: screen.getByRole("button", { name: "Increase quantity" }),
  }
}

describe("QuantitySelector", () => {
  it("shows the value and changes it by one", async () => {
    const user = userEvent.setup()
    const { onChange, minus, plus } = setup(3)

    expect(screen.getByRole("group", { name: "Quantity" })).toHaveTextContent("3")
    await user.click(plus)
    await user.click(minus)

    expect(onChange.mock.calls).toEqual([[4], [2]])
  })

  it("cannot go below 1: − is disabled at the minimum", async () => {
    const { onChange, minus, plus } = setup(1)
    expect(minus).toBeDisabled()
    expect(plus).toBeEnabled()
    await userEvent.setup().click(minus)
    expect(onChange).not.toHaveBeenCalled()
  })

  it("cannot go above 20: + is disabled at the maximum", () => {
    const { minus, plus } = setup(20)
    expect(plus).toBeDisabled()
    expect(minus).toBeEnabled()
  })

  it("respects custom limits (e.g. the stock left)", async () => {
    const { onChange, plus } = setup(4, { max: 5 })
    await userEvent.setup().click(plus)
    expect(onChange).toHaveBeenCalledWith(5)
  })
})
