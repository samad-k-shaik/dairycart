/**
 * Vitest setup (#49): runs before every test file.
 *
 * - Adds the jest-dom matchers, e.g. expect(button).toBeDisabled(), toBeInTheDocument().
 * - Removes what a component test rendered after each test, so tests never see each
 *   other's leftovers.
 */
import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

afterEach(() => {
  cleanup()
})
