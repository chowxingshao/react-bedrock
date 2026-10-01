import { type AxiosInstance, type InternalAxiosRequestConfig, isAxiosError } from 'axios';

import type { Logger } from '@/core/logger';

import type { HttpAuthAdapter } from './auth-bridge';
import { type AppError, toAppError } from './errors';

export interface InterceptorDeps {
  getLocale: () => string;
  createRequestId: () => string;
  getHttpAuth: () => HttpAuthAdapter | null;
  logger: Pick<Logger, 'debug' | 'error' | 'warn'>;
  /** A toast for errors every screen would otherwise have to handle itself (403, offline, timeout). */
  notifyError: (error: AppError) => void;
}

const GLOBALLY_NOTIFIED = new Set(['FORBIDDEN', 'NETWORK_ERROR', 'TIMEOUT']);

/**
 * A failure that says nothing about the session: no answer from the server (offline, timeout,
 * cancelled) or a server fault (5xx). When the refresh fails this way the session may well still be
 * valid, so it is kept; any other failure (the refresh was refused, or the adapter has a bug) expires it.
 */
const TRANSIENT_CODES = new Set(['NETWORK_ERROR', 'TIMEOUT', 'CANCELLED']);
const isTransient = (error: AppError) => TRANSIENT_CODES.has(error.code) || error.status >= 500;

/**
 * A URL or path cut at its first `?` or `#`: queries often carry tokens (`?token=...`). It cuts instead of
 * using a `.*` regex, because `.` does not match line breaks and a query can hold them (unencoded text).
 */
function withoutQuery(url: string | undefined): string | undefined {
  if (url === undefined) return undefined;
  const end = url.search(/[?#]/);
  return end === -1 ? url : url.slice(0, end);
}

/** What every log entry about a request carries. The URL has no query string or fragment. */
function requestContext(appError: AppError, config: InternalAxiosRequestConfig | undefined) {
  return {
    requestId: appError.requestId,
    status: appError.status,
    code: appError.code,
    method: config?.method,
    url: withoutQuery(config?.url),
  };
}

/** Installs the request/response interceptors (spec §6.1) on an Axios instance. */
export function installInterceptors(instance: AxiosInstance, deps: InterceptorDeps): void {
  // How many refreshes have completed. A request sent before the latest one carries the old session:
  // its 401 is expected and it only needs retrying, not another refresh.
  let refreshEpoch = 0;

  instance.interceptors.request.use((config) => {
    config.headers.set('Accept-Language', deps.getLocale());
    if (!config.headers.has('X-Request-Id'))
      config.headers.set('X-Request-Id', deps.createRequestId());
    config._refreshEpoch = refreshEpoch;
    const prepared = deps.getHttpAuth()?.prepareRequest(config) ?? config;
    deps.logger.debug(
      `HTTP ${(prepared.method ?? 'get').toUpperCase()} ${withoutQuery(prepared.url) ?? ''}`,
      {
        requestId: prepared.headers.get('X-Request-Id'),
      },
    );
    return prepared;
  });

  // One refresh in flight at a time, shared by every request that got a 401 meanwhile.
  let refreshing: Promise<void> | null = null;

  instance.interceptors.response.use(undefined, async (error: unknown) => {
    const appError = toAppError(error);
    const config: InternalAxiosRequestConfig | undefined = isAxiosError(error)
      ? error.config
      : undefined;
    const auth = deps.getHttpAuth();

    if (appError.status === 401 && config && auth && !config.skipAuthRefresh) {
      if (config._retried) {
        deps.logger.warn('HTTP request still unauthorised after refreshing the session', {
          error: appError,
          ...requestContext(appError, config),
        });
        auth.onSessionExpired(); // still unauthorised after a successful refresh
        throw appError;
      }
      try {
        if ((config._refreshEpoch ?? refreshEpoch) >= refreshEpoch) {
          refreshing ??= auth
            .refresh()
            .then(() => {
              refreshEpoch += 1;
            })
            .finally(() => {
              refreshing = null;
            });
        }
        await refreshing;
      } catch (refreshError) {
        // `toAppError`, never the raw error: an Axios error carries the request (URL query, body strings).
        const refreshAppError = toAppError(refreshError);
        deps.logger.warn('HTTP session refresh failed', {
          error: appError,
          ...requestContext(appError, config),
          refreshError: refreshAppError,
        });
        if (isTransient(refreshAppError)) {
          // A network blip or a server fault is not an answer about the session: keep it, and tell the
          // caller why the request failed.
          if (!config.silent && GLOBALLY_NOTIFIED.has(refreshAppError.code))
            deps.notifyError(refreshAppError);
          throw refreshAppError;
        }
        auth.onSessionExpired();
        throw appError;
      }
      deps.logger.debug(
        'HTTP request unauthorised, retrying after refreshing the session',
        requestContext(appError, config),
      );
      return instance({ ...config, _retried: true });
    }

    if (appError.code !== 'CANCELLED') {
      const level = appError.status === 0 || appError.status >= 500 ? 'error' : 'warn';
      deps.logger[level]('HTTP request failed', {
        error: appError,
        ...requestContext(appError, config),
      });
    }
    if (!config?.silent && GLOBALLY_NOTIFIED.has(appError.code)) deps.notifyError(appError);
    throw appError;
  });
}
