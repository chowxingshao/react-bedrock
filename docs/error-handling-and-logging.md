# Error handling and logging

How errors are caught, what the user sees, and where they are logged.

## Error flow

| Where the error happens          | Who catches it                                        | What the user sees                                            | Logged by                                                                                                   |
| -------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Rendering inside a route         | The route's `errorElement` (planned, with the router) | Route error page, with the app shell still usable             | root `onCaughtError`                                                                                        |
| Rendering in a suspense subtree  | `AsyncBoundary`                                       | `ErrorState` with **Try again** (resets failed queries)       | root `onCaughtError`                                                                                        |
| Rendering anywhere else          | `AppErrorBoundary` (outermost, in `App.tsx`)          | Full-page `ErrorState` with **Try again** and **Reload page** | root `onCaughtError` (the boundary's own `onError` logs only when the root has no callbacks, e.g. in tests) |
| Event handlers, timers, promises | `installGlobalErrorHandlers()` (`main.tsx`)           | Nothing; the flow continues                                   | `window` `error` / `unhandledrejection` listeners                                                           |
| API calls                        | the HTTP interceptors → `AppError` (planned)          | `QueryState` / toasts (planned)                               | the query and mutation caches (planned)                                                                     |

- **The root callbacks** (`reactRootErrorHandlers`, passed to `createRoot` in `main.tsx`) log what React reports: an error caught by any boundary (`React error caught by a boundary`), an error no boundary caught (`Uncaught React error`) and an error React recovered from by itself (`React recovered from an error`, a warning).
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
  resetKeys={[useLocation().pathname]} // useLocation comes from react-router, which arrives with the router
>
  {children}
</ErrorBoundary>
```

- `reset()` clears the error and renders the children again.
- `resetKeys` does the same automatically when a key changes, for example on navigation. Auto-reset clears only an error that was already showing before the key change; an error thrown by the same render is kept.
- `AppErrorBoundary` is the app-root boundary: `App.tsx` already wraps everything in it, so you don't add another. Its fallback is a full-page `ErrorState` with **Try again** and **Reload page**.
- For data fetched with suspense, use `AsyncBoundary`, which also resets failed queries (docs/data-fetching.md).

`describeError(error)` (`@/lib/describe-error`) builds the text `ErrorState` shows under **Technical details** in development: for an `Error`, its stack (with a `name: message` header when the engine's stack lists frames only) followed by its extra own properties as JSON; a string as is; anything else as JSON.

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

## User feedback: toasts and confirmations (`@/core/notify`)

```ts
import { notify, useConfirm } from '@/core/notify';

notify.success(t('items:toast.created'));
notify.error(getErrorMessage(error));
await notify.promise(save(), { loading: t('…saving'), success: t('…saved'), error: t('…failed') });

const confirm = useConfirm();
if (await confirm({ title: t('items:delete.title'), destructive: true })) remove(id);
```

- `<Toaster />` is mounted once in `src/app/providers.tsx` and styled with design tokens. Don't mount another.
- **De-duplication:** an identical toast (same kind and text) fired again within 2 s is dropped, and a repeat updates the visible toast rather than stacking. So 20 parallel requests failing offline produce one "offline" toast.
- `useConfirm()` returns a promise that resolves `true` or `false`. Escape and Cancel both resolve `false`. Only one confirmation is open at a time.
- Never import `sonner` directly (ESLint enforces this).
