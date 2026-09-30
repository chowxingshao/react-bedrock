import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logger, type LogEntry } from '@/core/logger';

import { AppErrorBoundary } from './app-error-boundary';
import { reactRootErrorHandlers } from './react-root-error-handlers';

function Explodes(): never {
  throw new Error('Render failed');
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
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
    const entries: LogEntry[] = [];
    const removeTransport = logger.addTransport({
      name: 'memory',
      log: (entry) => entries.push(entry),
    });
    const root = createRoot(document.createElement('div'), reactRootErrorHandlers);

    await act(() => {
      root.render(
        <AppErrorBoundary>
          <Explodes />
        </AppErrorBoundary>,
      );
      return Promise.resolve();
    });
    await act(() => {
      root.unmount();
      return Promise.resolve();
    });
    removeTransport();

    expect(entries.map((entry) => entry.message)).toEqual(['React error caught by a boundary']);
  });
});
