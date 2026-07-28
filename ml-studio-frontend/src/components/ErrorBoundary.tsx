import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui/Button'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Centralized place to eventually send this to real error tracking (Sentry, etc.)
    console.error('Uncaught render error:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg text-center">
          <p className="text-lg font-medium text-text">Something went wrong</p>
          <p className="max-w-sm text-sm text-text-muted">
            This page ran into an unexpected error. You can try reloading, or go back to your projects.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={this.handleReset}>Try again</Button>
            <Button onClick={() => { window.location.href = '/' }}>Back to projects</Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}