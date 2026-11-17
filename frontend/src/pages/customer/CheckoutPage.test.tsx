/**
 * #50: the checkout form, rendered like in the app.
 *
 * Only the EDGES are replaced: the cart, the logged-in user and the two services that
 * would call the backend (addresses, orders). Everything in between is the real code:
 * the page, its validation, useCreateOrder and buildCreateOrderRequest. So the test can
 * check exactly what would be sent to POST /api/v1/orders.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AuthContext, type AuthContextValue } from "@/hooks/auth/authContext"
import { CartContext, type CartContextValue } from "@/hooks/cart/cartContext"
import { getAddresses } from "@/services/addressService"
import { createOrder } from "@/services/orderService"
import type { Address } from "@/types/address"
import type { Order } from "@/types/order"

import CheckoutPage from "./CheckoutPage"

// Replace only the functions that would call the backend; keep the rest of each module.
vi.mock("@/services/orderService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/orderService")>()
  return { ...actual, createOrder: vi.fn<typeof actual.createOrder>() }
})
vi.mock("@/services/addressService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/addressService")>()
  return { ...actual, getAddresses: vi.fn<typeof actual.getAddresses>() }
})

const HOME: Address = {
  address_id: 5,
  label: "Home",
  house: "12-3 Sai Residency",
  street: "MG Road, Ameerpet",
  landmark: null,
  city: "Hyderabad",
  pincode: "500016",
  latitude: null,
  longitude: null,
  is_default: true,
  full_text: "12-3 Sai Residency, MG Road, Ameerpet, Hyderabad - 500016",
  created_at: "2026-11-13T10:00:00Z",
}

function renderCheckout() {
  const clear = vi.fn<CartContextValue["clear"]>()
  const cart: CartContextValue = {
    // The cart keeps a price snapshot for the estimate; it must NOT be sent.
    lines: [{ product_id: 7, name: "Cow Milk", size: "1 Litre", price: "60.00", quantity: 2 }],
    itemCount: 2,
    estimatedTotal: "120.00",
    add: vi.fn<CartContextValue["add"]>(),
    setQuantity: vi.fn<CartContextValue["setQuantity"]>(),
    remove: vi.fn<CartContextValue["remove"]>(),
    restore: vi.fn<CartContextValue["restore"]>(),
    clear,
  }
  const auth: AuthContextValue = {
    user: { user_id: 1, full_name: "Asha Rao", phone: "9876543210", role: "USER", created_at: "2026-11-01T00:00:00Z" },
    isAdmin: false,
    login: vi.fn<AuthContextValue["login"]>(),
    logout: vi.fn<AuthContextValue["logout"]>(),
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <CartContext.Provider value={cart}>
          <MemoryRouter initialEntries={["/checkout"]}>
            <Routes>
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders/:id/confirmation" element={<p>Confirmation page</p>} />
            </Routes>
          </MemoryRouter>
        </CartContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
  return { clear }
}

describe("CheckoutPage", () => {
  beforeEach(() => {
    vi.mocked(getAddresses).mockResolvedValue([HOME])
    vi.mocked(createOrder).mockResolvedValue({ order_id: 41 } as Order)
    vi.spyOn(console, "info").mockImplementation(() => {}) // the page logs the payload in dev
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("shows the validation messages and sends nothing", async () => {
    const user = userEvent.setup()
    renderCheckout()
    await screen.findByText(HOME.full_text) // addresses loaded

    await user.clear(screen.getByLabelText("Full name"))
    const phone = screen.getByLabelText("Mobile number")
    await user.clear(phone)
    await user.type(phone, "12345")
    await user.click(screen.getByRole("button", { name: "Place order" }))

    expect(await screen.findByText("Please enter your name.")).toBeInTheDocument()
    expect(screen.getByText("Enter a 10-digit mobile number starting with 6, 7, 8 or 9.")).toBeInTheDocument()
    expect(screen.getByLabelText("Full name")).toHaveFocus() // the first problem gets focus
    expect(createOrder).not.toHaveBeenCalled()
  })

  it("sends only the customer, the address id and product ids + quantities", async () => {
    const user = userEvent.setup()
    const { clear } = renderCheckout()
    await screen.findByText(HOME.full_text)

    await user.click(screen.getByRole("button", { name: "Place order" }))

    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
    const request = vi.mocked(createOrder).mock.calls[0][0]
    expect(request).toEqual({
      customer: { name: "Asha Rao", phone: "9876543210" },
      address_id: 5,
      items: [{ product_id: 7, quantity: 2 }],
    })
    expect(JSON.stringify(request)).not.toMatch(/price|total/) // the backend prices the order
    expect(await screen.findByText("Confirmation page")).toBeInTheDocument()
    expect(clear).toHaveBeenCalled() // the cart is emptied after a successful order
  })
})
