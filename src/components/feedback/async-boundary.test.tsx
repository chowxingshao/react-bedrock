import { useSuspenseQuery } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { type ReactNode, use } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SUSPENSE_FALLBACK_DELAY_MS } from '@/config/constants';
import { act, render, screen } from '@/test/render';

import { AsyncBoundary } from './async-boundary';

/** Renders a boundary around a child that suspends until `resolve` is called. */
async function renderSuspended(loading?: ReactNode) {
  let resolve: (value: string) => void = () => undefined;
  const promise = new Promise<string>((done) => {
    resolve = done;
  });
  function Suspends() {
    return <p>{use(promise)}</p>;
  }

  let container: HTMLElement = document.body;
  // React 19 does not retry a `use()` suspend that began inside a synchronous `act`.
  await act(() => {
    ({ container } = render(
      <AsyncBoundary loading={loading}>
        <Suspends />
      </AsyncBoundary>,
    ));
    return Promise.resolve();
  });
  return { resolve, container };
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('AsyncBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the loading fallback, after the delay, while children suspend', async () => {
    vi.useFakeTimers();
    const { resolve } = await renderSuspended(<p>Waiting</p>);
    expect(screen.queryByText('Waiting')).not.toBeInTheDocument();

    advance(SUSPENSE_FALLBACK_DELAY_MS - 1);
    expect(screen.queryByText('Waiting')).not.toBeInTheDocument();
    advance(1);
    expect(screen.getByText('Waiting')).toBeInTheDocument();

    vi.useRealTimers();
    resolve('Ready');
    expect(await screen.findByText('Ready')).toBeInTheDocument();
  });

  it('delays the default loader once, not twice', async () => {
    vi.useFakeTimers();
    await renderSuspended();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    advance(SUSPENSE_FALLBACK_DELAY_MS - 1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    advance(1);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders nothing while suspended when loading is null', async () => {
    vi.useFakeTimers();
    const { container } = await renderSuspended(null);

    advance(SUSPENSE_FALLBACK_DELAY_MS * 2);
    expect(container).toBeEmptyDOMElement();
  });

  it('retries a failed suspense query from its error state', async () => {
    let attempts = 0;
    function Data() {
      const { data } = useSuspenseQuery({
        queryKey: ['async-boundary-retry'],
        queryFn: () => {
          attempts += 1;
          return attempts === 1 ? Promise.reject(new Error('Boom')) : Promise.resolve('Loaded');
        },
      });
      return <p>{data}</p>;
    }
    const user = userEvent.setup();
    render(
      <AsyncBoundary>
        <Data />
      </AsyncBoundary>,
    );

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Loaded')).toBeInTheDocument();
  });
});
