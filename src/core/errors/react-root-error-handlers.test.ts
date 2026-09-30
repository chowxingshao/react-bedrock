import { describe, expect, it, vi } from 'vitest';

import { logger } from '@/core/logger';

import { reactRootErrorHandlers } from './react-root-error-handlers';

describe('reactRootErrorHandlers', () => {
  it('forwards uncaught, caught and recoverable React errors to the logger', () => {
    const logError = vi.spyOn(logger, 'error');
    const logWarn = vi.spyOn(logger, 'warn');
    const info = { componentStack: '\n    at Widget' };

    reactRootErrorHandlers.onUncaughtError?.(new Error('a'), info);
    reactRootErrorHandlers.onCaughtError?.(new Error('b'), info);
    reactRootErrorHandlers.onRecoverableError?.(new Error('c'), info);

    expect(logError).toHaveBeenCalledWith(
      'Uncaught React error',
      expect.objectContaining({ componentStack: info.componentStack }),
    );
    expect(logError).toHaveBeenCalledWith('React error caught by a boundary', expect.anything());
    expect(logWarn).toHaveBeenCalledWith('React recovered from an error', expect.anything());
  });
});
