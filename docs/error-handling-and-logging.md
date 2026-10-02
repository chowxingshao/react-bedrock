# Error handling and logging

How errors are caught, what the user sees, and where they are logged.

## Error flow

| Where the error happens                   | Who catches it                                    | What the user sees                                                                         | Logged by                                                                                                         |
| ----------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Rendering a page, or any suspense subtree | `AsyncBoundary` (`PageBoundary` in the app shell) | `ErrorState` with **Try again** (resets failed queries); in the shell also **Reload page** | root `onCaughtError`                                                                                              |
| Loading or routing a page                 | The page group's `errorElement` (`RouteError`)    | Route error page with **Reload page**, the app shell still usable                          | `RouteError` (`Route error`)                                                                                      |
| Rendering anywhere else                   | `AppErrorBoundary` (outermost, in `App.tsx`)      | Full-page `ErrorState` with **Try again** and **Reload page**                              | root `onCaughtError` (the boundary's own `onError` logs only when the root has no callbacks, e.g. in tests)       |
| Event handlers, timers, promises          | `installGlobalErrorHandlers()` (`main.tsx`)       | Nothing; the flow continues                                                                | `window` `error` / `unhandledrejection` listeners                                                                 |
| API calls                                 | the HTTP interceptors → `AppError`                | `QueryState` for queries; toasts for 403, offline and timeout, and for failed mutations    | the HTTP interceptor, with the request id; the query and mutation caches log errors that did not come from `http` |

- **Page errors and router errors are caught by different boundaries.** In the app shell, `PageBoundary` (docs/routing.md) catches what a page throws while it renders, a failed `useSuspenseQuery` included, and offers **Try again**. The router's `errorElement` (`RouteError`) catches what only the router sees: a page chunk that fails to load (stale after a deploy), a thrown `Response` and a loader or action error. That is a loading failure, not something to retry in place, so it offers **Reload page** only.
- **The root callbacks** (`reactRootErrorHandlers`, passed to `createRoot` in `main.tsx`) log what React reports: an error caught by any boundary (`React error caught by a boundary`), an error no boundary caught (`Uncaught React error`) and an error React recovered from by itself (`React recovered from an error`, a warning).
- **An API error is logged where it is normalised.** The interceptors in `@/core/api` (docs/data-fetching.md) turn every failure into an `AppError` and log it with the request id: a warning for 4xx, an error for network errors, timeouts and 5xx; a cancelled request is not logged. The URL is logged without its query string and fragment, since queries often carry tokens. The request flag `{ silent: true }` only skips the toast; it does not silence logging. A failure that did not come from `http` (say a `TypeError` in a `queryFn`) is logged by the query or mutation cache instead, as `Query failed` or `Mutation failed`: an error when what was thrown is not an `AppError` (so production sees it), a warning for an `AppError`; a cancelled request is not logged. The query option `meta: { silent: true }` skips the query cache's entry (docs/data-fetching.md); the mutation option `meta: { silent: true }` skips only the toast, and the mutation cache always logs. For an HTTP error the interceptor has already logged it, and the caches' own entry is dropped as a duplicate.
- **A render error is logged once.** React runs the root `onCaughtError` before the boundary's `componentDidCatch`, and the logger drops a repeat report of the same error object, so an `onError` that also logs is safe to add (for a thrown `Error` or other object; thrown primitives are not de-duplicated and would be logged twice).

**Fail loudly in dev, gracefully in prod** (spec Principle 7): in development, `ErrorState` shows the stack and the error's properties under **Technical details**. In production it shows only the translated, friendly message.

## Error boundaries

`ErrorBoundary` (`@/core/errors`) catches render errors in its subtree and renders a fallback:

```tsx
<ErrorBoundary
  fallback={({ error, reset }) => <ErrorState error={error} onRetry={reset} />}
  onError={(error, info) => {
    logger.error('Render error', { error, componentStack: info.componentStack });
  }}
  resetKeys={[useLocation().pathname]} // useLocation comes from react-router
>
  {children}
</ErrorBoundary>
```

- `reset()` clears the error and renders the children again.
- `resetKeys` does the same automatically when a key changes, for example on navigation. Auto-reset clears only an error that was already showing before the key change; an error thrown by the same render is kept.
- `AppErrorBoundary` is the app-root boundary: `App.tsx` already wraps everything in it, so you don't add another. Its fallback is a full-page `ErrorState` with **Try again** and **Reload page**.
- For data fetched with suspense, use `AsyncBoundary`, which also resets failed queries (docs/data-fetching.md).

`describeError(error)` (`@/lib/describe-error`) builds the text `ErrorState` shows under **Technical details** in development: for an `Error`, its stack (with a `name: message` header when the engine's stack lists frames only) followed by its extra own properties as JSON, then one `Caused by: name: message (code, status)` line when the error has a `cause`; a string as is; anything else as JSON. The cause is always a one-line summary: a cause such as an Axios error carries the request (body, URL query, credentials), which is never printed. `describeError` and `toAppError` never throw, whatever was thrown (an object without a prototype, a revoked proxy, a throwing getter or `toString`): they run while an error is being shown, retried or logged, where a throw would hide the original error.

## Logging (`@/core/logger`)

```ts
import { logger } from '@/core/logger';

logger.debug('Cache warmed', { entries: 12 });
logger.info('Item saved', { itemId });
logger.warn('Slow response', { durationMs, requestId });
logger.error('Payment failed', { error, requestId }); // pass the thrown value as `error`
```

- **Levels:** `debug < info < warn < error`. The threshold is `VITE_LOG_LEVEL`, defaulting to `debug` in development and `warn` in production builds.
- **Context attached automatically:** app version, git SHA, environment, current route, the current user **id** (call `logger.setUser(id)` on sign-in and `logger.setUser(null)` on sign-out; `AuthProvider` does it; never names or emails), and `requestId` when you pass one.
- **Redaction:** keys containing `password`, `token`, `authorization`, `cookie`, `secret` or `apiKey` (in any case, with or without `-`/`_`) are replaced with `[REDACTED]` at any depth. The exported `logger` is configured in `src/core/logger/index.ts`: pass `redactKeys` there to change the list. `createLogger({ redactKeys })` builds a separate logger with its own list. A list you pass **replaces** the defaults rather than adding to them, so extend them: `redactKeys: [...DEFAULT_REDACT_KEYS, 'ssn']` (`DEFAULT_REDACT_KEYS` is exported from `@/core/logger`). An error's `cause` is logged as a summary only (`name`, `message`, `code`, `status`), never copied whole: a cause such as an Axios error holds the request body as a string and the URL query, and key-based redaction can't see inside those.
- **De-duplication:** per error object and severity. The same error object reaches the logger once per severity, even if a boundary, a React root callback and a global handler all see it: an error already reported at the same or a higher severity is not reported again, while a later report at a higher severity (a warning, then a boundary catching the same object) still goes through.
- **Serialising entries:** a transport that serialises an entry must use `entry.context`, which is redacted, and never `entry.error`, which is the raw thrown value. Don't log DOM nodes or events; they serialise to very large or circular structures.
- **A bad context doesn't make logging throw.** If the context can't be read or redacted (a getter or proxy that throws), the entry is still logged with the context `{ '[unserialisable context]': true }`, keeping `error` and `requestId` when they can be read.

### Transports

| Transport | When                                              | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Console   | Development: all levels. Production: errors only. | Pretty, coloured output                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Sentry    | Only when `VITE_SENTRY_DSN` is set                | Errors are captured and warnings become breadcrumbs. Cookies, headers, request bodies and IP addresses are **not** collected; `beforeSend` and `beforeBreadcrumb` (`transports/sentry.ts`) strip the query string and fragment from page and request URLs and drop console breadcrumbs. The only user info sent is the id passed to `logger.setUser`. The SDK loads in its own chunk at startup, without blocking it. It is enabled by the DSN, not by production mode. |

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

To report Core Web Vitals, add the `web-vitals` package and log each metric with `logger.info('web-vital', { name, value, rating })` behind a production check. In production that `info` entry is dropped: the level threshold defaults to `warn`, the console transport prints errors only and Sentry takes `warn` and above, so no shipped transport accepts it. Add a custom transport with `minLevel: 'info'` (like the `http` one above) and set `VITE_LOG_LEVEL=info`. The template doesn't ship it, so weigh the extra dependency first.

## User feedback: toasts and confirmations (`@/core/notify`)

```ts
import { getErrorMessage } from '@/core/api';
import { notify, useConfirm } from '@/core/notify';

notify.success(t('items:toast.created'));
notify.error(getErrorMessage(error)); // a translated, user-friendly message for any thrown value
await notify.promise(save(), { loading: t('…saving'), success: t('…saved'), error: t('…failed') });

const confirm = useConfirm();
if (await confirm({ title: t('items:delete.title'), destructive: true })) remove(id);
```

- `getErrorMessage(error)` (`@/core/api`) picks the text in this order: the translation `errors:codes.<CODE>` (codes are UPPER_SNAKE_CASE; add a key to every locale for each backend-specific code), then the server's own message for a 4xx response, then a generic translated message. The message of a 5xx response is never shown. A code that isn't UPPER_SNAKE_CASE is never used as a translation key, because the code comes from the server.
- `<Toaster />` is mounted once in `src/app/providers.tsx` and styled with design tokens. Don't mount another.
- **De-duplication:** an identical toast (same kind and text) fired again within 2 s is dropped, and a repeat updates the visible toast rather than stacking. So 20 parallel requests failing offline produce one "offline" toast.
- `useConfirm()` returns a promise that resolves `true` or `false`. Escape and Cancel both resolve `false`. Only one confirmation is open at a time. When it closes, focus goes back to the element that was focused when you called `confirm()`, unless your code, or a navigation it triggers, has already moved focus to another element, which is then left alone; if confirming removes that element (a deleted table row, say), move focus somewhere sensible yourself.
- Never import `sonner` directly (ESLint enforces this).
