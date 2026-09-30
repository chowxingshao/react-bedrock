import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './error-boundary';

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error('Kaboom');
  return <p>Safe</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // React reports caught errors
  });

  it('renders the fallback and reports the error with its component stack', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary
        onError={onError}
        fallback={({ error }) => (
          <p>Caught: {error instanceof Error ? error.message : 'unknown'}</p>
        )}
      >
        <Bomb explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Caught: Kaboom')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.stringContaining('Bomb') as unknown }),
    );
  });

  it('recovers when the fallback calls reset', async () => {
    let explode = true;
    function Maybe() {
      return <Bomb explode={explode} />;
    }
    const onReset = vi.fn();
    const user = userEvent.setup();
    render(
      <ErrorBoundary
        onReset={onReset}
        fallback={({ reset }) => (
          <button
            type="button"
            onClick={() => {
              explode = false;
              reset();
            }}
          >
            Reset
          </button>
        )}
      >
        <Maybe />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByText('Safe')).toBeInTheDocument();
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('resets itself when a reset key changes', () => {
    const fallback = () => <p>Fallback</p>;
    const { rerender } = render(
      <ErrorBoundary resetKeys={['/a']} fallback={fallback}>
        <Bomb explode />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Fallback')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKeys={['/b']} fallback={fallback}>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Safe')).toBeInTheDocument();
  });

  it('does not reset when a reset key change makes healthy children throw', () => {
    const onError = vi.fn();
    const onReset = vi.fn();
    const fallback = () => <p>Fallback</p>;
    const { rerender } = render(
      <ErrorBoundary resetKeys={['/a']} onError={onError} onReset={onReset} fallback={fallback}>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Safe')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKeys={['/b']} onError={onError} onReset={onReset} fallback={fallback}>
        <Bomb explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Fallback')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onReset).not.toHaveBeenCalled();
  });

  it('keeps the fallback when it rerenders with unchanged reset keys', () => {
    const fallback = () => <p>Fallback</p>;
    const { rerender } = render(
      <ErrorBoundary resetKeys={['/a']} fallback={fallback}>
        <Bomb explode />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Fallback')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKeys={['/a']} fallback={fallback}>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Fallback')).toBeInTheDocument();
    expect(screen.queryByText('Safe')).not.toBeInTheDocument();
  });

  it('resets itself when the number of reset keys changes', () => {
    const fallback = () => <p>Fallback</p>;
    const { rerender } = render(
      <ErrorBoundary resetKeys={['/a']} fallback={fallback}>
        <Bomb explode />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Fallback')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKeys={['/a', '/b']} fallback={fallback}>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Safe')).toBeInTheDocument();
  });

  it('calls onReset when it resets itself after a reset key change', () => {
    const onReset = vi.fn();
    const fallback = () => <p>Fallback</p>;
    const { rerender } = render(
      <ErrorBoundary resetKeys={['/a']} onReset={onReset} fallback={fallback}>
        <Bomb explode />
      </ErrorBoundary>,
    );
    expect(onReset).not.toHaveBeenCalled();

    rerender(
      <ErrorBoundary resetKeys={['/b']} onReset={onReset} fallback={fallback}>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Safe')).toBeInTheDocument();
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
