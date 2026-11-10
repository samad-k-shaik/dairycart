import assert from "node:assert/strict"
import { describe, it } from "node:test"

import type { User } from "../types/auth.ts"
import { parseSession, sessionFromLogin } from "./authSession.ts"
import {
  EMPTY_SIGN_UP,
  pathAfterLogin,
  toRegisterRequest,
  validateEmail,
  validatePassword,
  validateSignUp,
  validateUsername,
} from "./authValidation.ts"

const USER: User = {
  user_id: 1,
  full_name: "Ravi Kumar",
  email: "ravi@example.com",
  username: "ravi",
  role: "USER",
  created_at: "2026-11-10T10:00:00Z",
}
const VALID = {
  full_name: "Ravi Kumar",
  email: "ravi@example.com",
  username: "Ravi_K",
  password: "milk1234",
  confirm_password: "milk1234",
}

describe("sign-up validation (#89, same rules as the backend)", () => {
  it("a complete, valid form has no errors", () => {
    assert.deepEqual(validateSignUp(VALID), {})
  })

  it("every field is mandatory", () => {
    assert.deepEqual(Object.keys(validateSignUp(EMPTY_SIGN_UP)).sort(), [
      "confirm_password",
      "email",
      "full_name",
      "password",
      "username",
    ])
  })

  it("checks the email format", () => {
    for (const bad of ["ravi", "ravi@", "ravi@example", "ra vi@example.com"]) assert.ok(validateEmail(bad), bad)
    assert.equal(validateEmail(" ravi@example.com "), null)
  })

  it("checks the username", () => {
    for (const bad of ["ab", "has space", "x".repeat(31), "ravi!"]) assert.ok(validateUsername(bad), bad)
    assert.equal(validateUsername("Ravi_K.1-x"), null)
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
    const body = toRegisterRequest({ ...VALID, full_name: "  Ravi Kumar ", email: " ravi@example.com " })
    assert.deepEqual(body, { full_name: "Ravi Kumar", email: "ravi@example.com", username: "Ravi_K", password: "milk1234" })
  })
})

describe("after login", () => {
  it("users go to the User Dashboard, admins to the Admin Dashboard", () => {
    assert.equal(pathAfterLogin("USER", null), "/account")
    assert.equal(pathAfterLogin("ADMIN", null), "/admin")
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

  it("logout (no stored value) and damaged data count as logged out", () => {
    for (const raw of [null, "", "not json", "{}", JSON.stringify({ token: 1 }), JSON.stringify({ token: "t", expiresAt: now + 1e7, user: { username: "x", role: "ROOT" } })]) {
      assert.equal(parseSession(raw, now), null, String(raw))
    }
  })
})
