import { useMutation, useQuery } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { logger } from '@/core/logger';
import { notify } from '@/core/notify';
import { renderHook, waitFor } from '@/test/render';

import { AppError } from './errors';
import { createQueryClient } from './query-client';

const serverError = () => new AppError({ code: 'SERVER_ERROR', message: 'boom', status: 500 });
const notFound = () => new AppError({ code: 'NOT_FOUND', message: 'missing', status: 404 });

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

  it('logs failed queries unless meta.silent is set', async () => {
    const warn = vi.spyOn(logger, 'warn');
    const queryClient = createQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false } });

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
});
