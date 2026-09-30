import { APP_VERSION, GIT_SHA } from '@/config/constants';
import { env, type LogLevel } from '@/config/env';

import { createRedactor } from './redact';
import type { LogContext, LogEntry, Logger, LogTransport } from './types';

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface LoggerOptions {
  /** Entries below this level are dropped. */
  level: LogLevel;
  transports?: LogTransport[];
  redactKeys?: readonly string[];
  /** The current route (default: `window.location.pathname`). */
  getRoute?: () => string;
  now?: () => Date;
}

function tryRead(source: LogContext, key: string): unknown {
  try {
    return source[key];
  } catch {
    return undefined;
  }
}

export function createLogger(options: LoggerOptions): Logger {
  const transports = new Set<LogTransport>(options.transports ?? []);
  const redact = createRedactor(options.redactKeys);
  const getRoute = options.getRoute ?? (() => window.location.pathname);
  const now = options.now ?? (() => new Date());
  // The highest severity at which each error object was reported.
  const reportedErrors = new WeakMap<object, number>();
  let userId: string | undefined;

  /**
   * Splits `requestId` and `error` off the caller's context and redacts the rest. The logger runs
   * inside error handlers, so a throwing getter or proxy in the context (or a redaction failure)
   * must not make it throw: the entry is logged with a placeholder context instead.
   */
  function readContext(context: LogContext) {
    try {
      const { requestId, ...rest } = context;
      return { requestId, error: rest.error, redacted: redact(rest) as LogContext };
    } catch {
      return {
        requestId: tryRead(context, 'requestId'),
        error: tryRead(context, 'error'),
        redacted: { '[unserialisable context]': true } as LogContext,
      };
    }
  }

  function emit(level: LogLevel, message: string, context: LogContext = {}): void {
    if (LEVEL_RANK[level] < LEVEL_RANK[options.level]) return;

    const { requestId, error, redacted } = readContext(context);
    if (typeof error === 'object' && error !== null) {
      // The same error can reach several reporters (boundary, root callbacks, global handlers).
      // Drop a repeat at the same or a lower severity; a later, higher-severity report still goes
      // through, so a warned error that then crashes a view reaches Sentry as an exception.
      const reportedAt = reportedErrors.get(error);
      if (reportedAt !== undefined && reportedAt >= LEVEL_RANK[level]) return;
      reportedErrors.set(error, LEVEL_RANK[level]);
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: now().toISOString(),
      context: redacted,
      error,
      meta: {
        appVersion: APP_VERSION,
        gitSha: GIT_SHA,
        environment: env.VITE_APP_ENV,
        route: getRoute(),
        userId,
        requestId: typeof requestId === 'string' ? requestId : undefined,
      },
    };

    for (const transport of transports) {
      if (transport.minLevel && LEVEL_RANK[level] < LEVEL_RANK[transport.minLevel]) continue;
      try {
        transport.log(entry);
      } catch {
        // A failing transport must never break the app or the other transports.
      }
    }
  }

  return {
    debug: (message, context) => {
      emit('debug', message, context);
    },
    info: (message, context) => {
      emit('info', message, context);
    },
    warn: (message, context) => {
      emit('warn', message, context);
    },
    error: (message, context) => {
      emit('error', message, context);
    },
    addTransport(transport) {
      transports.add(transport);
      return () => {
        transports.delete(transport);
      };
    },
    setUser(id) {
      userId = id ?? undefined;
    },
  };
}
