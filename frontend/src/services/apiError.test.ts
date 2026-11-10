import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { errorFromResponse, NETWORK_ERROR_MESSAGE, networkError } from "./apiError.ts"
import { ServiceError } from "./serviceError.ts"

describe("errorFromResponse (M3-08: backend errors → ServiceError)", () => {
  it("keeps the backend's code, message, details and request id", () => {
    const body = {
      error: {
        code: "PRODUCT_UNAVAILABLE",
        message: "Product 'Buffalo Milk 1 Litre' is currently unavailable.",
        details: [{ field: "items[1].product_id", issue: "unavailable" }],
        request_id: "abc-123",
      },
    }

    const error = errorFromResponse(409, body, "header-id")

    assert.ok(error instanceof ServiceError)
    assert.equal(error.status, 409)
    assert.equal(error.code, "PRODUCT_UNAVAILABLE")
    assert.equal(error.message, "Product 'Buffalo Milk 1 Litre' is currently unavailable.")
    assert.deepEqual(error.body.error.details, [{ field: "items[1].product_id", issue: "unavailable" }])
    assert.equal(error.body.error.request_id, "abc-123")
  })

  it("422 details stay field by field, so forms can show them next to the inputs", () => {
    const body = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: [
          { field: "customer.phone", issue: "String should match pattern '^[6-9]\\d{9}$'" },
          { field: "items[0].quantity", issue: "Input should be less than or equal to 20" },
        ],
        request_id: "r1",
      },
    }

    const fields = errorFromResponse(422, body, null).body.error.details?.map((d) => d.field)

    assert.deepEqual(fields, ["customer.phone", "items[0].quantity"])
  })

  it("fills in missing details and takes the request id from the header", () => {
    const error = errorFromResponse(404, { error: { code: "NOT_FOUND", message: "Order 9 was not found." } }, "hdr-9")

    assert.deepEqual(error.body.error.details, [])
    assert.equal(error.body.error.request_id, "hdr-9")
  })

  it("a body that is not the contract's format becomes a safe generic error", () => {
    for (const body of [null, "<html>Bad gateway</html>", { detail: "Not Found" }]) {
      const error = errorFromResponse(502, body, null)
      assert.equal(error.status, 502)
      assert.equal(error.code, "INTERNAL_ERROR")
      assert.equal(error.message, "Something went wrong on our side. Please try again.")
    }
  })
})

describe("networkError (server down, offline or CORS refused)", () => {
  it("has status 0, its own code and a helpful message", () => {
    const error = networkError()
    assert.equal(error.status, 0)
    assert.equal(error.code, "NETWORK_ERROR")
    assert.equal(error.message, NETWORK_ERROR_MESSAGE)
  })
})
