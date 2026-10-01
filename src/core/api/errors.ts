import { type AxiosError, isAxiosError, isCancel } from 'axios';
import { z } from 'zod';

import { i18n, translateKey } from '@/core/i18n';
import { safeString } from '@/lib/safe-string';

export const ERROR_CODES = [
  'NETWORK_ERROR',
  'TIMEOUT',
  'CANCELLED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'CONFLICT',
  'RATE_LIMITED',
  'SERVER_ERROR',
  'UNKNOWN',
] as const;
export type KnownErrorCode = (typeof ERROR_CODES)[number];

export interface AppErrorInit {
  code: string;
  /** Technical message, for logs. Show users `getErrorMessage(error)` instead. */
  message: string;
  /** HTTP status, or 0 when there was no response (network error, timeout, cancellation). */
  status: number;
  details?: Record<string, unknown>;
  requestId?: string;
  /** A message from a 4xx response, assumed user-facing and localised via Accept-Language. */
  userMessage?: string;
  cause?: unknown;
}

/** The single error type every API failure is normalised into (spec §6.1). */
export class AppError extends Error {
  override readonly name = 'AppError';
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;
  readonly userMessage?: string;

  constructor({ code, message, status, details, requestId, userMessage, cause }: AppErrorInit) {
    super(message, { cause });
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
    this.userMessage = userMessage;
  }
}

export function isAppError(value: unknown): value is AppError {
  try {
    return value instanceof AppError;
  } catch {
    // `instanceof` throws for a revoked proxy, which is not an AppError.
    return false;
  }
}

/** Assumed backend error body (owner decision 2). Adapt HERE if your backend differs. */
const errorBodySchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

function codeForStatus(status: number): KnownErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 400 || status === 422) return 'VALIDATION_ERROR';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN';
}

/**
 * Backend codes are UPPER_SNAKE_CASE. The code comes from the server, so only a code of that shape is
 * ever used inside a translation key: `constructor`, `toString` or `__proto__` would otherwise resolve
 * to inherited properties instead of translations.
 */
export const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

const asString = (value: unknown) =>
  typeof value === 'string' && value !== '' ? value : undefined;

function requestIdOf(error: AxiosError): string | undefined {
  return (
    asString(error.response?.headers['x-request-id']) ??
    asString(error.config?.headers.get('X-Request-Id'))
  );
}

/**
 * Normalises anything thrown by an API call into an AppError. Total: it never throws, whatever was
 * thrown. Anything can be thrown in JavaScript, and this runs in the last-resort error paths (the
 * query caches, the retry policy, the error screens), where a throw would hide the original error.
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  try {
    return classify(error);
  } catch {
    // A value that cannot even be inspected (a revoked proxy, a throwing getter or `toString`).
    return new AppError({
      code: 'UNKNOWN',
      message: safeString(error, 'Unrepresentable thrown value'),
      status: 0,
      cause: error,
    });
  }
}

function classify(error: unknown): AppError {
  if (isCancel(error)) {
    return new AppError({
      code: 'CANCELLED',
      message: 'Request cancelled',
      status: 0,
      cause: error,
    });
  }
  if (isAxiosError<unknown>(error)) {
    const requestId = requestIdOf(error);
    if (!error.response) {
      const code =
        error.code === 'ETIMEDOUT'
          ? 'TIMEOUT'
          : error.code === 'ECONNABORTED'
            ? 'CANCELLED'
            : 'NETWORK_ERROR';
      return new AppError({ code, message: error.message, status: 0, requestId, cause: error });
    }
    const { status, data } = error.response;
    const parsed = errorBodySchema.safeParse(data);
    const body = parsed.success ? parsed.data : {};
    return new AppError({
      code: body.code ?? codeForStatus(status),
      message: body.message ?? error.message,
      status,
      details: body.details,
      requestId,
      // A 5xx body is the server's technical text (`pg: connection refused`): logs only, never users.
      userMessage: status < 500 ? body.message : undefined,
      cause: error,
    });
  }
  const message = error instanceof Error ? error.message : safeString(error);
  return new AppError({ code: 'UNKNOWN', message, status: 0, cause: error });
}

/**
 * A translated, user-friendly message for any error (spec §6.1):
 * 1. a translation for the error code (`errors:codes.<CODE>`, UPPER_SNAKE_CASE; add keys for backend-specific codes),
 * 2. otherwise the server's own message for 4xx responses,
 * 3. otherwise a generic translated message. 5xx server messages are never shown.
 */
export function getErrorMessage(error: unknown): string {
  const appError = toAppError(error);
  const forCode = CODE_PATTERN.test(appError.code)
    ? translateKey(`errors:codes.${appError.code}`)
    : undefined;
  if (forCode) return forCode;
  const isClientError = appError.status >= 400 && appError.status < 500;
  if (isClientError && appError.userMessage) return appError.userMessage;
  return i18n.t(appError.status >= 500 ? 'errors:codes.SERVER_ERROR' : 'errors:codes.UNKNOWN');
}

/** Field-level validation messages, from `details.fields` (adapt here for other backend shapes). */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!isAppError(error)) return {};
  const fields = error.details?.fields;
  if (typeof fields !== 'object' || fields === null) return {};
  return Object.fromEntries(
    Object.entries(fields).flatMap(([name, value]: [string, unknown]) => {
      const message: unknown = Array.isArray(value) ? value[0] : value;
      return typeof message === 'string' && message !== '' ? [[name, message] as const] : [];
    }),
  );
}
