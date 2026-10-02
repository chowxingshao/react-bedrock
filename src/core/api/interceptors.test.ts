import axios, { AxiosError, AxiosHeaders } from 'axios';
import { http as mock, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { createLogger, type LogEntry } from '@/core/logger';
import { createRequestId } from '@/lib/id';
import { apiUrl } from '@/mocks/api-url';
import { server } from '@/mocks/server';

import type { HttpAuthAdapter } from './auth-bridge';
import { AppError } from './errors';
import { installInterceptors } from './interceptors';

const UUID = /^[0-9a-f-]{36}$/;

/**
 * An instance with its own logger at `debug` level and an in-memory transport, so what the
 * interceptors log can be asserted whatever VITE_LOG_LEVEL is.
 */
function setup(auth: HttpAuthAdapter | null) {
  const entries: LogEntry[] = [];
  const logger = createLogger({
    level: 'debug',
    transports: [{ name: 'memory', log: (entry) => entries.push(entry) }],
  });
  const instance = axios.create({ baseURL: apiUrl('/') });
  const notifyError = vi.fn();
  installInterceptors(instance, {
    getLocale: () => 'en',
    createRequestId,
    getHttpAuth: () => auth,
    logger,
    notifyError,
  });
  const serialisable = () =>
    JSON.stringify(entries.map(({ message, context, meta }) => ({ message, context, meta })));
  return { instance, entries, serialisable, notifyError };
}

function adapter(overrides: Partial<HttpAuthAdapter> = {}): HttpAuthAdapter {
  return {
    prepareRequest: (config) => config,
    refresh: () => Promise.resolve(),
    onSessionExpired: vi.fn(),
    ...overrides,
  };
}

describe('installInterceptors: 401 handling is logged', () => {
  it('logs a 401 that is still unauthorised after the refresh, at warn, with the request id', async () => {
    server.use(mock.get(apiUrl('/secure'), () => new HttpResponse(null, { status: 401 })));
    const auth = adapter();
    const { instance, entries, serialisable } = setup(auth);

    await expect(instance.get('/secure?token=s3cret')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });

    const warnings = entries.filter((entry) => entry.level === 'warn');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      message: 'HTTP request still unauthorised after refreshing the session',
      context: { status: 401, code: 'UNAUTHORIZED', method: 'get', url: '/secure' },
      meta: { requestId: expect.stringMatching(UUID) as unknown },
    });
    expect(serialisable()).not.toContain('s3cret');
    expect(auth.onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('logs why the session refresh failed, summarising the error instead of copying it', async () => {
    server.use(mock.get(apiUrl('/secure'), () => new HttpResponse(null, { status: 401 })));
    const requestConfig = {
      url: '/auth/refresh?token=s3cret',
      data: '{"password":"hunter2"}',
      headers: new AxiosHeaders({ Authorization: 'Bearer abc123' }),
    };
    const rawRefreshError = new AxiosError(
      'Request failed with status code 401',
      'ERR_BAD_REQUEST',
      requestConfig,
      undefined,
      { status: 401, statusText: '', data: {}, headers: {}, config: requestConfig },
    );
    const auth = adapter({ refresh: () => Promise.reject(rawRefreshError) });
    const { instance, entries, serialisable } = setup(auth);

    await expect(instance.get('/secure?token=s3cret')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });

    const warnings = entries.filter((entry) => entry.level === 'warn');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      message: 'HTTP session refresh failed',
      context: {
        status: 401,
        code: 'UNAUTHORIZED',
        method: 'get',
        url: '/secure',
        refreshError: {
          name: 'AppError',
          code: 'UNAUTHORIZED',
          cause: { name: 'AxiosError', code: 'ERR_BAD_REQUEST', status: 401 },
        },
      },
      meta: { requestId: expect.stringMatching(UUID) as unknown },
    });
    const logged = serialisable();
    for (const secret of ['s3cret', 'hunter2', 'abc123', 'Bearer']) {
      expect(logged).not.toContain(secret);
    }
    expect(auth.onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('logs every concurrent request whose shared refresh failed, each with its own request id', async () => {
    server.use(mock.get(apiUrl('/secure'), () => new HttpResponse(null, { status: 401 })));
    const { instance, entries } = setup(
      adapter({ refresh: () => Promise.reject(new Error('refresh token expired')) }),
    );

    const results = await Promise.allSettled([
      instance.get('/secure'),
      instance.get('/secure'),
      instance.get('/secure'),
    ]);

    expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected', 'rejected']);
    const warnings = entries.filter((entry) => entry.level === 'warn');
    expect(warnings.map((entry) => entry.message)).toEqual([
      'HTTP session refresh failed',
      'HTTP session refresh failed',
      'HTTP session refresh failed',
    ]);
    expect(new Set(warnings.map((entry) => entry.meta.requestId)).size).toBe(3);
  });

  it('logs the 401 that triggers a refresh at debug, not as a failure', async () => {
    let authorised = false;
    server.use(
      mock.get(apiUrl('/secure'), () =>
        authorised ? HttpResponse.json({ ok: true }) : new HttpResponse(null, { status: 401 }),
      ),
    );
    const { instance, entries, serialisable } = setup(
      adapter({
        refresh: () => {
          authorised = true;
          return Promise.resolve();
        },
      }),
    );

    await instance.get('/secure?token=s3cret');

    const recovered = entries.find((entry) => entry.message.includes('refreshing the session'));
    expect(recovered).toMatchObject({
      level: 'debug',
      message: 'HTTP request unauthorised, retrying after refreshing the session',
      context: { status: 401, code: 'UNAUTHORIZED', method: 'get', url: '/secure' },
      meta: { requestId: expect.stringMatching(UUID) as unknown },
    });
    expect(entries.filter((entry) => entry.level === 'warn' || entry.level === 'error')).toEqual(
      [],
    );
    expect(serialisable()).not.toContain('s3cret');
  });

  it('still logs a 401 at warn when no auth adapter is registered', async () => {
    server.use(mock.get(apiUrl('/secure'), () => new HttpResponse(null, { status: 401 })));
    const { instance, entries } = setup(null);

    await expect(instance.get('/secure')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    expect(entries.filter((entry) => entry.level === 'warn')).toMatchObject([
      {
        message: 'HTTP request failed',
        context: { status: 401, code: 'UNAUTHORIZED', url: '/secure' },
      },
    ]);
  });
});

describe('installInterceptors: a failed refresh', () => {
  const unauthorised = () =>
    mock.get(apiUrl('/secure'), () => new HttpResponse(null, { status: 401 }));

  const transient: readonly (readonly [string, () => AppError])[] = [
    [
      'a network error',
      () => new AppError({ code: 'NETWORK_ERROR', message: 'Network Error', status: 0 }),
    ],
    [
      'a timeout',
      () => new AppError({ code: 'TIMEOUT', message: 'timeout of 30000ms exceeded', status: 0 }),
    ],
    [
      'a cancellation',
      () => new AppError({ code: 'CANCELLED', message: 'Request cancelled', status: 0 }),
    ],
    ['a 500', () => new AppError({ code: 'SERVER_ERROR', message: 'Server Error', status: 500 })],
    [
      'a 503 with its own code',
      () => new AppError({ code: 'MAINTENANCE', message: 'Down', status: 503 }),
    ],
  ];

  it.each(transient)(
    'keeps the session and rethrows %s, the reason the request failed',
    async (_name, makeError) => {
      server.use(unauthorised());
      const refreshError = makeError();
      const auth = adapter({ refresh: () => Promise.reject(refreshError) });
      const { instance } = setup(auth);

      await expect(instance.get('/secure')).rejects.toBe(refreshError);

      expect(auth.onSessionExpired).not.toHaveBeenCalled();
    },
  );

  it('normalises a raw transient error before rethrowing it', async () => {
    server.use(unauthorised());
    const auth = adapter({
      refresh: () => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK')),
    });
    const { instance } = setup(auth);

    await expect(instance.get('/secure')).rejects.toMatchObject({
      name: 'AppError',
      code: 'NETWORK_ERROR',
      status: 0,
    });

    expect(auth.onSessionExpired).not.toHaveBeenCalled();
  });

  it('logs a transient refresh failure once, at warn, summarised', async () => {
    server.use(unauthorised());
    const requestConfig = {
      url: '/auth/refresh?token=s3cret',
      data: '{"password":"hunter2"}',
      headers: new AxiosHeaders({ Authorization: 'Bearer abc123' }),
    };
    const auth = adapter({
      refresh: () => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK', requestConfig)),
    });
    const { instance, entries, serialisable } = setup(auth);

    await expect(instance.get('/secure?token=s3cret')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });

    expect(entries.filter((entry) => entry.level === 'warn')).toMatchObject([
      {
        message: 'HTTP session refresh failed',
        context: {
          status: 401,
          url: '/secure',
          refreshError: { name: 'AppError', code: 'NETWORK_ERROR' },
        },
      },
    ]);
    const logged = serialisable();
    for (const secret of ['s3cret', 'hunter2', 'abc123', 'Bearer']) {
      expect(logged).not.toContain(secret);
    }
  });

  it('keeps the session for every request that shared a transiently failing refresh', async () => {
    server.use(unauthorised());
    const auth = adapter({
      refresh: () =>
        Promise.reject(
          new AppError({ code: 'NETWORK_ERROR', message: 'Network Error', status: 0 }),
        ),
    });
    const { instance } = setup(auth);

    const results = await Promise.allSettled([instance.get('/secure'), instance.get('/secure')]);

    expect(results).toMatchObject([
      { status: 'rejected', reason: { code: 'NETWORK_ERROR' } },
      { status: 'rejected', reason: { code: 'NETWORK_ERROR' } },
    ]);
    expect(auth.onSessionExpired).not.toHaveBeenCalled();
  });

  it('toasts a transient connectivity failure like any other request, unless the request is silent', async () => {
    server.use(unauthorised());
    const refreshError = new AppError({
      code: 'NETWORK_ERROR',
      message: 'Network Error',
      status: 0,
    });
    const { instance, notifyError } = setup(
      adapter({ refresh: () => Promise.reject(refreshError) }),
    );

    await expect(instance.get('/secure', { silent: true })).rejects.toBe(refreshError);
    expect(notifyError).not.toHaveBeenCalled();

    await expect(instance.get('/secure')).rejects.toBe(refreshError);
    expect(notifyError).toHaveBeenCalledExactlyOnceWith(refreshError);
  });

  it.each([400, 401, 403])(
    'expires the session when the refresh is refused with a %i',
    async (status) => {
      server.use(unauthorised());
      const auth = adapter({
        refresh: () =>
          Promise.reject(new AppError({ code: 'REFRESH_REFUSED', message: 'No', status })),
      });
      const { instance } = setup(auth);

      await expect(instance.get('/secure')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        status: 401,
      });

      expect(auth.onSessionExpired).toHaveBeenCalledTimes(1);
    },
  );

  it('expires the session when the adapter itself throws something that is not an HTTP failure', async () => {
    server.use(unauthorised());
    const auth = adapter({ refresh: () => Promise.reject(new TypeError('adapter bug')) });
    const { instance } = setup(auth);

    await expect(instance.get('/secure')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    expect(auth.onSessionExpired).toHaveBeenCalledTimes(1);
  });
});

describe('installInterceptors: a 401 from before the latest refresh', () => {
  it('is retried without starting a second refresh', async () => {
    const calls = { fast: 0, slow: 0 };
    // The slow handler answers only when told to, so the order is fixed instead of timed: the slow
    // request is sent first, the fast one is refreshed and retried, and only then does the slow 401 arrive.
    let releaseSlow: () => void = () => undefined;
    const slowAnswer = new Promise<void>((resolve) => {
      releaseSlow = resolve;
    });
    server.use(
      mock.get(apiUrl('/fast'), () => {
        calls.fast += 1;
        return calls.fast === 1
          ? new HttpResponse(null, { status: 401 })
          : HttpResponse.json({ ok: true });
      }),
      mock.get(apiUrl('/slow'), async () => {
        calls.slow += 1;
        if (calls.slow > 1) return HttpResponse.json({ ok: true });
        // Sent before the refresh, answered after it: this 401 belongs to the old session.
        await slowAnswer;
        return new HttpResponse(null, { status: 401 });
      }),
    );
    const refresh = vi.fn(() => Promise.resolve());
    const auth = adapter({ refresh });
    const { instance } = setup(auth);

    const slowRequest = instance.get('/slow');
    const fast = await instance.get('/fast'); // 401, refresh, retry: the refresh has completed
    expect(fast.data).toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);

    releaseSlow();
    const slow = await slowRequest;

    expect(slow.data).toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls.slow).toBe(2);
    expect(auth.onSessionExpired).not.toHaveBeenCalled();
  });

  it('refreshes again for a 401 from a request sent after the previous refresh completed', async () => {
    let serverSession = 1;
    let clientSession = 1;
    server.use(
      mock.get(apiUrl('/secure'), () =>
        clientSession === serverSession
          ? HttpResponse.json({ ok: true })
          : new HttpResponse(null, { status: 401 }),
      ),
    );
    const refresh = vi.fn(() => {
      clientSession = serverSession;
      return Promise.resolve();
    });
    const auth = adapter({ refresh });
    const { instance } = setup(auth);

    serverSession = 2; // the access cookie expires
    await expect(instance.get('/secure')).resolves.toMatchObject({ data: { ok: true } });
    serverSession = 3; // and expires again later
    await expect(instance.get('/secure')).resolves.toMatchObject({ data: { ok: true } });

    expect(refresh).toHaveBeenCalledTimes(2);
    expect(auth.onSessionExpired).not.toHaveBeenCalled();
  });
});
