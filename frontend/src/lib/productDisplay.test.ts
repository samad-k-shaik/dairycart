import assert from "node:assert/strict"
import { describe, it } from "node:test"

import products from "../services/mock/products.json" with { type: "json" }
import {
  CATEGORIES,
  getProductDescription,
  getProductImage,
  matchesCategory,
} from "./productDisplay.ts"

const names = (category: Parameters<typeof matchesCategory>[1]) =>
  products.filter((p) => matchesCategory(p, category)).map((p) => `${p.name} ${p.size}`)

describe("category chips", () => {
  it("offers All, Cow and Buffalo in that order", () => {
    assert.deepEqual(
      CATEGORIES.map((c) => c.label),
      ["All", "Cow", "Buffalo"],
    )
  })

  it("All shows every product", () => {
    assert.equal(names("all").length, products.length)
  })

  it("Cow shows only cow milk", () => {
    assert.deepEqual(names("cow"), ["Cow Milk 500 ml", "Cow Milk 1 Litre"])
  })

  it("Buffalo shows only buffalo milk", () => {
    assert.deepEqual(names("buffalo"), ["Buffalo Milk 500 ml", "Buffalo Milk 1 Litre"])
  })
})

describe("images and descriptions", () => {
  it("gives every mock product its own image and a description", () => {
    for (const product of products) {
      assert.match(getProductImage(product), /^\/images\/products\/.+\.svg$/)
      assert.ok(getProductDescription(product).length > 10)
    }
    assert.notEqual(getProductImage({ name: "Cow Milk" }), getProductImage({ name: "Buffalo Milk" }))
  })

  it("gives paneer (also spelled Panner) and ghee their own pictures (#94)", () => {
    assert.equal(getProductImage({ name: "Paneer" }), "/images/products/paneer.svg")
    assert.equal(getProductImage({ name: "Panner" }), "/images/products/paneer.svg")
    assert.equal(getProductImage({ name: "Ghee" }), "/images/products/ghee.svg")
    assert.match(getProductDescription({ name: "Ghee" }), /ghee/i)
  })

  it("ignores upper/lower case and extra spaces in the name", () => {
    assert.equal(getProductImage({ name: "  ghee " }), "/images/products/ghee.svg")
    assert.equal(getProductImage({ name: "COW MILK" }), getProductImage({ name: "Cow Milk" }))
  })

  it("shows paneer and ghee under All only, not under Cow or Buffalo", () => {
    for (const name of ["Panner", "Ghee"]) {
      assert.equal(matchesCategory({ name }, "all"), true)
      assert.equal(matchesCategory({ name }, "cow"), false)
      assert.equal(matchesCategory({ name }, "buffalo"), false)
    }
  })

  it("falls back safely for an unknown product name", () => {
    assert.ok(getProductImage({ name: "Goat Milk" }))
    assert.ok(getProductDescription({ name: "Goat Milk" }))
  })
})
