import { useSuspenseQuery } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { use } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { act, render, screen } from '@/test/render';

import { AsyncBoundary } from './async-boundary';

describe('AsyncBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('shows the loading fallback while children suspend', async () => {
    let resolve: (value: string) => void = () => undefined;
    const promise = new Promise<string>((done) => {
      resolve = done;
    });
    function Suspends() {
      return <p>{use(promise)}</p>;
    }

    // React 19 does not retry a `use()` suspend that began inside a synchronous `act`.
    await act(() => {
      render(
        <AsyncBoundary loading={<p>Waiting</p>}>
          <Suspends />
        </AsyncBoundary>,
      );
      return Promise.resolve();
    });
    expect(screen.getByText('Waiting')).toBeInTheDocument();

    resolve('Ready');
    expect(await screen.findByText('Ready')).toBeInTheDocument();
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
