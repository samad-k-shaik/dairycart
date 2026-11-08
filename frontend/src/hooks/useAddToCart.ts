/**
 * useAddToCart(): adds a product to the cart and shows a toast with the result.
 * Shared by the home page "+" button and the product details "Add to cart" button.
 */
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { useCart } from "@/hooks/useCart"
import { MAX_QUANTITY } from "@/lib/quantity"
import type { Product } from "@/types/product"

export function useAddToCart() {
  const { add } = useCart()
  const navigate = useNavigate()

  return (product: Pick<Product, "product_id" | "name" | "size" | "price">, quantity = 1) => {
    const label = `${product.name} ${product.size}`
    const result = add(product, quantity)
    const viewCart = { label: "View cart", onClick: () => navigate("/cart") }

    if (result.added === 0) {
      toast.warning(`You already have the maximum of ${MAX_QUANTITY}`, {
        description: label,
        action: viewCart,
      })
    } else if (result.added < quantity) {
      toast.warning(`Added ${result.added}: maximum is ${MAX_QUANTITY} per product`, {
        description: `${result.quantity} × ${label} in your cart`,
        action: viewCart,
      })
    } else {
      toast.success("Added to cart", {
        description: `${quantity} × ${label} (${result.quantity} in cart)`,
        action: viewCart,
      })
    }
  }
}
