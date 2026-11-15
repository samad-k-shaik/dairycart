import assert from "node:assert/strict"
import { describe, it } from "vitest"

import type { User } from "../types/auth.ts"
import { parseSession, sessionFromLogin } from "./authSession.ts"
import {
  EMPTY_SIGN_UP,
  pathAfterLogin,
  toRegisterRequest,
  validateFullName,
  validateMobile,
  validatePassword,
  validateSignUp,
} from "./authValidation.ts"
import { normaliseMobile } from "./validation.ts"

const USER: User = {
  user_id: 1,
  full_name: "Ravi Kumar",
  phone: "9876543210",
  role: "USER",
  created_at: "2026-11-10T10:00:00Z",
}
const VALID = {
  full_name: "Ravi Kumar",
  phone: "98765 43210",
  password: "milk1234",
  confirm_password: "milk1234",
}

describe("sign-up validation (#89, #121: same rules as the backend)", () => {
  it("a complete, valid form has no errors", () => {
    assert.deepEqual(validateSignUp(VALID), {})
  })

  it("every field is mandatory", () => {
    assert.deepEqual(Object.keys(validateSignUp(EMPTY_SIGN_UP)).toSorted(), [
      "confirm_password",
      "full_name",
      "password",
      "phone",
    ])
  })

  it("the full name is mandatory, 2–100 characters", () => {
    assert.equal(validateFullName("   "), "Please enter your full name.")
    assert.equal(validateFullName("A"), "Name must be 2–100 characters.")
    assert.ok(validateFullName("x".repeat(101)))
    assert.equal(validateFullName(" Ravi Kumar "), null)
  })

  it("checks the mobile number (10 digits, starts with 6-9)", () => {
    for (const bad of ["", "987654321", "98765432101", "5876543210", "98765abcde", "+44 7911 123456"]) {
      assert.ok(validateMobile(bad), bad)
    }
    for (const good of ["9876543210", "98765 43210", "+91 98765 43210", "+919876543210", "09876543210", "98765-43210"]) {
      assert.equal(validateMobile(good), null, good)
    }
  })

  it("normalises the mobile number like the backend", () => {
    assert.equal(normaliseMobile("+91 98765-43210"), "9876543210")
    assert.equal(normaliseMobile("098765 43210"), "9876543210")
    assert.equal(normaliseMobile("9876543210"), "9876543210")
    assert.equal(normaliseMobile("0987654321"), "0987654321") // 10 digits: left alone (and invalid)
  })

  it("checks the password strength and bcrypt's 72-byte limit", () => {
    assert.equal(validatePassword("short1"), "Password must be at least 8 characters.")
    assert.equal(validatePassword("onlyletters"), "Use at least one letter and one number.")
    assert.equal(validatePassword("12345678"), "Use at least one letter and one number.")
    assert.equal(validatePassword("a1" + "é".repeat(40)), "Password is too long (max 72 bytes).")
    assert.equal(validatePassword("milk1234"), null)
  })

  it("passwords must match", () => {
    assert.equal(validateSignUp({ ...VALID, confirm_password: "milk12345" }).confirm_password, "The passwords do not match.")
  })

  it("sends trimmed values and never the confirm field", () => {
    const body = toRegisterRequest({ ...VALID, full_name: "  Ravi Kumar ", phone: "+91 98765 43210" })
    assert.deepEqual(body, { full_name: "Ravi Kumar", phone: "9876543210", password: "milk1234" })
  })
})

describe("after login", () => {
  it("users go to the User Dashboard, admins to the Admin Dashboard", () => {
    assert.equal(pathAfterLogin("USER", null), "/account")
    assert.equal(pathAfterLogin("ADMIN", null), "/admin")
    assert.equal(pathAfterLogin("DELIVERY_BOY", null), "/delivery") // #109
  })

  it("goes back to the page that asked for the login", () => {
    assert.equal(pathAfterLogin("ADMIN", "/admin/users"), "/admin/users")
  })

  it("never redirects to another website (open redirect)", () => {
    for (const next of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)"]) {
      assert.equal(pathAfterLogin("USER", next), "/account", next)
    }
  })
})

describe("stored session", () => {
  const now = Date.UTC(2026, 10, 10, 12, 0, 0)

  it("a fresh login is kept", () => {
    const session = sessionFromLogin("tok", 3600, USER, now)
    assert.equal(session.expiresAt, now + 3_600_000)
    assert.deepEqual(parseSession(JSON.stringify(session), now), session)
  })

  it("an expired session counts as logged out (logout on expiry)", () => {
    const session = sessionFromLogin("tok", 3600, USER, now)
    assert.equal(parseSession(JSON.stringify(session), now + 3_600_000), null)
    assert.equal(parseSession(JSON.stringify(session), now + 3_600_000 - 10_000), null) // 30 s margin
  })

  it("a session saved before #121 (username, no phone) counts as logged out", () => {
    const old = { token: "t", expiresAt: now + 1e7, user: { user_id: 1, username: "ravi", role: "USER" } }
    assert.equal(parseSession(JSON.stringify(old), now), null)
  })

  it("logout (no stored value) and damaged data count as logged out", () => {
    for (const raw of [null, "", "not json", "{}", JSON.stringify({ token: 1 }), JSON.stringify({ token: "t", expiresAt: now + 1e7, user: { phone: "9876543210", role: "ROOT" } })]) {
      assert.equal(parseSession(raw, now), null, String(raw))
    }
  })
})
