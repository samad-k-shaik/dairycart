/**
 * #50: ProductCard. The card links to the product page; "+" adds it to the cart; an
 * out-of-stock product has no "+" at all.
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"

import type { Product } from "@/types/product"

import { ProductCard } from "./ProductCard"

const MILK: Product = {
  product_id: 7,
  name: "Cow Milk",
  size: "1 Litre",
  price: "60.00",
  is_available: true,
  in_stock: true,
}

function renderCard(product: Product) {
  const onAdd = vi.fn<(product: Product) => void>()
  // ProductCard contains a <Link>, which needs a router around it.
  render(
    <MemoryRouter>
      <ProductCard product={product} onAdd={onAdd} />
    </MemoryRouter>,
  )
  return onAdd
}

describe("ProductCard", () => {
  it("shows the name, size, price and a picture with a text alternative", () => {
    renderCard(MILK)
    expect(screen.getByRole("heading", { name: "Cow Milk 1 Litre" })).toBeInTheDocument()
    expect(screen.getByText("₹60.00")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Cow Milk 1 Litre" })).toBeInTheDocument()
  })

  it("links to the product's own page", () => {
    renderCard(MILK)
    expect(screen.getByRole("link", { name: "Cow Milk 1 Litre" })).toHaveAttribute("href", "/products/7")
  })

  it("adds the product when + is pressed", async () => {
    const onAdd = renderCard(MILK)
    await userEvent.setup().click(screen.getByRole("button", { name: "Add Cow Milk 1 Litre to cart" }))
    expect(onAdd).toHaveBeenCalledWith(MILK)
  })

  it("has no + button when the product is out of stock", () => {
    renderCard({ ...MILK, in_stock: false })
    expect(screen.getByText("Out of stock")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /add/i })).not.toBeInTheDocument()
  })
})
