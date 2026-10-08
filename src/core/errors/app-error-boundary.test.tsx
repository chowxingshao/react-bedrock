import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { logger, type LogEntry } from '@/core/logger';

import { AppErrorBoundary } from './app-error-boundary';
import { reactRootErrorHandlers } from './react-root-error-handlers';

function Explodes({ error = new Error('Render failed') }: { error?: Error }): never {
  throw error;
}

/**
 * Runs `body` with React's act environment switched on, as Testing Library does around its own
 * act(). It is off here because Vitest globals are off, so React's act() would warn.
 */
async function withActEnvironment(body: () => Promise<void>): Promise<void> {
  const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const previous = scope.IS_REACT_ACT_ENVIRONMENT;
  scope.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    await body();
  } finally {
    if (previous === undefined) delete scope.IS_REACT_ACT_ENVIRONMENT;
    else scope.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}

describe('AppErrorBoundary', () => {
  let consoleError: MockInstance<typeof console.error>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('renders children when nothing throws', () => {
    render(
      <AppErrorBoundary>
        <p>App</p>
      </AppErrorBoundary>,
    );
    expect(screen.getByText('App')).toBeInTheDocument();
  });

  it('logs the error with its component stack and offers retry and reload', () => {
    const logError = vi.spyOn(logger, 'error');
    render(
      <AppErrorBoundary>
        <Explodes />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    // The whole page is this message, so it is the page's h1.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(logError).toHaveBeenCalledWith(
      'Unhandled render error',
      expect.objectContaining({
        error: expect.any(Error) as unknown,
        componentStack: expect.stringContaining('Explodes') as unknown,
      }),
    );
  });

  it('logs a render error once when the root has the React callbacks', async () => {
    // React runs the root's onCaughtError before the boundary's componentDidCatch, and the logger
    // drops the boundary's own report of the same error object, so the root callback's entry wins.
    const thrown = new Error('Render failed');
    const entries: LogEntry[] = [];
    const removeTransport = logger.addTransport({
      name: 'memory',
      log: (entry) => entries.push(entry),
    });
    const root = createRoot(document.createElement('div'), reactRootErrorHandlers);

    await withActEnvironment(async () => {
      try {
        await act(() => {
          root.render(
            <AppErrorBoundary>
              <Explodes error={thrown} />
            </AppErrorBoundary>,
          );
          return Promise.resolve();
        });
      } finally {
        removeTransport();
        await act(() => {
          root.unmount();
          return Promise.resolve();
        });
      }
    });

    expect(entries.map((entry) => entry.message)).toEqual(['React error caught by a boundary']);
    expect(entries[0]?.error).toBe(thrown);
    expect(entries[0]?.context.componentStack).toEqual(
      expect.stringContaining('Explodes') as unknown,
    );
    // The suite mocks console.error, so assert that React did not report anything else (for
    // example an act-environment warning) behind the mock.
    expect(consoleError).not.toHaveBeenCalled();
  });
});
