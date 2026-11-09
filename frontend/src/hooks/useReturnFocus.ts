/**
 * useReturnFocus: give keyboard focus back to the button that opened a dialog or sheet.
 *
 * Radix does this by itself only when the dialog is opened by its own <Trigger>.
 * Our product dialogs are opened from page state (the clicked row), so we remember
 * which element had focus when the dialog opened and focus it again on close.
 * If that element is gone (e.g. its row was deleted), Radix's default is used.
 *
 *   const returnFocus = useReturnFocus()
 *   <SheetContent {...returnFocus}>…</SheetContent>
 */
import { useRef } from "react"

export function useReturnFocus() {
  const opener = useRef<HTMLElement | null>(null)

  return {
    // Runs just before focus moves into the dialog, so activeElement is still the opener.
    onOpenAutoFocus: () => {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    },
    onCloseAutoFocus: (event: Event) => {
      if (opener.current?.isConnected) {
        event.preventDefault() // replace Radix's default
        opener.current.focus()
      }
      opener.current = null
    },
  }
}
