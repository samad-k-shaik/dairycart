import assert from "node:assert/strict"
import { describe, it } from "node:test"

import type { Product } from "../types/product.ts"
import {
  changedFields,
  findDuplicate,
  normalizePrice,
  toFormValues,
  toProductInput,
  validatePrice,
  validateProductForm,
  validateProductName,
  validateProductSize,
} from "./productForm.ts"

const COW_1L: Product = { product_id: 2, name: "Cow Milk", size: "1 Litre", price: "60.00", is_available: true }
const COW_500: Product = { product_id: 1, name: "Cow Milk", size: "500 ml", price: "30.00", is_available: true }

describe("validateProductName (2–100 characters, like the backend)", () => {
  it("accepts normal names and ignores spaces around them", () => {
    assert.equal(validateProductName("Cow Milk"), null)
    assert.equal(validateProductName("  A2  "), null)
    assert.equal(validateProductName("x".repeat(100)), null)
  })

  it("rejects empty, too short and too long names", () => {
    assert.equal(validateProductName("   "), "Please enter a product name.")
    assert.equal(validateProductName("A"), "Name must be 2–100 characters.")
    assert.equal(validateProductName("x".repeat(101)), "Name must be 2–100 characters.")
  })
})

describe("validateProductSize (1–20 characters)", () => {
  it("accepts sizes up to 20 characters", () => {
    assert.equal(validateProductSize("500 ml"), null)
    assert.equal(validateProductSize("x".repeat(20)), null)
  })

  it("rejects empty and too long sizes", () => {
    assert.equal(validateProductSize(""), "Please enter a size, e.g. 500 ml.")
    assert.equal(validateProductSize("x".repeat(21)), "Size must be at most 20 characters.")
  })
})

describe("validatePrice (> 0, at most 2 decimals, fits NUMERIC(10,2))", () => {
  it("accepts whole and decimal prices", () => {
    for (const price of ["45", "45.5", "45.50", "0.01", "99999999.99"]) {
      assert.equal(validatePrice(price), null, price)
    }
  })

  it("rejects zero, negative, too many decimals, too big and text", () => {
    assert.equal(validatePrice(""), "Please enter a price.")
    assert.equal(validatePrice("0"), "Price must be more than ₹0.")
    assert.equal(validatePrice("0.00"), "Price must be more than ₹0.")
    for (const price of ["-5", "12.345", "123456789", "abc", "4,5", "45."]) {
      assert.equal(validatePrice(price), "Enter a price like 45 or 45.50 (up to 2 decimals).", price)
    }
  })
})

describe("normalizePrice (the contract's money format)", () => {
  it("always gives 2 decimals, without floating-point maths", () => {
    assert.equal(normalizePrice("45"), "45.00")
    assert.equal(normalizePrice("45.5"), "45.50")
    assert.equal(normalizePrice(" 045.50 "), "45.50")
    assert.equal(normalizePrice("0.1"), "0.10")
    assert.equal(normalizePrice("99999999.99"), "99999999.99")
  })
})

describe("validateProductForm", () => {
  it("returns one message per invalid field", () => {
    const errors = validateProductForm({ name: "A", size: "", price: "0", is_available: true })
    assert.deepEqual(Object.keys(errors).sort(), ["name", "price", "size"])
  })

  it("returns no errors for a valid form", () => {
    assert.deepEqual(validateProductForm(toFormValues(COW_1L)), {})
  })
})

describe("toProductInput and changedFields (what is sent to the API)", () => {
  it("trims text and formats the price", () => {
    assert.deepEqual(toProductInput({ name: " Toned Milk ", size: "500 ml ", price: "28.5", is_available: false }), {
      name: "Toned Milk",
      size: "500 ml",
      price: "28.50",
      is_available: false,
    })
  })

  it("PATCH sends only the fields that changed", () => {
    const values = { ...toFormValues(COW_1L), price: "65", is_available: false }
    assert.deepEqual(changedFields(COW_1L, values), { price: "65.00", is_available: false })
  })

  it("an untouched form has nothing to save (60 and 60.00 are the same price)", () => {
    assert.deepEqual(changedFields(COW_1L, toFormValues(COW_1L)), {})
    assert.deepEqual(changedFields(COW_1L, { ...toFormValues(COW_1L), price: "60", name: " Cow Milk " }), {})
  })
})

describe("findDuplicate (same name AND size, any letter case)", () => {
  const products = [COW_500, COW_1L]

  it("finds a product with the same name and size", () => {
    assert.equal(findDuplicate(products, "cow MILK", " 1 litre "), COW_1L)
  })

  it("the same name with another size is not a duplicate", () => {
    assert.equal(findDuplicate(products, "Cow Milk", "2 Litre"), undefined)
  })

  it("ignores the product being edited", () => {
    assert.equal(findDuplicate(products, "Cow Milk", "1 Litre", COW_1L.product_id), undefined)
    assert.equal(findDuplicate(products, "Cow Milk", "1 Litre", COW_500.product_id), COW_1L)
  })
})
