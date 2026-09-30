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

/** A URL or path without its query string and fragment: queries often carry tokens (`?token=...`). */
const withoutQuery = (url: string | undefined): string | undefined => url?.replace(/[?#].*$/, '');

/** Installs the request/response interceptors (spec §6.1) on an Axios instance. */
export function installInterceptors(instance: AxiosInstance, deps: InterceptorDeps): void {
  instance.interceptors.request.use((config) => {
    config.headers.set('Accept-Language', deps.getLocale());
    if (!config.headers.has('X-Request-Id'))
      config.headers.set('X-Request-Id', deps.createRequestId());
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
        auth.onSessionExpired(); // still unauthorised after a successful refresh
        throw appError;
      }
      try {
        refreshing ??= auth.refresh().finally(() => {
          refreshing = null;
        });
        await refreshing;
      } catch {
        auth.onSessionExpired();
        throw appError;
      }
      return instance({ ...config, _retried: true });
    }

    if (appError.code !== 'CANCELLED') {
      const level = appError.status === 0 || appError.status >= 500 ? 'error' : 'warn';
      deps.logger[level]('HTTP request failed', {
        error: appError,
        requestId: appError.requestId,
        status: appError.status,
        code: appError.code,
        method: config?.method,
        url: withoutQuery(config?.url),
      });
    }
    if (!config?.silent && GLOBALLY_NOTIFIED.has(appError.code)) deps.notifyError(appError);
    throw appError;
  });
}
