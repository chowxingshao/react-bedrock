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

Routing and auth options (both functions): `route` is the initial URL (default `/`), `path` the route pattern the UI is mounted at (default `*`, so `useParams` works when you set it), `routes` extra routes (for example a `/login` page to assert a redirect), and `auth` wraps the UI in `AuthProvider` as `'admin'`, `'viewer'` (signed in as that mock user) or `'anonymous'`. With `auth` the first frame is the bootstrap loader, so use `findBy…` queries. The result also carries the `router`, whose `router.state.location` shows where the UI ended up; `await act(() => router.navigate(-1))` goes Back, for a test of how a page follows the URL.

For a flow that crosses pages (a sidebar link, a redirect, where focus lands), `src/app/router.test.tsx` renders the real route tree with all the app providers (`renderApp(url)`) instead. Its tests also cover the items flow from the sidebar to an item and the focus after leaving a form with unsaved changes.

Finish a test with its requests done: an answer that arrives after the test has ended is handled during the next one, where the shared HTTP client may treat a 401 or a dropped request as part of that test's session. Wait for something the data produces (a total, a row), not for an element that was already on screen (a breadcrumb link, a heading).

Two timing notes. Asynchronous Testing Library helpers (`findBy…`, `waitFor`) wait up to 3 s by default (`configure` in `setup.ts`), because the first import of a lazy route chunk can be slow. And do not fake `queueMicrotask` (for example `vi.useFakeTimers({ toFake: ['queueMicrotask'] })`): `useUrlState` clears its same-tick snapshot of the URL in a microtask, so a faked one leaves the snapshot stale and the next write starts from it instead of from the current URL.

`createTestQueryClient()` gives you the app's client (`createQueryClient()`, so the same global error handling) with retries off and no garbage collection, for tests that need one directly. Its `staleTime` stays 30 s: a test that remounts a component and expects a refetch must set `staleTime: 0`.

## Mocking the API with MSW

The same handlers (`src/mocks/handlers.ts`) power three things:

| Where                                                           | How                                                                                                               |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`, and the Docker image while `VITE_ENABLE_MOCKS=true` | `src/mocks/browser.ts` (service worker, started in `main.tsx`)                                                    |
| Vitest                                                          | `src/mocks/server.ts`, started in `src/test/setup.ts`. **An unmocked request is rejected and its URL is logged.** |
| Playwright E2E                                                  | the preview build runs with mocks on                                                                              |

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

To see an optimistic update in a test, hold the request: the mock API answers within a few tens of milliseconds, about as fast as the 50 ms poll of `waitFor`. A handler that awaits a promise and returns nothing falls through to the real handler once the promise resolves:

```ts
let release = () => undefined;
const held = new Promise<void>((resolve) => {
  release = () => {
    resolve();
  };
});
server.use(
  http.delete(apiUrl('/items/:itemId'), async () => {
    await held;
  }),
);
// ...start the mutation, `await waitFor(...)` the optimistic state, then `release()`.
```

Attach `.rejects` to a mutation you expect to fail before you wait, so the rejection is never unhandled while you wait.

Mock handlers load in every test file (`setup.ts` starts the server, which registers all of them), so a handler reads a feature's contract (Zod schemas and types) from its `schemas/` and `types/` files, not from its index. A real feature's index also exports its hooks and pages, and importing it would load that UI into every test file, and into modules a test wants to `vi.mock` (the setup has already loaded the real ones). ESLint allows this deep import under `src/mocks` only, and only for `schemas/` and `types/` (the rule is in docs/architecture.md).

Compare prices with `formatCurrency()`, not a literal `$9.50`: the currency comes from `VITE_DEFAULT_CURRENCY`. A test that needs a feature flag off sets an explicit source (`setFeatureFlagSource(createEnvFlagSource([]))`), because the default one reads `VITE_FEATURE_FLAGS`.

Always build handler URLs with `apiUrl()`: it resolves paths the same way the shared HTTP client does, whatever `VITE_API_BASE_URL` is. After upgrading `msw`, run `pnpm exec msw init public` to refresh `public/mockServiceWorker.js`.

## End-to-end tests (Playwright)

- **First time** (and after upgrading `@playwright/test`): install the browser once with `pnpm exec playwright install chromium`. A Linux CI runner installs it with `--with-deps`, which also adds the system libraries.
- `pnpm test:e2e` builds the app (the Playwright `webServer` runs `pnpm build`) and runs `e2e/*.spec.ts` against `vite preview` (port 4173) with the **mock API on**, so no backend is needed. `pnpm test:e2e:ui` does the same in the interactive runner. Port 4173 must be free: a preview that is already running would serve an older build, so Playwright never reuses one.
- **The build is pinned:** `playwright.config.ts` sets every `VITE_*` variable for the build to its default (a variable in the environment beats the `.env*` files), so a `.env.local` on your machine (mocks off, another app name or language) cannot change what the tests see.
- **Covered:**
  - sign-in and redirects, sign-out, and session persistence
  - sidebar navigation (which stays in view on a long page), titles and 404
  - Items: search, filter and URL state; create, edit and delete; optimistic rollback; where focus goes after a delete (the next row, and back to the button when the server refuses); read-only users on `/items/new` and `/items/:id/edit` (the denied page has its own h1)
  - the language switch
  - the dark theme without a flash
- **Accessibility:** `a11y.spec.ts` runs axe (WCAG 2.1 A/AA) on the login page in light and dark, on the app pages in light (the dashboard, the Items list, new, detail and edit, and the 404 page inside the shell), on the Items list in Spanish and dark mode, and with the user menu, the page-size select and the delete dialog open. Tests run with reduced motion, so axe never samples a half-faded colour or a closing menu. While a Radix menu or select is open, axe reports `aria-hidden-focus` for the page behind it: Radix hides that page from assistive technology and traps focus inside the menu, but the controls behind it stay focusable. That one rule is switched off for the user menu and the select, and no other; the delete dialog is scanned with every rule. Keyboard checks (skip link, focus) are in `navigation.spec.ts`. Storybook's a11y panel covers individual components.
- **Accessibility decisions:** what the checks leave out on purpose.
  - Axe runs the WCAG 2.1 A and AA rules only. Best-practice rules are not part of the gate. One of them, `region`, reports the brand text above the card on the login page and on the 404 page of a signed-out visitor, because it sits outside any landmark.
  - After signing in, focus stays at the start of the document, like after a page load: "Skip to main content" is the first Tab stop. A route change inside the app moves focus to the main content (`src/app/router.test.tsx`).
  - Neither axe nor Playwright can tell whether a screen reader announces a live region. The `PageLoader` and skeleton regions are checked by reading the code, and still need a manual pass with a screen reader. The offline banner is covered by a test of its always-present `role="status"` region.
  - The physical-direction utilities (`ml-*`, `pl-*`, `left-*`, `right-*`, `text-left`), most of them in `components/ui` and the dropdown menu above all, stay as they are. Right-to-left layouts are a known limitation (docs/i18n.md), and none of the checks above runs in one.
- **Helpers:** `e2e/fixtures.ts` provides `signIn(page, 'admin' | 'viewer')` and the `makeAxeBuilder` fixture. `ACCOUNTS` copies the demo accounts of `src/mocks/fixtures/users.ts`, because `e2e/` cannot import from `src/`; `src/test/e2e-fixtures.guard.test.ts` fails when they differ.
- **Waiting:** a test that signs out and signs in again waits for `/login` in between (`await expect(page).toHaveURL(/\/login$/)`). Navigating earlier can load `/login` before the sign-out has finished, and the old session then sends the page back to the dashboard.
- **Reports:** failures leave a report in `playwright-report/`, with traces on retry. CI uploads it as an artifact.

## What to test where

| Change                                      | Test it with                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| Pure function, schema, store                | Vitest unit test next to the file                                                |
| Component or hook                           | Vitest + Testing Library (`@/test/render`), with MSW for data                    |
| A feature flow across pages                 | an integration test with the real route tree (`src/app/router.test.tsx`), or E2E |
| Critical user journeys, visual states, a11y | Playwright (`e2e/`)                                                              |

## Coverage

`pnpm test:coverage` writes a report to `coverage/` (open `coverage/index.html`). It **fails** when coverage of `src/core/**` or `src/lib/**` drops below 70% for lines, functions, branches or statements. Each folder is measured as a whole, not file by file. Tests, stories, `.d.ts` files, `src/test`, `src/mocks`, `src/api/generated` and `src/main.tsx` are left out of the report. CI runs it on every pull request and uploads the report.

Raise the thresholds in `vite.config.ts` as coverage grows. Never lower them to make a change pass.
