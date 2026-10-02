# Data fetching

## HTTP client (`@/core/api`)

There is **one** Axios instance: `http`. Hand-written services and Orval-generated hooks both use it, so every call gets the same behaviour. Never import `axios` directly (ESLint enforces this).

```ts
import { http } from '@/core/api';

export async function getItem(id: string, signal?: AbortSignal) {
  const { data } = await http.get<Item>(`/items/${id}`, { signal }); // TanStack Query passes `signal` for cancellation
  return data;
}
```

Pass paths relative to the API base (`/items/1`). `http` sets `allowAbsoluteUrls: false`, so an absolute or `//host` URL is appended to the base instead of being called: the headers and credentials of this client never reach another origin.

| Interceptor       | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request           | Sets `Accept-Language` (current locale) and `X-Request-Id` (a UUID for tracing), logs at debug level, and lets the auth layer (`AuthProvider` registers its adapter when it mounts) add credentials                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 401               | With the auth adapter registered (`AuthProvider` does it): calls the adapter's `refresh()` **once**, even for concurrent requests, then retries each request once. If the refresh is refused (a 401, 403 or other 4xx) or the adapter fails, the adapter's `onSessionExpired` runs (the session is cleared and the guards redirect to login). If the refresh fails for a transient reason (offline, timeout, cancelled or a 5xx), the session is **kept** and the request fails with that error instead (with the usual connectivity toast unless the request is `silent`). Without a registered adapter, a 401 is logged and rejected like any other error. A request sent before the latest refresh finished is retried without refreshing again. |
| 403               | A response with code `FORBIDDEN` (a 403) shows a "no permission" toast                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Offline / timeout | Shows a connectivity toast (de-duplicated)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Every failure     | Rejects with an `AppError` `{ code, message, status, details?, requestId?, userMessage? }` and logs it with the request id. `userMessage` is the server's own message, set for 4xx responses only: a 5xx body is technical text and stays in `message` (logs)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Per-request flags: `{ skipAuthRefresh: true }` (for the login, logout and refresh calls of the auth layer) and `{ silent: true }` (no global toast; it does not silence logging).

Requests time out after `HTTP_TIMEOUT_MS` (30 s, `src/config/constants.ts`) with code `TIMEOUT`; pass `{ timeout }` to change it for one call. Cancelling through an `AbortSignal` rejects with code `CANCELLED` and is not logged.

**Logged URLs carry no query string or fragment:** queries often hold tokens or personal data (`?token=…`), so the interceptor logs `/lookup`, never `/lookup?token=…`. It does not log request `params`, headers or bodies either. Still keep secrets out of URLs: browsers, proxies and servers record them.

**Errors for users:** `getErrorMessage(error)` returns a translated message. Add `errors:codes.<YOUR_CODE>` to the locale files to translate backend-specific error codes; server codes must be UPPER_SNAKE_CASE, any other code is never used as a translation key.

**Cross-origin APIs:** `X-Request-Id` is a custom header, so browsers send a CORS preflight. The backend must allow it (`Access-Control-Allow-Headers: X-Request-Id, Accept-Language, Content-Type`) and may expose `X-Request-Id` in its responses. The same-origin `/api` proxy of the Docker setup (planned) avoids all of this.

## Server state with TanStack Query

All API data goes through TanStack Query (spec Principle 3). The client (`src/core/api/query-client.ts`) sets:

| Setting                | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `staleTime`            | 30 s (`QUERY_STALE_TIME_MS`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Query retries          | 1, but none for 4xx responses and none for a cancelled request                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Mutation retries       | 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `refetchOnWindowFocus` | off. It is a default of the `queryClient` export: change it in `src/core/api/query-client.ts`, or build your own client with `createQueryClient({ refetchOnWindowFocus: true })`; a single query can also set the option itself                                                                                                                                                                                                                                                                                                                                                                                   |
| Failed query           | Logged. An error that came from `http` is logged by the HTTP interceptor with the request id (a warning for 4xx, an error for network errors, timeouts and 5xx). Any other failure is logged by the query cache as `Query failed`, with the query key: as an **error** when what was thrown is not an `AppError` (a `TypeError`, a `ZodError`, a raw Axios error: unexpected, so production sees it), as a warning for an `AppError` thrown by your own code. A cancelled request is neither logged nor retried. `meta: { silent: true }` skips the query-cache log only, so it does not silence the interceptor. |
| Failed mutation        | Logged the same way (`Mutation failed`), **and toasted**; a cancelled mutation is neither. `meta: { silent: true }` skips the toast only: add it when you handle the error yourself, e.g. when mapping field errors with `applyServerErrors`. The failure is still logged, and the interceptor still toasts a 403, an offline or a timeout error (the request flag `{ silent: true }` skips that toast, see above).                                                                                                                                                                                               |
| Errors                 | Typed as `AppError` everywhere (`Register.defaultError`). That is only a type: the caches normalise whatever was thrown with `toAppError` before they classify, log or toast it. Services built on `http` already throw an `AppError`; in any other `queryFn` or `mutationFn`, throw `toAppError(error)` so that your own `onError` handlers and `error` values match the type.                                                                                                                                                                                                                                   |

React Query Devtools appear in development only (bottom-left button); they are not part of the production bundle.

### Query keys: one factory per feature

```ts
export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (filters: ItemFilters) => [...itemKeys.lists(), filters] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
};
```

Invalidate broadly (`itemKeys.lists()`) after mutations. The reference feature (`src/features/example`) shows the full pattern: the key factory, `queryOptions` (`itemListQuery` keeps the previous page on screen while the next one loads), create and update mutations that seed the detail cache and invalidate the lists, and an optimistic delete (`useDeleteItem`) that cancels list fetches, removes the item from every cached list, puts the lists back if the server refuses, and refetches when it settles. An open detail page is only marked stale after its item is deleted, not refetched: that would be a 404.

## Rendering async state: `QueryState`

Every async view handles loading, empty, error and success (spec Principle 4). `QueryState` does it for you:

```tsx
<QueryState
  query={itemsQuery}
  loading={<TableSkeleton rows={10} />}
  empty={<EmptyState title={t('items:list.empty')} />}
  isEmpty={(data) => data.items.length === 0}
>
  {(data) => <ItemsTable data={data.items} />}
</QueryState>
```

- **Minimal usage:** `<QueryState query={q}>{(data) => …}</QueryState>`. Every slot has a default:

  | Slot    | Default                                             |
  | ------- | --------------------------------------------------- |
  | loading | `PageLoader`                                        |
  | empty   | `EmptyState` (used for `null` and `[]`)             |
  | error   | `ErrorState` with **Try again** → `query.refetch()` |

- **No skeleton flash:** loading UI appears only after 200 ms (`SKELETON_DELAY_MS`), so fast responses never flash a skeleton.
- **Cached data wins:** if a background refetch fails while data is cached, the cached data stays on screen and the failure is logged: a warning for a 4xx, an error for network errors, timeouts and 5xx (in production the console shows errors only, and Sentry gets a breadcrumb for each warning).
- **Custom error slot:** pass `error={(err, retry) => …}` to take over the error view.

## Suspense style: `AsyncBoundary`

For `useSuspenseQuery` (or lazy components), wrap the subtree once:

```tsx
<AsyncBoundary loading={<DetailSkeleton />}>
  <ItemDetails id={id} /> {/* calls useSuspenseQuery inside */}
</AsyncBoundary>
```

`AsyncBoundary` combines `Suspense`, an error boundary and TanStack Query's `QueryErrorResetBoundary`, so **Try again** also refetches the failed queries. Use `resetKeys={[id]}` to clear the error automatically when the input changes.

The `Suspense` fallback waits `SUSPENSE_FALLBACK_DELAY_MS` (350 ms) before it appears. That is longer than the 200 ms of `QueryState` because React holds a Suspense reveal for about 300 ms after the fallback mounts, so a shorter delay would still flash the loader on fast responses. A custom `loading` node is delayed the same way, and `loading={null}` renders nothing while suspended.

## Exporting rows as CSV

`toCsv(rows)` (`@/lib/csv`) turns an array of rows into RFC 4180 text with CRLF line endings. A value with a comma, quote or line break is quoted (and its quotes doubled), and `null` and `undefined` become empty cells. A value that starts with `=`, `+`, `-`, `@`, a tab or a carriage return gets a leading quote so a spreadsheet does not evaluate it as a formula (CSV injection). Numbers are written as they are, so a negative number also gets the quote (`-5` becomes `'-5`).
