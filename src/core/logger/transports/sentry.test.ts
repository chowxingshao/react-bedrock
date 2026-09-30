import * as Sentry from '@sentry/react';
import { describe, expect, it, vi } from 'vitest';

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
      expect.objectContaining({
        dsn: 'https://key@example.com/1',
        dataCollection: expect.objectContaining({ userInfo: false, cookies: false }) as unknown,
      }),
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
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
