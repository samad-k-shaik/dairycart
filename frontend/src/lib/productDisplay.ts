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

/** "dairy" (paneer, ghee) has no chip of its own: those products show under "All" only (#94). */
type DisplayCategory = Exclude<CategoryId, "all"> | "dairy"

type DisplayInfo = { category: DisplayCategory; image: string; description: string }

const PANEER: DisplayInfo = {
  category: "dairy",
  image: "/images/products/paneer.svg",
  description: "Soft, fresh paneer made from whole milk. Ready for curries, tikka and snacks.",
}

/** Keys are lower case: the lookup ignores upper/lower case and extra spaces. */
const DISPLAY_BY_NAME: Record<string, DisplayInfo> = {
  "cow milk": {
    category: "cow",
    image: "/images/products/cow-milk.svg",
    description:
      "Fresh cow milk with a light, mild taste. Good for tea, coffee and everyday drinking.",
  },
  "buffalo milk": {
    category: "buffalo",
    image: "/images/products/buffalo-milk.svg",
    description:
      "Rich, creamy buffalo milk with a higher fat content. Ideal for curd, paneer and sweets.",
  },
  paneer: PANEER,
  // The shop's product was added as "Panner", so that spelling gets the same picture.
  panner: PANEER,
  ghee: {
    category: "dairy",
    image: "/images/products/ghee.svg",
    description: "Golden, aromatic ghee slowly cooked from butter. For cooking, rotis and sweets.",
  },
}

const FALLBACK: DisplayInfo = {
  category: "cow",
  image: "/images/products/cow-milk.svg",
  description: "Fresh milk delivered to your door.",
}

function displayInfo(product: Pick<Product, "name">): DisplayInfo {
  return DISPLAY_BY_NAME[product.name.trim().toLowerCase()] ?? FALLBACK
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
