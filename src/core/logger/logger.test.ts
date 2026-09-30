import { describe, expect, it, vi } from 'vitest';

import { env } from '@/config/env';

import { createLogger } from './logger';
import type { LogEntry, LogTransport } from './types';

function memoryTransport(minLevel?: LogTransport['minLevel']) {
  const entries: LogEntry[] = [];
  const transport: LogTransport = { name: 'memory', minLevel, log: (entry) => entries.push(entry) };
  return { entries, transport };
}

describe('createLogger', () => {
  it('drops entries below the level threshold', () => {
    const { entries, transport } = memoryTransport();
    const logger = createLogger({ level: 'warn', transports: [transport] });

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(entries.map((entry) => entry.level)).toEqual(['warn', 'error']);
  });

  it('attaches app metadata, route, user and request ids', () => {
    const { entries, transport } = memoryTransport();
    const logger = createLogger({
      level: 'debug',
      transports: [transport],
      getRoute: () => '/items',
    });

    logger.setUser('user-1');
    logger.info('Loaded', { requestId: 'req-9', count: 3 });

    expect(entries[0]).toMatchObject({
      level: 'info',
      message: 'Loaded',
      context: { count: 3 },
      meta: {
        route: '/items',
        userId: 'user-1',
        requestId: 'req-9',
        environment: env.VITE_APP_ENV,
      },
    });
    expect(entries[0]?.meta.appVersion).toEqual(expect.any(String));
  });

  it('redacts sensitive context', () => {
    const { entries, transport } = memoryTransport();
    createLogger({ level: 'debug', transports: [transport] }).info('Login', { password: 'x' });
    expect(entries[0]?.context).toEqual({ password: '[REDACTED]' });
  });

  it('keeps the raw error and logs the same error object only once', () => {
    const { entries, transport } = memoryTransport();
    const logger = createLogger({ level: 'debug', transports: [transport] });
    const error = new Error('Boom');

    logger.error('First report', { error });
    logger.error('Duplicate report', { error });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.error).toBe(error);
  });

  it('reports an error again at a higher severity, but not at the same or a lower one', () => {
    const { entries, transport } = memoryTransport();
    const logger = createLogger({ level: 'debug', transports: [transport] });
    const error = new Error('Query failed');

    logger.warn('Query failed', { error });
    logger.error('Caught by a boundary', { error });
    logger.error('Duplicate', { error });
    logger.warn('Late', { error });

    expect(entries.map((entry) => entry.level)).toEqual(['warn', 'error']);
    expect(entries.map((entry) => entry.message)).toEqual(['Query failed', 'Caught by a boundary']);
  });

  it('does not report an error again after a higher severity already reported it', () => {
    const { entries, transport } = memoryTransport();
    const logger = createLogger({ level: 'debug', transports: [transport] });
    const error = new Error('Boom');

    logger.error('Caught by a boundary', { error });
    logger.warn('Logged later as a warning', { error });

    expect(entries.map((entry) => entry.level)).toEqual(['error']);
  });

  describe('when the context cannot be read or redacted', () => {
    const boom = () => {
      throw new Error('context exploded');
    };
    const cases: [string, () => Record<string, unknown>][] = [
      [
        'a throwing getter',
        () => Object.defineProperty({}, 'value', { enumerable: true, get: boom }),
      ],
      [
        'a throwing getter in a nested object',
        () => ({ nested: Object.defineProperty({}, 'value', { enumerable: true, get: boom }) }),
      ],
      ['a throwing proxy', () => ({ nested: new Proxy({}, { ownKeys: boom }) })],
      ['a throwing proxy as the context', () => new Proxy({}, { ownKeys: boom })],
    ];

    it.each(cases)('still logs, with a placeholder context, for %s', (_name, makeContext) => {
      const { entries, transport } = memoryTransport();
      const logger = createLogger({ level: 'debug', transports: [transport] });

      expect(() => {
        logger.error('Payment failed', makeContext());
        logger.warn('Payment slow', makeContext());
      }).not.toThrow();

      expect(entries.map((entry) => [entry.level, entry.message])).toEqual([
        ['error', 'Payment failed'],
        ['warn', 'Payment slow'],
      ]);
      expect(entries[0]?.context).toEqual({ '[unserialisable context]': true });
    });

    it('keeps the raw error and the request id it can still read', () => {
      const { entries, transport } = memoryTransport();
      const logger = createLogger({ level: 'debug', transports: [transport] });
      const error = new Error('Boom');

      logger.error('Payment failed', {
        error,
        requestId: 'req-1',
        nested: Object.defineProperty({}, 'value', { enumerable: true, get: boom }),
      });

      expect(entries[0]?.error).toBe(error);
      expect(entries[0]?.meta.requestId).toBe('req-1');
    });
  });

  it('respects a transport minimum level and isolates failing transports', () => {
    const { entries, transport } = memoryTransport('error');
    const broken: LogTransport = {
      name: 'broken',
      log: () => {
        throw new Error('transport down');
      },
    };
    const logger = createLogger({ level: 'debug', transports: [broken, transport] });

    logger.warn('ignored by memory transport');
    expect(() => {
      logger.error('still delivered');
    }).not.toThrow();
    expect(entries.map((entry) => entry.message)).toEqual(['still delivered']);
  });

  it('adds and removes transports at runtime', () => {
    const { entries, transport } = memoryTransport();
    const logger = createLogger({ level: 'debug' });
    const remove = logger.addTransport(transport);

    logger.info('one');
    remove();
    logger.info('two');

    expect(entries.map((entry) => entry.message)).toEqual(['one']);
  });

  it('uses the injected clock', () => {
    const { entries, transport } = memoryTransport();
    const now = vi.fn(() => new Date('2026-01-02T03:04:05.000Z'));
    createLogger({ level: 'debug', transports: [transport], now }).info('tick');
    expect(entries[0]?.timestamp).toBe('2026-01-02T03:04:05.000Z');
  });
});
