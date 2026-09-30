import type { Breadcrumb, ErrorEvent } from '@sentry/react';

import type { LogEntry, LogTransport } from '../types';
import type * as SentrySdk from './sentry-sdk';
import { stripUrl } from './strip-url';

export interface SentryTransportOptions {
  dsn: string;
  environment: string;
  release: string;
}

type Sdk = typeof SentrySdk;

// `dataCollection` does not gate URLs or console output: Sentry puts `location.href` on every event,
// records navigation and request URLs in breadcrumbs, and copies raw console arguments into console
// breadcrumbs. Reset-password, invite and OAuth tokens often sit in a query string or fragment.

/** Keeps the page URL in an event, without its query string or fragment. */
function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    if (event.request.url) event.request.url = stripUrl(event.request.url);
    delete event.request.query_string;
  }
  if (event.transaction) event.transaction = stripUrl(event.transaction);
  return event;
}

const URL_DATA_KEYS = ['url', 'from', 'to'] as const;

/** Drops console breadcrumbs and strips query strings and fragments from the URLs in the others. */
function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === 'console') return null; // the logger sends its own warnings and errors
  const { data } = breadcrumb;
  if (!data) return breadcrumb;
  const scrubbed: Record<string, unknown> = { ...data };
  for (const key of URL_DATA_KEYS) {
    const value = scrubbed[key];
    if (typeof value === 'string') scrubbed[key] = stripUrl(value);
  }
  return { ...breadcrumb, data: scrubbed };
}

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
 * The SDK lives in its own chunk, which the browser fetches at startup without blocking it (it is not
 * loaded on demand): it stays out of the main bundle, and entries logged before it arrives are queued.
 */
export function createSentryTransport({
  dsn,
  environment,
  release,
}: SentryTransportOptions): LogTransport {
  let sdk: Sdk | undefined;
  const queue: LogEntry[] = [];

  void import('./sentry-sdk')
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
        beforeSend: scrubEvent,
        beforeBreadcrumb: scrubBreadcrumb,
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
