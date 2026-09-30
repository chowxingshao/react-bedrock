import { CancelledError, useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders, CanceledError } from 'axios';
import { http as mock, HttpResponse } from 'msw';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { type LogEntry, logger } from '@/core/logger';
import { notify } from '@/core/notify';
import { apiUrl } from '@/mocks/api-url';
import { server } from '@/mocks/server';
import { createTestQueryClient, renderHook, waitFor } from '@/test/render';

import { AppError } from './errors';
import { http } from './http';
import { createQueryClient } from './query-client';

const serverError = () => new AppError({ code: 'SERVER_ERROR', message: 'boom', status: 500 });
const notFound = () => new AppError({ code: 'NOT_FOUND', message: 'missing', status: 404 });
const offline = () => new AppError({ code: 'NETWORK_ERROR', message: 'offline', status: 0 });
const timedOut = () => new AppError({ code: 'TIMEOUT', message: 'too slow', status: 0 });

/** What a service that bypasses `http` can throw: an Axios error that still carries its request. */
function rawAxiosError(status: number) {
  const config = {
    url: '/lookup?token=s3cret',
    data: '{"email":"a@b.c","password":"hunter2"}',
    headers: new AxiosHeaders({ Authorization: 'Bearer abc123' }),
  };
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_REQUEST',
    config,
    undefined,
    { status, statusText: '', data: {}, headers: {}, config },
  );
}

/** Every way the caches can be told that a request was cancelled. */
const CANCELLATIONS: readonly (readonly [string, () => Error])[] = [
  [
    'a CANCELLED AppError',
    () => new AppError({ code: 'CANCELLED', message: 'Request cancelled', status: 0 }),
  ],
  ["TanStack's CancelledError", () => new CancelledError()],
  ["Axios' CanceledError", () => new CanceledError()],
];
// A query that throws TanStack's own CancelledError is reverted, not failed: it never reaches the cache.
const QUERY_CANCELLATIONS = CANCELLATIONS.filter(([name]) => !name.startsWith('TanStack'));

/** The default `retry` option as the function it is. It gets whatever was thrown, not only an AppError. */
function retryPolicy(): (failureCount: number, error: unknown) => boolean {
  const retry = createQueryClient().getDefaultOptions().queries?.retry;
  if (typeof retry !== 'function') throw new Error('retry should be a function');
  return retry as (failureCount: number, error: unknown) => boolean;
}

/** Records what the app logger emits for the rest of the test, whatever VITE_LOG_LEVEL is. */
function captureLogs() {
  const entries: LogEntry[] = [];
  onTestFinished(logger.addTransport({ name: 'memory', log: (entry) => entries.push(entry) }));
  return {
    entries,
    /** What a transport may serialise: the message, the redacted context and the meta. */
    serialised: () =>
      JSON.stringify(entries.map(({ message, context, meta }) => ({ message, context, meta }))),
  };
}

describe('createQueryClient', () => {
  it('uses the documented defaults', () => {
    const defaults = createQueryClient().getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(30_000);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaults.mutations?.retry).toBe(0);
  });

  it('retries a failed query once, but never on 4xx', () => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry;
    if (typeof retry !== 'function') throw new Error('retry should be a function');

    expect(retry(0, serverError())).toBe(true);
    expect(retry(1, serverError())).toBe(false);
    expect(retry(0, notFound())).toBe(false);
  });

  it.each([
    ['a network error', offline],
    ['a timeout', timedOut],
  ])('retries %s once', (_name, makeError) => {
    const retry = retryPolicy();

    expect(retry(0, makeError())).toBe(true);
    expect(retry(1, makeError())).toBe(false);
  });

  it.each(CANCELLATIONS)('never retries a cancelled request: %s', (_name, makeError) => {
    expect(retryPolicy()(0, makeError())).toBe(false);
  });

  it('judges an error that did not come from http by its status too', () => {
    const retry = retryPolicy();

    expect(retry(0, rawAxiosError(404))).toBe(false);
    expect(retry(0, rawAxiosError(503))).toBe(true);
  });

  it('toasts failed mutations unless they opt out with meta.silent', async () => {
    const toast = vi.spyOn(notify, 'error');
    const { result } = renderHook(
      () => ({
        loud: useMutation({ mutationFn: () => Promise.reject(notFound()) }),
        quiet: useMutation({
          mutationFn: () => Promise.reject(notFound()),
          meta: { silent: true },
        }),
      }),
      { queryClient: createQueryClient() },
    );

    await expect(result.current.loud.mutateAsync()).rejects.toBeInstanceOf(AppError);
    await expect(result.current.quiet.mutateAsync()).rejects.toBeInstanceOf(AppError);

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith("We couldn't find what you were looking for.");
  });

  it('logs a silent mutation failure too: meta.silent only skips the toast', async () => {
    const warn = vi.spyOn(logger, 'warn');
    const { result } = renderHook(
      () =>
        useMutation({
          mutationFn: () => Promise.reject(notFound()),
          mutationKey: ['quiet'],
          meta: { silent: true },
        }),
      { queryClient: createQueryClient() },
    );

    await expect(result.current.mutateAsync()).rejects.toBeInstanceOf(AppError);

    expect(warn).toHaveBeenCalledWith(
      'Mutation failed',
      expect.objectContaining({ mutationKey: ['quiet'] }),
    );
  });

  it('logs failed queries unless meta.silent is set', async () => {
    const warn = vi.spyOn(logger, 'warn');
    const queryClient = createTestQueryClient();

    renderHook(
      () => ({
        loud: useQuery({ queryKey: ['fails'], queryFn: () => Promise.reject(serverError()) }),
        quiet: useQuery({
          queryKey: ['fails-quietly'],
          queryFn: () => Promise.reject(serverError()),
          meta: { silent: true },
        }),
      }),
      { queryClient },
    );

    await waitFor(() => {
      expect(warn).toHaveBeenCalledWith(
        'Query failed',
        expect.objectContaining({ queryKey: ['fails'] }),
      );
    });
    // Both queries fail in the same tick, so the silent one has been reported (or skipped) by now.
    await waitFor(() => {
      expect(queryClient.getQueryState(['fails-quietly'])?.status).toBe('error');
    });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  describe('cancellation', () => {
    it.each(CANCELLATIONS)(
      'neither toasts nor logs a cancelled mutation: %s',
      async (_name, makeError) => {
        const toast = vi.spyOn(notify, 'error');
        const warn = vi.spyOn(logger, 'warn');
        const error = vi.spyOn(logger, 'error');
        const { result } = renderHook(
          () => useMutation({ mutationFn: () => Promise.reject(makeError()) }),
          { queryClient: createQueryClient() },
        );

        await result.current.mutateAsync().catch(() => undefined);

        expect(toast).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
      },
    );

    it.each(QUERY_CANCELLATIONS)('does not log a cancelled query: %s', async (_name, makeError) => {
      const warn = vi.spyOn(logger, 'warn');
      const error = vi.spyOn(logger, 'error');
      const queryClient = createTestQueryClient();

      renderHook(
        () => useQuery({ queryKey: ['cancelled'], queryFn: () => Promise.reject(makeError()) }),
        { queryClient },
      );

      await waitFor(() => {
        expect(queryClient.getQueryState(['cancelled'])?.status).toBe('error');
      });
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    });
  });

  describe('a failure that did not come from http', () => {
    it('logs a query that threw a raw Axios error without the request it carries', async () => {
      const logs = captureLogs();
      const queryClient = createTestQueryClient();

      renderHook(
        () => useQuery({ queryKey: ['raw'], queryFn: () => Promise.reject(rawAxiosError(400)) }),
        { queryClient },
      );

      await waitFor(() => {
        expect(logs.entries.some((entry) => entry.message === 'Query failed')).toBe(true);
      });
      expect(logs.serialised()).not.toMatch(/s3cret|hunter2|abc123|a@b\.c/);
    });

    it('logs a mutation that threw a raw Axios error without the request it carries', async () => {
      const logs = captureLogs();
      const toast = vi.spyOn(notify, 'error');
      const { result } = renderHook(
        () => useMutation({ mutationFn: () => Promise.reject(rawAxiosError(400)) }),
        { queryClient: createQueryClient() },
      );

      await result.current.mutateAsync().catch(() => undefined);

      expect(logs.entries.some((entry) => entry.message === 'Mutation failed')).toBe(true);
      expect(logs.serialised()).not.toMatch(/s3cret|hunter2|abc123|a@b\.c/);
      expect(toast).toHaveBeenCalledTimes(1);
    });

    it('logs an unexpected query failure at error level, so production sees it', async () => {
      const warn = vi.spyOn(logger, 'warn');
      const error = vi.spyOn(logger, 'error');
      const queryClient = createTestQueryClient();

      renderHook(
        () =>
          useQuery({
            queryKey: ['broken'],
            queryFn: () => Promise.reject(new TypeError('x is not a function')),
          }),
        { queryClient },
      );

      await waitFor(() => {
        expect(error).toHaveBeenCalledWith(
          'Query failed',
          expect.objectContaining({ queryKey: ['broken'] }),
        );
      });
      expect(warn).not.toHaveBeenCalled();
    });

    it('logs an unexpected mutation failure at error level and still toasts', async () => {
      const warn = vi.spyOn(logger, 'warn');
      const error = vi.spyOn(logger, 'error');
      const toast = vi.spyOn(notify, 'error');
      const { result } = renderHook(
        () =>
          useMutation({
            mutationFn: () => Promise.reject(new TypeError('x is not a function')),
            mutationKey: ['broken'],
          }),
        { queryClient: createQueryClient() },
      );

      await result.current.mutateAsync().catch(() => undefined);

      expect(error).toHaveBeenCalledWith(
        'Mutation failed',
        expect.objectContaining({ mutationKey: ['broken'] }),
      );
      expect(warn).not.toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith('Something went wrong. Please try again.');
    });
  });

  it('does not log an HTTP failure a second time: the interceptor already did', async () => {
    server.use(
      mock.get(apiUrl('/broken'), () => new HttpResponse(null, { status: 500 })),
      mock.post(apiUrl('/broken'), () => new HttpResponse(null, { status: 500 })),
    );
    const logs = captureLogs();
    const queryClient = createTestQueryClient();

    renderHook(() => useQuery({ queryKey: ['http'], queryFn: () => http.get('/broken') }), {
      queryClient,
    });
    await waitFor(() => {
      expect(queryClient.getQueryState(['http'])?.status).toBe('error');
    });
    const { result } = renderHook(() => useMutation({ mutationFn: () => http.post('/broken') }), {
      queryClient,
    });
    await result.current.mutateAsync().catch(() => undefined);

    // One entry per failed request, from the interceptor: the caches' own entries are de-duplicated.
    expect(
      logs.entries
        .filter((entry) => entry.level !== 'debug')
        .map((entry) => [entry.level, entry.message]),
    ).toEqual([
      ['error', 'HTTP request failed'],
      ['error', 'HTTP request failed'],
    ]);
  });
});
