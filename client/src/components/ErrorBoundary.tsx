import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';

/**
 * Top-level error boundary.
 *
 * React has no hook equivalent, so this is one of the few places a class
 * component is still the right tool. Without it, a single render error unmounts
 * the entire tree and the user is left looking at a white page with no way
 * forward — the worst possible failure mode for an app holding their finances.
 *
 * The error message is never shown. It would be a stack trace or a minified
 * component name: useless to the user and a small information leak.
 */

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Where a real deployment would report to Sentry. Logging to the console
    // keeps the information available in development without a dependency.
    console.error('Unhandled render error', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl bg-critical-soft text-critical">
            <svg viewBox="0 0 20 20" className="size-6" fill="currentColor" aria-hidden="true">
              <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3.5a.9.9 0 0 1 .9.9v4.2a.9.9 0 0 1-1.8 0V6.4a.9.9 0 0 1 .9-.9Zm0 8.9a1.05 1.05 0 1 1 0-2.1 1.05 1.05 0 0 1 0 2.1Z" />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Savewise hit an unexpected problem and could not finish loading this screen. Your data
            is unaffected.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => this.setState({ hasError: false })} variant="outline">
              Try again
            </Button>
            {/* A full reload, not a client-side navigation: the React tree is in
                an unknown state and the point is to start from scratch. */}
            <Button onClick={() => window.location.assign('/')}>Go home</Button>
          </div>
        </div>
      </div>
    );
  }
}
