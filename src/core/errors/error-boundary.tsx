import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryFallbackProps {
  error: unknown;
  /** Clears the error and renders the children again. */
  reset: () => void;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (props: ErrorBoundaryFallbackProps) => ReactNode;
  /** Called once per caught error, with React's component stack. */
  onError?: (error: unknown, info: ErrorInfo) => void;
  onReset?: () => void;
  /** When any value changes (e.g. the route path), a caught error is cleared automatically. */
  resetKeys?: readonly unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

const changed = (a: readonly unknown[] = [], b: readonly unknown[] = []) =>
  a.length !== b.length || a.some((value, index) => !Object.is(value, b[index]));

/** Generic render-error boundary. Class components are still the only way to catch render errors. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override componentDidUpdate(
    previous: ErrorBoundaryProps,
    previousState: ErrorBoundaryState,
  ): void {
    // Only an error that was already showing may be cleared by a key change; an error thrown by
    // this same render (healthy -> broken) must not be reset straight away.
    if (
      this.state.hasError &&
      previousState.hasError &&
      changed(previous.resetKeys, this.props.resetKeys)
    ) {
      this.reset();
    }
  }

  reset = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback({ error: this.state.error, reset: this.reset });
    }
    return this.props.children;
  }
}
