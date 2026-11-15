/**
 * Top-level error boundary: catches crashes anywhere outside the router's own
 * error handling (e.g. in providers) and shows AppErrorFallback instead of a blank page.
 *
 * Error boundaries must be class components: React has no hook for catching render errors.
 * They catch errors while RENDERING. Errors from data fetching are handled separately by
 * TanStack Query (isError → ErrorState with Retry).
 */
import { Component, type ErrorInfo, type ReactNode } from "react"

import { AppErrorFallback } from "@/components/common/AppErrorFallback"

type Props = { children: ReactNode }
type State = { error: unknown; hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, hasError: false }

  static getDerivedStateFromError(error: unknown): State {
    return { error, hasError: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // M6 sends this to Cloud Logging; for now the browser console is enough.
    console.error("Unhandled UI error", error, info.componentStack)
  }

  render() {
    return this.state.hasError ? <AppErrorFallback error={this.state.error} /> : this.props.children
  }
}
