import type { AppEnvironment, LogLevel } from '@/config/env';

export type { LogLevel } from '@/config/env';

/** Extra structured data for a log entry. Sensitive keys are redacted automatically. */
export type LogContext = Record<string, unknown>;

export interface LogEntry {
  level: LogLevel;
  message: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** The caller's context, with sensitive keys redacted and errors serialised. */
  context: LogContext;
  /** The raw thrown value from `context.error`, for transports that capture exceptions. */
  error?: unknown;
  /** Attached automatically (spec §7.4). `userId` is an id only, never personal data. */
  meta: {
    appVersion: string;
    gitSha: string;
    environment: AppEnvironment;
    route: string;
    userId?: string;
    requestId?: string;
  };
}

export interface LogTransport {
  readonly name: string;
  /** The minimum level this transport receives. Defaults to every level the logger lets through. */
  readonly minLevel?: LogLevel;
  log(entry: LogEntry): void;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  /** Adds a transport; returns a function that removes it. */
  addTransport(transport: LogTransport): () => void;
  /** Sets the user id attached to later entries (`null` after logout). */
  setUser(userId: string | null): void;
}
