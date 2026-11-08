/**
 * ErrorBoundary – the app's last safety net (#32).
 *
 * TWO kinds of errors exist in a React app:
 *  1. Request errors (server down, 404…) → handled by each page with
 *     TanStack Query's `isError` + <ErrorState />.
 *  2. Unexpected RENDER errors (a bug in a component) → without a boundary,
 *     React unmounts everything and the user sees a blank white page.
 *
 * This component catches type 2 and shows a friendly "Something went wrong"
 * screen with a reload button instead.
 *
 * WHY a class? Error boundaries need the lifecycle methods
 * `getDerivedStateFromError` / `componentDidCatch`, which only exist on class
 * components. It is the one class component in the project.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AppErrorFallback } from './AppErrorFallback'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  /** Called during render when a child throws: switch to the fallback UI. */
  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  /** Called after the error: a good place to log it. FUTURE: send to a logging service. */
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unexpected UI error', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) return <AppErrorFallback />
    return this.props.children
  }
}
