# Testing

| Layer                        | Tool                             | Location                                           |
| ---------------------------- | -------------------------------- | -------------------------------------------------- |
| Unit, component, integration | Vitest + Testing Library (jsdom) | `src/**/*.test.ts(x)`, next to the code under test |

## Commands

| Command              | What it does                                        |
| -------------------- | --------------------------------------------------- |
| `pnpm test`          | Run all unit/component tests once                   |
| `pnpm test:watch`    | Re-run affected tests on save                       |
| `pnpm test:coverage` | Run once and write a coverage report to `coverage/` |

## Conventions

- Import `describe`, `it`, `expect` and `vi` from `vitest`. Globals are off, so every file says where its test APIs come from.
- Query the DOM the way users do: `getByRole`, `getByLabelText`, `getByText`. Use `data-testid` only as a last resort.
- Tests run in UTC (`TZ: 'UTC'`), with `VITE_API_BASE_URL: '/api'` and `VITE_LOG_LEVEL: 'debug'`, whatever your `.env.local` says (the three `test.env` pins in `vite.config.ts`). A date test therefore sees UTC, not your time zone.
- Mocks are cleared and restored after every test (`clearMocks` is on by default in Vitest 5, and `restoreMocks: true` is set).
- `src/test/setup.ts` runs before every test file. It registers the jest-dom matchers and stubs the browser APIs jsdom lacks but Radix primitives and the theme code use (`ResizeObserver`, `matchMedia`, `scrollTo`, the pointer-capture methods and `scrollIntoView`). Before each test it resets the i18n language to `en`, because a test may switch it and the app starts in the detected language (saved choice, then browser, then `VITE_DEFAULT_LOCALE`, which Vitest reads from your `.env.local`); a test therefore always starts in English. After each test it resets the session, theme and UI stores to their initial state, unmounts rendered trees, resets the mock API's state (`resetMockDb`) and clears cookies (MSW forwards a mocked `Set-Cookie` to jsdom's `document.cookie`, so a login would otherwise leak into the next test), `localStorage` and `sessionStorage`, so a test may change any of them without cleaning up (a new store is added to the reset list in `setup.ts`). It also starts the MSW server before a file's tests, resets any handlers a test added after each test, and closes the server afterwards (see "Mocking the API with MSW" below).

## The provider-aware `render`

Prefer `@/test/render` when the component needs providers. It wraps a `QueryClientProvider`, a `ConfirmProvider` and a memory data router, so `Link`, `useParams`, `useBlocker` and `useConfirm()` work. Earlier tests import Testing Library directly, and that stays valid for components that need no providers:

```tsx
import { render, screen } from '@/test/render';

const { queryClient, router } = render(<ItemsPage />, { route: '/items?page=2', path: '/items' }); // QueryClientProvider (retries off), ConfirmProvider, memory router
```

`@/test/render` also exports a `renderHook` that wraps the hook in the same providers; pass `{ queryClient }` to either function to use your own client.

Routing and auth options (both functions): `route` is the initial URL (default `/`), `path` the route pattern the UI is mounted at (default `*`, so `useParams` works when you set it), `routes` extra routes (for example a `/login` page to assert a redirect), and `auth` wraps the UI in `AuthProvider` as `'admin'`, `'viewer'` (signed in as that mock user) or `'anonymous'`. With `auth` the first frame is the bootstrap loader, so use `findBy…` queries. The result also carries the `router`, whose `router.state.location` shows where the UI ended up.

Two timing notes. Asynchronous Testing Library helpers (`findBy…`, `waitFor`) wait up to 3 s by default (`configure` in `setup.ts`), because the first import of a lazy route chunk can be slow. And do not fake `queueMicrotask` (for example `vi.useFakeTimers({ toFake: ['queueMicrotask'] })`): `useUrlState` clears its same-tick snapshot of the URL in a microtask, so a faked one leaves the snapshot stale and the next write starts from it instead of from the current URL.

`createTestQueryClient()` gives you the app's client (`createQueryClient()`, so the same global error handling) with retries off and no garbage collection, for tests that need one directly. Its `staleTime` stays 30 s: a test that remounts a component and expects a refetch must set `staleTime: 0`.

## Mocking the API with MSW

The same handlers (`src/mocks/handlers.ts`) power three things:

| Where                                                                   | How                                                                                                               |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`, and the Docker demo (planned) when `VITE_ENABLE_MOCKS=true` | `src/mocks/browser.ts` (service worker, started in `main.tsx`)                                                    |
| Vitest                                                                  | `src/mocks/server.ts`, started in `src/test/setup.ts`. **An unmocked request is rejected and its URL is logged.** |
| Playwright E2E (planned)                                                | the preview build runs with mocks on                                                                              |

An unmocked request makes MSW reject it (`onUnhandledFrame: 'error'`) and log its URL. A test fails only if that rejection reaches it, so a component that catches the error can still pass, with a console error.

Override a handler for one test (it is reset after each test):

```ts
import { http, HttpResponse } from 'msw';

import { apiUrl } from '@/mocks/api-url';
import { server } from '@/mocks/server';

server.use(
  http.get(apiUrl('/items'), () => HttpResponse.json({ code: 'SERVER_ERROR' }, { status: 500 })),
);
```

Mock handlers load in every test file (`setup.ts` starts the server, which registers all of them), so a handler reads a feature's contract (Zod schemas and types) from its `schemas/` and `types/` files, not from its index. A real feature's index also exports its hooks and pages, and importing it would load that UI into every test file, and into modules a test wants to `vi.mock` (the setup has already loaded the real ones). ESLint allows this deep import under `src/mocks` only.

Always build handler URLs with `apiUrl()`: it resolves paths the same way the shared HTTP client does, whatever `VITE_API_BASE_URL` is. After upgrading `msw`, run `pnpm exec msw init public` to refresh `public/mockServiceWorker.js`.
