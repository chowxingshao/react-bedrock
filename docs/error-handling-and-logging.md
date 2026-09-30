# Error handling and logging

## Error boundaries

`ErrorBoundary` (`@/core/errors`) catches render errors in its subtree and renders a fallback:

```tsx
<ErrorBoundary
  fallback={({ error, reset }) => <ErrorState error={error} onRetry={reset} />}
  onError={(error, info) => {
    /* report */
  }}
  resetKeys={[location.pathname]}
>
  {children}
</ErrorBoundary>
```

- `reset()` clears the error and renders the children again.
- `resetKeys` does the same automatically when a key changes, for example on navigation.
- For data fetched with suspense, use `AsyncBoundary`, which also resets failed queries (docs/data-fetching.md).

## Logging (`@/core/logger`)

```ts
import { logger } from '@/core/logger';

logger.debug('Cache warmed', { entries: 12 });
logger.info('Item saved', { itemId });
logger.warn('Slow response', { durationMs, requestId });
logger.error('Payment failed', { error, requestId }); // pass the thrown value as `error`
```

- **Levels:** `debug < info < warn < error`. The threshold is `VITE_LOG_LEVEL`, defaulting to `debug` in development and `warn` in production builds.
- **Context attached automatically:** app version, git SHA, environment, current route, the current user **id** (set with `logger.setUser(id)` by the auth layer; never names or emails), and `requestId` when you pass one.
- **Redaction:** keys containing `password`, `token`, `authorization`, `cookie`, `secret` or `apiKey` (in any case, with or without `-`/`_`) are replaced with `[REDACTED]` at any depth. The exported `logger` is configured in `src/core/logger/index.ts`: change the list there. `createLogger({ redactKeys })` builds a separate logger with its own list.
- **De-duplication:** per error object and severity. The same error object reaches the logger once per severity, even if a boundary, a React root callback and a global handler all see it: an error already reported at the same or a higher severity is not reported again, while a later report at a higher severity (a warning, then a boundary catching the same object) still goes through.
- **Serialising entries:** a transport that serialises an entry must use `entry.context`, which is redacted, and never `entry.error`, which is the raw thrown value. Don't log DOM nodes or events; they serialise to very large or circular structures.

### Transports

| Transport | When                                              | What                                                                                                                                                                                                           |
| --------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Console   | Development: all levels. Production: errors only. | Pretty, coloured output                                                                                                                                                                                        |
| Sentry    | Only when `VITE_SENTRY_DSN` is set                | Errors are captured and warnings become breadcrumbs. The SDK is lazy-loaded, and cookies, headers, bodies, query params and user info are **not** collected. It is enabled by the DSN, not by production mode. |

In tests the exported `logger` has no transports; attach your own with `logger.addTransport`.

Add your own, for example a backend log endpoint:

```ts
logger.addTransport({
  name: 'http',
  minLevel: 'error',
  log: (entry) =>
    navigator.sendBeacon(
      '/api/logs',
      JSON.stringify({ message: entry.message, context: entry.context, meta: entry.meta }),
    ),
});
```

### Web Vitals (optional, not wired)

To report Core Web Vitals, add the `web-vitals` package and log each metric with `logger.info('web-vital', { name, value, rating })` behind a production check. The template doesn't ship it, so weigh the extra dependency first.
