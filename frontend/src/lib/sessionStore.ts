/**
 * Keeps the login session in sessionStorage (#91): ONE session PER BROWSER TAB.
 *
 * Why sessionStorage and not localStorage (#89 used localStorage)?
 *   localStorage is shared by every tab of the site, so logging in as an admin in a second
 *   tab replaced the user's login in the first tab. sessionStorage belongs to one tab:
 *   tab 1 can be a USER and tab 2 an ADMIN at the same time.
 * Trade-offs:
 *   - a reload keeps the tab's login; a NEW tab opened by typing the address starts logged
 *     out (the browser copies sessionStorage only into tabs opened from this one);
 *   - logging out in one tab does not log out the others.
 * Like any browser storage, a script running on our page could read it (XSS), which is why
 * the app never renders user input as HTML. Logout simply deletes it (the backend keeps no
 * sessions).
 *
 * Other code in this tab is told about changes (login, logout, a 401 from the API) through
 * `onSessionChange`.
 */
import { parseSession, SESSION_STORAGE_KEY, type Session } from "@/lib/authSession"

const listeners = new Set<() => void>()

/** Run `listener` after every login/logout in this tab. Returns "stop". */
export function onSessionChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach((listener) => listener())
}

// Clean-up: before #91 the session was kept in localStorage. Remove such an old, shared copy
// so a token is not left behind in the browser.
try {
  window.localStorage.removeItem(SESSION_STORAGE_KEY)
} catch {
  // storage blocked: nothing to clean
}

export function readSession(): Session | null {
  try {
    return parseSession(window.sessionStorage.getItem(SESSION_STORAGE_KEY))
  } catch {
    return null // storage blocked
  }
}

export function saveSession(session: Session): void {
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // storage blocked: the login works until the page is reloaded
  }
  notify()
}

/** Logout, or the API said the token is no longer valid (401). */
export function clearSession(): void {
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // ignore
  }
  notify()
}
