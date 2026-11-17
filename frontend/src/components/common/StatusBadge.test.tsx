/**
 * #49: the first React Testing Library test. It renders the component and checks what a
 * USER sees (the label), not how it is built.
 */
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StatusBadge } from "./StatusBadge"

describe("StatusBadge", () => {
  it("shows the readable label of the status", () => {
    render(<StatusBadge status="OUT_FOR_DELIVERY" />)
    expect(screen.getByText("Out for delivery")).toBeInTheDocument()
  })

  it("uses the status colour from the design system", () => {
    render(<StatusBadge status="DELIVERED" />)
    expect(screen.getByText("Delivered")).toHaveClass("text-green-700")
  })
})
