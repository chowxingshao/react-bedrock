import { APP_VERSION, GIT_SHA } from '@/config/constants';
import { env } from '@/config/env';

import { createLogger } from './logger';
import { createConsoleTransport } from './transports/console';
import { createSentryTransport } from './transports/sentry';
import type { LogTransport } from './types';

export { createLogger, type LoggerOptions } from './logger';
export { createRedactor, DEFAULT_REDACT_KEYS } from './redact';
export type { LogContext, LogEntry, Logger, LogLevel, LogTransport } from './types';

function defaultTransports(): LogTransport[] {
  if (env.isTest) return []; // tests attach their own transports
  const transports: LogTransport[] = [
    createConsoleTransport({ minLevel: env.isDev ? undefined : 'error' }),
  ];
  if (env.VITE_SENTRY_DSN) {
    transports.push(
      createSentryTransport({
        dsn: env.VITE_SENTRY_DSN,
        environment: env.VITE_APP_ENV,
        release: `${APP_VERSION}+${GIT_SHA}`,
      }),
    );
  }
  return transports;
}

/** The app logger (spec §7.4). Use it instead of console.* (ESLint enforces this). */
export const logger = createLogger({ level: env.VITE_LOG_LEVEL, transports: defaultTransports() });
