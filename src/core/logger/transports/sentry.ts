import type * as SentrySdk from '@sentry/react';

import type { LogEntry, LogTransport } from '../types';

export interface SentryTransportOptions {
  dsn: string;
  environment: string;
  release: string;
}

type Sdk = typeof SentrySdk;

function send(sdk: Sdk, entry: LogEntry): void {
  if (entry.level === 'warn') {
    sdk.addBreadcrumb({ level: 'warning', message: entry.message, data: entry.context });
    return;
  }
  sdk.withScope((scope) => {
    scope.setTag('route', entry.meta.route);
    if (entry.meta.requestId) scope.setTag('request_id', entry.meta.requestId);
    if (entry.meta.userId) scope.setUser({ id: entry.meta.userId }); // an id only, never personal data
    scope.setExtras(entry.context);
    if (entry.error instanceof Error) sdk.captureException(entry.error);
    else sdk.captureMessage(entry.message, 'error');
  });
}

/**
 * Sends warnings (as breadcrumbs) and errors to Sentry (spec §7.4). Registered only when VITE_SENTRY_DSN is set.
 * The SDK is loaded on demand, so it stays out of the main bundle; entries logged before it loads are queued.
 */
export function createSentryTransport({
  dsn,
  environment,
  release,
}: SentryTransportOptions): LogTransport {
  let sdk: Sdk | undefined;
  const queue: LogEntry[] = [];

  void import('@sentry/react')
    .then((module) => {
      module.init({
        dsn,
        environment,
        release,
        // Sentry 11 collects request data by default: this template sends none of it.
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: false,
          httpBodies: [],
          urlQueryParams: false,
        },
      });
      sdk = module;
      for (const entry of queue.splice(0)) send(module, entry);
    })
    .catch(() => {
      // Blocked or offline: monitoring is best-effort and must never break the app.
    });

  return {
    name: 'sentry',
    minLevel: 'warn',
    log(entry) {
      if (sdk) send(sdk, entry);
      else queue.push(entry);
    },
  };
}
