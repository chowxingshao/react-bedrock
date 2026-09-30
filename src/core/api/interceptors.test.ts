import axios, { AxiosError, AxiosHeaders } from 'axios';
import { http as mock, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { createLogger, type LogEntry } from '@/core/logger';
import { createRequestId } from '@/lib/id';
import { apiUrl } from '@/mocks/api-url';
import { server } from '@/mocks/server';

import type { HttpAuthAdapter } from './auth-bridge';
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
  installInterceptors(instance, {
    getLocale: () => 'en',
    createRequestId,
    getHttpAuth: () => auth,
    logger,
    notifyError: vi.fn(),
  });
  const serialisable = () =>
    JSON.stringify(entries.map(({ message, context, meta }) => ({ message, context, meta })));
  return { instance, entries, serialisable };
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
