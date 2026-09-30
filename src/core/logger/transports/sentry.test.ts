import * as Sentry from '@sentry/react';
import type { Breadcrumb, ErrorEvent } from '@sentry/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LogEntry } from '../types';
import { createSentryTransport } from './sentry';

vi.mock('@sentry/react', () => {
  const scope = { setTag: vi.fn(), setUser: vi.fn(), setExtras: vi.fn() };
  return {
    init: vi.fn(),
    withScope: vi.fn((callback: (s: typeof scope) => void) => {
      callback(scope);
    }),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    addBreadcrumb: vi.fn(),
  };
});

const base: Omit<LogEntry, 'level' | 'message'> = {
  timestamp: '2026-01-01T00:00:00.000Z',
  context: {},
  meta: {
    appVersion: '1.0.0',
    gitSha: 'abc',
    environment: 'production',
    route: '/items',
    requestId: 'req-1',
  },
};

const OPTIONS = { dsn: 'https://key@example.com/1', environment: 'production', release: '1' };

/** Creates the transport and waits until the (mocked) SDK chunk has loaded and `init` has run. */
async function startTransport() {
  const transport = createSentryTransport(OPTIONS);
  await vi.dynamicImportSettled();
  return transport;
}

/** The options the transport passed to the most recent `Sentry.init` call. */
function initOptions() {
  const options = vi.mocked(Sentry.init).mock.calls.at(-1)?.[0];
  if (!options) throw new Error('Sentry.init was not called');
  return options;
}

function scrubbers() {
  const { beforeSend, beforeBreadcrumb } = initOptions();
  if (!beforeSend || !beforeBreadcrumb) throw new Error('The privacy hooks are not configured');
  return { beforeSend, beforeBreadcrumb };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sentry transport', () => {
  it('initialises lazily with privacy-safe options and captures errors', async () => {
    const transport = createSentryTransport({
      dsn: 'https://key@example.com/1',
      environment: 'production',
      release: '1.0.0+abc',
    });
    const error = new Error('Boom');

    transport.log({ ...base, level: 'error', message: 'Request failed', error });
    await vi.dynamicImportSettled();

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://key@example.com/1' }),
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  describe('the queue of entries logged before the SDK loads', () => {
    it('keeps sending when one queued entry makes the SDK throw', async () => {
      vi.mocked(Sentry.captureException).mockImplementationOnce(() => {
        throw new Error('sdk down');
      });
      const transport = createSentryTransport(OPTIONS);
      const errors = [new Error('one'), new Error('two'), new Error('three')];

      for (const error of errors) transport.log({ ...base, level: 'error', message: 'x', error });
      await vi.dynamicImportSettled();

      expect(Sentry.captureException).toHaveBeenCalledTimes(3);
      expect(Sentry.captureException).toHaveBeenLastCalledWith(errors[2]);
    });

    it('holds at most 100 entries and drops the oldest, so a failed load cannot grow it', async () => {
      const transport = createSentryTransport(OPTIONS);

      for (let index = 0; index < 105; index += 1) {
        transport.log({ ...base, level: 'warn', message: `entry ${String(index)}` });
      }
      await vi.dynamicImportSettled();

      const messages = vi.mocked(Sentry.addBreadcrumb).mock.calls.map(([crumb]) => crumb.message);
      expect(messages).toHaveLength(100);
      expect(messages[0]).toBe('entry 5');
      expect(messages[99]).toBe('entry 104');
    });
  });

  it('keeps the route and request id on a warning breadcrumb', async () => {
    const transport = await startTransport();

    transport.log({ ...base, level: 'warn', message: 'Slow', context: { durationMs: 900 } });

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      level: 'warning',
      message: 'Slow',
      data: { durationMs: 900, route: '/items', requestId: 'req-1' },
    });
  });

  it('leaves the request id off a warning breadcrumb when there is none', async () => {
    const transport = await startTransport();

    transport.log({
      ...base,
      level: 'warn',
      message: 'Slow',
      meta: { ...base.meta, requestId: undefined },
    });

    const breadcrumb = vi.mocked(Sentry.addBreadcrumb).mock.calls[0]?.[0];
    expect(breadcrumb?.data).toStrictEqual({ route: '/items' });
  });

  it('switches off every Sentry data collection flag this template does not use', async () => {
    await startTransport();

    expect(initOptions().dataCollection).toStrictEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    });
  });

  describe('privacy hooks', () => {
    it('strips the query string and fragment from the URLs of an event', async () => {
      await startTransport();
      const event: ErrorEvent = {
        type: undefined,
        message: 'Boom',
        transaction: '/next?invite=SECRET456',
        request: {
          method: 'GET',
          url: 'http://localhost:3000/next?invite=SECRET456#frag',
          query_string: 'invite=SECRET456',
        },
      };

      const result = await scrubbers().beforeSend(event, {});

      expect(result).toStrictEqual({
        type: undefined,
        message: 'Boom',
        transaction: '/next',
        request: { method: 'GET', url: 'http://localhost:3000/next' },
      });
    });

    it('passes an event without request data through', async () => {
      await startTransport();
      const event: ErrorEvent = { type: undefined, message: 'Boom' };

      expect(await scrubbers().beforeSend(event, {})).toStrictEqual(event);
    });

    it('drops console breadcrumbs, which carry raw arguments the redactor never sees', async () => {
      await startTransport();
      const breadcrumb: Breadcrumb = {
        category: 'console',
        level: 'log',
        message: 'login {"password":"raw"}',
        data: { arguments: [{ password: 'raw' }] },
      };

      expect(scrubbers().beforeBreadcrumb(breadcrumb)).toBeNull();
    });

    it('strips the query string and fragment from navigation and request breadcrumbs', async () => {
      await startTransport();
      const { beforeBreadcrumb } = scrubbers();
      const navigation: Breadcrumb = {
        category: 'navigation',
        data: { from: '/', to: '/reset-password?token=SECRET123#frag' },
      };
      const request: Breadcrumb = {
        category: 'fetch',
        data: { method: 'GET', status_code: 200, url: '/api/items?email=a@b.c' },
      };

      expect(beforeBreadcrumb(navigation)).toStrictEqual({
        category: 'navigation',
        data: { from: '/', to: '/reset-password' },
      });
      expect(beforeBreadcrumb(request)).toStrictEqual({
        category: 'fetch',
        data: { method: 'GET', status_code: 200, url: '/api/items' },
      });
    });

    it('does not mutate the breadcrumb it is given', async () => {
      await startTransport();
      const breadcrumb: Breadcrumb = {
        category: 'navigation',
        data: { to: '/reset-password?token=SECRET123' },
      };

      scrubbers().beforeBreadcrumb(breadcrumb);

      expect(breadcrumb.data).toStrictEqual({ to: '/reset-password?token=SECRET123' });
    });

    it('keeps breadcrumbs without data as they are', async () => {
      await startTransport();
      const breadcrumb: Breadcrumb = { category: 'ui.click', message: 'button.save' };

      expect(scrubbers().beforeBreadcrumb(breadcrumb)).toStrictEqual(breadcrumb);
    });
  });

  it('turns warnings into breadcrumbs', async () => {
    const transport = createSentryTransport({
      dsn: 'https://key@example.com/1',
      environment: 'production',
      release: '1',
    });
    transport.log({ ...base, level: 'warn', message: 'Slow response' });
    await vi.dynamicImportSettled();

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'warning', message: 'Slow response' }),
    );
  });
});
