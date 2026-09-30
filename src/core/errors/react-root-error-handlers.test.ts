import { describe, expect, it, type MockInstance, vi } from 'vitest';

import { logger } from '@/core/logger';

import { reactRootErrorHandlers } from './react-root-error-handlers';

type LoggerMethod = typeof logger.error;

/** The call with `message`, asserted to carry exactly `{ error, componentStack }`. */
function expectLogged(
  spy: MockInstance<LoggerMethod>,
  message: string,
  error: Error,
  componentStack: string,
): void {
  const call = spy.mock.calls.find(([logged]) => logged === message);
  expect(call).toBeDefined();
  expect(call?.[1]).toStrictEqual({ error, componentStack });
  expect(call?.[1]?.error).toBe(error); // the same object, not a copy
}

describe('reactRootErrorHandlers', () => {
  it('forwards uncaught, caught and recoverable React errors to the logger', () => {
    const logError = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const logWarn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const info = { componentStack: '\n    at Widget' };
    const uncaught = new Error('a');
    const caught = new Error('b');
    const recoverable = new Error('c');

    reactRootErrorHandlers.onUncaughtError?.(uncaught, info);
    reactRootErrorHandlers.onCaughtError?.(caught, info);
    reactRootErrorHandlers.onRecoverableError?.(recoverable, info);

    expect(logError).toHaveBeenCalledTimes(2);
    expect(logWarn).toHaveBeenCalledTimes(1);
    expectLogged(logError, 'Uncaught React error', uncaught, info.componentStack);
    expectLogged(logError, 'React error caught by a boundary', caught, info.componentStack);
    expectLogged(logWarn, 'React recovered from an error', recoverable, info.componentStack);
  });
});
