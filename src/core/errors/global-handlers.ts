import { logger } from '@/core/logger';

/**
 * Forwards errors that escape React (event handlers, timers, promises) to the logger (spec §7.3).
 * Returns a function that removes the listeners.
 */
export function installGlobalErrorHandlers(target: Window = window): () => void {
  const onError = (event: ErrorEvent) => {
    logger.error(event.message || 'Uncaught error', {
      error: event.error ?? event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    logger.error('Unhandled promise rejection', { error: event.reason });
  };

  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection);
  return () => {
    target.removeEventListener('error', onError);
    target.removeEventListener('unhandledrejection', onRejection);
  };
}
