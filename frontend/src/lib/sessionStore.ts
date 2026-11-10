/**
 * Keeps the login session in localStorage (#89), so a page reload or a new tab stays
 * logged in. Trade-off: any script running on our page could read it (XSS), which is why
 * the app never renders user input as HTML. Logout simply deletes it (the backend keeps
 * no sessions).
 *
 * Other code is told about changes (login, logout, a 401 from the API) through
 * `onSessionChange`; other TABS learn about them through the browser's `storage` event.
 */
import { parseSession, SESSION_STORAGE_KEY, type Session } from "@/lib/authSession"


const listeners = new Set<() => void>()

/** Run `listener` after every login/logout in THIS tab or another tab. Returns "stop". */
export function onSessionChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach((listener) => listener())
}

window.addEventListener("storage", (event) => {
  // key null = localStorage.clear() in another tab
  if (event.key === SESSION_STORAGE_KEY || event.key === null) notify()
})

export function readSession(): Session | null {
  try {
    return parseSession(window.localStorage.getItem(SESSION_STORAGE_KEY))
  } catch {
    return null // storage blocked
  }
}

export function saveSession(session: Session): void {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // storage blocked: the login works until the page is reloaded
  }
  notify()
}

/** Logout, or the API said the token is no longer valid (401). */
export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // ignore
  }
  notify()
}
