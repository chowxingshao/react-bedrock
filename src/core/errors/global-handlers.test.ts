import { describe, expect, it, vi } from 'vitest';

import { logger } from '@/core/logger';

import { installGlobalErrorHandlers } from './global-handlers';

describe('installGlobalErrorHandlers', () => {
  it('forwards uncaught errors and unhandled rejections to the logger until uninstalled', () => {
    const logError = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const uninstall = installGlobalErrorHandlers();
    const boom = new Error('Boom');

    window.dispatchEvent(
      new ErrorEvent('error', {
        error: boom,
        message: 'Boom',
        filename: 'app.js',
        lineno: 1,
        colno: 2,
      }),
    );
    window.dispatchEvent(
      Object.assign(new Event('unhandledrejection'), { reason: new Error('Nope') }),
    );

    expect(logError).toHaveBeenCalledWith(
      'Boom',
      expect.objectContaining({ error: boom, source: 'app.js', line: 1 }),
    );
    expect(logError).toHaveBeenCalledWith(
      'Unhandled promise rejection',
      expect.objectContaining({ error: expect.any(Error) as unknown }),
    );

    uninstall();
    // Vitest turns an `error` event nobody listens to into an unhandled error (the run exits 1):
    // give this one a listener, which is also the proof that ours is gone.
    const observer = vi.fn();
    window.addEventListener('error', observer);
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('After'), message: 'After' }));
    window.removeEventListener('error', observer);

    expect(observer).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledTimes(2);
  });
});
