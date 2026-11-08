/**
 * Mock "network" layer used in M2 instead of real HTTP calls.
 *
 * It makes mock data BEHAVE like a real server:
 *  - responses arrive after a delay (300 ms), so loading states are visible;
 *  - in development you can switch to "slow" or "error" mode to test
 *    skeletons and error screens (#32) – see DevMockSwitch in the bottom-right corner;
 *  - results are deep-copied, so a page cannot accidentally change the "database".
 *
 * FUTURE (M3): this whole folder is replaced by real `fetch` calls in
 * src/services/apiClient.ts. Pages and hooks do not change.
 */
import { STORAGE_KEYS } from '@/lib/constants'
import { ApiRequestError } from '@/services/apiError'

export type MockMode = 'normal' | 'slow' | 'error'

const NORMAL_DELAY_MS = 300 // issue #22: "Promises with a 300 ms delay"
const SLOW_DELAY_MS = 2500

/** Reads the dev switch. Always 'normal' in a production build. */
export function getMockMode(): MockMode {
  // import.meta.env.DEV is true for `npm run dev`, false for `npm run build`.
  if (!import.meta.env.DEV) return 'normal'
  try {
    const value = localStorage.getItem(STORAGE_KEYS.mockMode)
    return value === 'slow' || value === 'error' ? value : 'normal'
  } catch {
    // localStorage can throw (private mode, blocked storage). Never crash because of it.
    return 'normal'
  }
}

export function setMockMode(mode: MockMode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.mockMode, mode)
  } catch {
    // Ignore: the switch is a developer convenience only.
  }
}

/** A Promise that resolves after `ms` milliseconds. */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Runs `handler` like a server request: wait, maybe fail, then return a copy of the result.
 * `handler` may throw an ApiRequestError (e.g. 404) exactly like the real API would.
 */
export async function simulateRequest<T>(handler: () => T): Promise<T> {
  const mode = getMockMode()
  await wait(mode === 'slow' ? SLOW_DELAY_MS : NORMAL_DELAY_MS)

  if (mode === 'error') {
    throw new ApiRequestError(500, {
      code: 'INTERNAL_ERROR',
      message: 'The server is having trouble right now. Please try again.',
      request_id: 'mock-request',
    })
  }

  // structuredClone = deep copy. Like JSON over a network, the caller gets its own copy.
  return structuredClone(handler())
}
