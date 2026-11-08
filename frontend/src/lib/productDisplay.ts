/**
 * Display-only product information that the API contract does not provide:
 * category (for the home page chips), image and description.
 *
 * The API Product has no `image` or `description` field, so the frontend maps them
 * from the product name. If the backend later adds these fields, replace the lookups here.
 * (Relative ".ts" imports so Node's test runner can load this file.)
 */
import type { Product } from "../types/product.ts"

export type CategoryId = "all" | "cow" | "buffalo"

/** Chips on the home page, in display order. */
export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cow", label: "Cow" },
  { id: "buffalo", label: "Buffalo" },
]

type DisplayInfo = { category: Exclude<CategoryId, "all">; image: string; description: string }

const DISPLAY_BY_NAME: Record<string, DisplayInfo> = {
  "Cow Milk": {
    category: "cow",
    image: "/images/products/cow-milk.svg",
    description:
      "Fresh cow milk with a light, mild taste. Good for tea, coffee and everyday drinking.",
  },
  "Buffalo Milk": {
    category: "buffalo",
    image: "/images/products/buffalo-milk.svg",
    description:
      "Rich, creamy buffalo milk with a higher fat content. Ideal for curd, paneer and sweets.",
  },
}

const FALLBACK: DisplayInfo = {
  category: "cow",
  image: "/images/products/cow-milk.svg",
  description: "Fresh milk delivered to your door.",
}

function displayInfo(product: Pick<Product, "name">): DisplayInfo {
  return DISPLAY_BY_NAME[product.name] ?? FALLBACK
}

export function getProductImage(product: Pick<Product, "name">): string {
  return displayInfo(product).image
}

export function getProductDescription(product: Pick<Product, "name">): string {
  return displayInfo(product).description
}

/** True if the product belongs to the chip's category ("all" matches everything). */
export function matchesCategory(product: Pick<Product, "name">, category: CategoryId): boolean {
  return category === "all" || displayInfo(product).category === category
}
