import { describe, expect, it, vi } from 'vitest';

import type { LogEntry } from '../types';
import { createConsoleTransport } from './console';

const entry = (level: LogEntry['level']): LogEntry => ({
  level,
  message: 'Saved',
  timestamp: '2026-01-01T00:00:00.000Z',
  context: { id: 1 },
  meta: { appVersion: '1.0.0', gitSha: 'abc', environment: 'development', route: '/items' },
});

describe('console transport', () => {
  it('writes each level to the matching console method', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const transport = createConsoleTransport();

    transport.log(entry('warn'));
    transport.log(entry('error'));

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Saved'),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ id: 1, route: '/items' }),
    );
    expect(error).toHaveBeenCalledTimes(1);
  });
});
