import { useQuery } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { act, render, screen } from '@/test/render';

import { QueryState, type QueryLike } from './query-state';

function queryOf<T>(overrides: Partial<QueryLike<T, Error>>): QueryLike<T, Error> {
  return {
    status: 'pending',
    data: undefined,
    error: null,
    refetch: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('QueryState', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the loading slot, custom or default, only after the skeleton delay', () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <QueryState query={queryOf<string[]>({})} loading={<p>Loading items</p>}>
        {(data) => <p>{data.join(',')}</p>}
      </QueryState>,
    );
    expect(screen.queryByText('Loading items')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText('Loading items')).toBeInTheDocument();
    unmount();

    // The default loader must wait the same 200 ms (it is not delayed a second time on top of it).
    render(
      <QueryState query={queryOf<string[]>({})}>{(data) => <p>{data.join(',')}</p>}</QueryState>,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders children with the data on success', () => {
    render(
      <QueryState query={queryOf({ status: 'success', data: ['a', 'b'] })}>
        {(data) => <p>{data.join(',')}</p>}
      </QueryState>,
    );
    expect(screen.getByText('a,b')).toBeInTheDocument();
  });

  it('shows the default empty state for an empty array', () => {
    render(
      <QueryState query={queryOf<string[]>({ status: 'success', data: [] })}>
        {() => <p>list</p>}
      </QueryState>,
    );
    expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument();
  });

  it('uses isEmpty and the empty slot', () => {
    render(
      <QueryState
        query={queryOf({ status: 'success', data: { items: [] as string[] } })}
        isEmpty={(data) => data.items.length === 0}
        empty={<p>No items</p>}
      >
        {() => <p>list</p>}
      </QueryState>,
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('shows an error whose retry refetches the query', async () => {
    const query = queryOf<string[]>({ status: 'error', error: new Error('Boom') });
    const user = userEvent.setup();
    render(<QueryState query={query}>{() => null}</QueryState>);

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(query.refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps showing cached data when a background refetch fails', () => {
    render(
      <QueryState
        query={queryOf({ status: 'error', data: ['cached'], error: new Error('offline') })}
      >
        {(data) => <p>{data[0]}</p>}
      </QueryState>,
    );
    expect(screen.getByText('cached')).toBeInTheDocument();
  });

  it('works with a real useQuery result', async () => {
    function Harness() {
      const query = useQuery({
        queryKey: ['query-state-test'],
        queryFn: () => Promise.resolve(['real']),
      });
      return <QueryState query={query}>{(data) => <p>{data[0]}</p>}</QueryState>;
    }
    render(<Harness />);
    expect(await screen.findByText('real')).toBeInTheDocument();
  });
});
