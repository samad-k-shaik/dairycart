/**
 * DEV-ONLY switch for the mock services: make them slow, fail, or return empty lists,
 * so every loading / error / empty state can be seen and tested (M2-13).
 *
 * Stored in localStorage so it survives reloads while testing. In a production build
 * `import.meta.env.DEV` is false, so the mode is always "normal".
 */
export const MOCK_MODES = ["normal", "slow", "error", "empty"] as const
export type MockMode = (typeof MOCK_MODES)[number]

export const MOCK_MODE_LABELS: Record<MockMode, string> = {
  normal: "Normal (300 ms)",
  slow: "Slow (3 s)",
  error: "Fail every call (500)",
  empty: "Empty lists",
}

const STORAGE_KEY = "dairycart-mock-mode-v1"

export function getMockMode(): MockMode {
  if (!import.meta.env.DEV) return "normal"
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return MOCK_MODES.find((m) => m === value) ?? "normal"
  } catch {
    return "normal"
  }
}

export function setMockMode(mode: MockMode) {
  try {
    if (mode === "normal") window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // storage blocked: the switch just does not persist
  }
}
