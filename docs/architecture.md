# Architecture

React Bedrock is a single-page app built with Vite. Code is organised by **layer**; business code by **feature**.

## Layers and dependency rules

```
config  →  lib  →  core  →  components / hooks / stores  →  features  →  app
(leaf)                                                                  (composition root)
```

An arrow means "may be imported by everything to its right". These rules are enforced by ESLint (`import-x/no-restricted-paths`, `no-restricted-imports`):

| Folder                    | Purpose                                                                      | May import                                                                                                                                                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/config`              | Validated env, constants, typed paths, feature flags                         | `config`, `lib`                                                                                                                                                                                                                                                                                                   |
| `src/lib`                 | Pure utilities (`cn`, formatters, ids)                                       | `config`, `lib`                                                                                                                                                                                                                                                                                                   |
| `src/core`                | App infrastructure: api, auth, logger, notify, storage, i18n, errors         | `config`, `lib`, `core`, `stores`, `components/ui`, `components/feedback`, `locales` — never `features`, `components/layout` or `app` (so it can be extracted to a package later). Inside `core`, `core/api` may not import `components` or `core/errors` either, because they import it and a cycle would follow |
| `src/components`          | Design system (`ui`), async states (`feedback`), layout (`layout`)           | anything except `features` and `app`                                                                                                                                                                                                                                                                              |
| `src/hooks`, `src/stores` | Shared hooks (docs/hooks.md); Zustand stores (UI/session state only)         | anything except `features` and `app`                                                                                                                                                                                                                                                                              |
| `src/features/<name>`     | Business features                                                            | anything except `app` and **other features' internals**                                                                                                                                                                                                                                                           |
| `src/api`                 | Orval-generated API client (`generated/`) and its test (docs/api-codegen.md) | The generated code imports `core/api` only (its mutator). Features and `app` import the client; `config`, `lib`, `core`, `components`, `hooks` and `stores` must not (an ESLint zone: the client imports `core/api`, so an import back would be a cycle)                                                          |
| `src/mocks`               | Mock API handlers, MSW server and worker                                     | anything except `app`                                                                                                                                                                                                                                                                                             |
| `src/app`                 | Providers, router, route pages                                               | everything                                                                                                                                                                                                                                                                                                        |

More rules:

- **Features** are imported only through their public `index.ts`: `@/features/example`, never `@/features/example/components/x`. The one exception is `src/mocks/**`, where a mock handler reads the feature's `schemas/` and `types/` files only (see "Features" below); the `featureInternals` override in `eslint.config.js` allows those two folders there and nowhere else, so `api/`, `hooks/` and `components/` stay refused.
- **Core modules** are imported through their index (`@/core/api`) from outside `src/core`.
- **Wrapped libraries** are only imported inside their wrapper. Use these instead:

  | Library     | Wrapper                         |
  | ----------- | ------------------------------- |
  | `axios`     | `http` from `@/core/api`        |
  | `sonner`    | `notify` from `@/core/notify`   |
  | `js-cookie` | `cookies` from `@/core/storage` |
  | `@sentry/*` | `logger` from `@/core/logger`   |
  | `date-fns`  | `@/lib/format`                  |

- **Browser globals** — `localStorage`, `sessionStorage`, `document.cookie`, `console`, `import.meta.env` and `window.__APP_CONFIG__` — are only touched by their wrappers.
- **User-facing text** is never a JSX literal (`react/jsx-no-literals`). Use `t('…')`.
- **Components never import `@/mocks`.** This is a convention and is not enforced by ESLint: the mock handlers and MSW are for `main.tsx` (which loads the worker lazily) and tests only, and a component importing them would pull MSW into the main bundle.

## Tooling

- `pnpm lint` runs ESLint (type-aware, zero warnings) and then `prettier --check`.
- `pnpm lint:fix` applies auto-fixes. Import order is auto-fixable.

## Configuration (`src/config/env.ts`)

- Every variable is declared once in a Zod schema, with a safe default. The app starts with no `.env` at all: mocks on, API at `/api`.
- **Two sources, merged in this order (later wins):**
  1. build-time `import.meta.env`, from `.env*` files during `pnpm dev` / `pnpm build`
  2. runtime `window.__APP_CONFIG__`, from `/config.js`, which Docker regenerates at container start from environment variables

  The same variable names work in both, so one built image can point at any API without a rebuild.

- **Validation failure:** development renders a full-screen config error listing each bad variable; production builds throw at startup.
- **Access:** import `env` from `@/config/env`. Nothing else may read `import.meta.env` or `window.__APP_CONFIG__`, and ESLint enforces this.
- **Documentation:** every variable is documented in `.env.example`. A unit test fails if a variable is missing from it.
- **`VITE_*` values are public:** they end up in the browser. Never put secrets in them.
- **`API_PROXY_TARGET`** is server-side only. When set, `pnpm dev`, `pnpm preview` and the nginx container forward `/api/*` to it, which keeps API calls same-origin: no CORS setup, and httpOnly cookies just work.

## Composition root (`src/app`)

- `main.tsx`: loads the validated env, installs the global error handlers, starts the mock worker (if enabled), then `createRoot(…, reactRootErrorHandlers)` renders `App` (or the config error screen when the env is invalid)
- `App.tsx`: `AppErrorBoundary` → `AppProviders` → `RouterProvider`
- `providers.tsx`: `QueryClientProvider` → `ConfirmProvider` → `ThemeSync` → `AuthProvider` → `Toaster` (+ devtools in development)
- `router.tsx`: the route tree; `routes/`: thin page modules that export `Component`, loaded lazily. The exceptions are `root-layout.tsx`, `route-error.tsx` and `page-boundary.tsx`, which the router imports directly, so they load with the entry chunk
- `navigation.ts`: the sidebar config

## Features (`src/features/<name>/`)

Business code lives in features. The reference feature, `src/features/example/` (the "Items" catalogue), shows every pattern. Copy it, or run `pnpm gen feature <plural> <singular> y` (docs/generators.md), which generates the same layout as a read-only list.

```
api/         hand-written service (http + Zod-validated responses), query key factory, queryOptions
hooks/       useItems / useItem / mutations (optimistic delete with rollback)
schemas/     Zod schemas for API responses and forms
types/       domain types and enums
components/  pages and UI: list (DataTable + URL state), detail, create/edit form, delete, export
index.ts     the public API: the only entry point other code may import (`src/mocks` is the one exception, below)
```

Rules:

- Pages in `src/app/routes/` are **thin**: a permission guard plus the feature's page component.
- Features never import another feature's internals. Move shared code to `src/components`, `src/hooks` or `src/lib`.
- A feature owns its i18n namespace and its mock handlers file. Both files take the kebab-case name of the feature's data (`src/locales/<locale>/<name>.json`, `src/mocks/handlers/<name>.ts`), and the namespace is that name in camelCase: `purchase-orders` gives `purchase-orders.json`, `handlers/purchase-orders.ts` and the namespace `purchaseOrders`. For a one-word name they coincide: `items` for the `example` feature.
- A mock handler reads the feature's contract from its `schemas/` and `types/` files, not from its index (ESLint allows that deep import under `src/mocks` only, and only for `schemas/` and `types/`: an import of `api/`, `hooks/` or `components/` fails lint there too). The test setup loads every handler, and the index also exports the pages: going through it would load the whole UI into every test file, and a test could no longer `vi.mock` a module the UI uses.

## Performance

- **Code splitting:** every page is a lazy route (`lazy: () => import(…)` in `src/app/router.tsx`), so users download only what they open. The Sentry SDK and the mock API are separate chunks, loaded only when enabled.
- **Bundle analysis:** `pnpm analyze` builds and opens `stats.html`, a treemap of every module by size, with gzip and brotli sizes. Check it before and after adding a dependency. The file is git-ignored. With `CI=true` set, the command writes it without opening a browser.
- **Bundle:**
  - The template does not split vendor libraries into chunks of their own: the build has no warning (apart from the `%VITE_APP_NAME%` notice) and its largest chunk, the mock API, is about 396 kB. A project that wants cache-friendly vendor chunks can configure `build.rolldownOptions.output.codeSplitting.groups` in `vite.config.ts`. That would shrink the entry chunk, about 213 kB today, to about 7 kB.
  - The first load of `/login` is about 814 kB of JavaScript (262 kB gzip): the entry chunk, React, the router and the login page, with the chunks they share.
  - `src/app/routes/login.tsx` imports `@/mocks/fixtures/users`, so the demo accounts are in every build, even with `VITE_ENABLE_MOCKS=false`. The login page only shows them when the mocks are on. `dist` also holds the mock API chunk and `mockServiceWorker.js`, which a browser downloads only when the mocks are on. This is deliberate and not gated: the mock chunk carries the same fixtures, so a guard on the import would remove nothing. Set `VITE_ENABLE_MOCKS=false` on every real deployment.
- **Caching:** in the production Docker image, hashed files under `/assets/` are cached for a year, while `index.html` and `config.js` are never cached. A new deployment is therefore live on the next page load.
- **Images:**
  - Prefer SVG for icons and illustrations; lucide icons are already inline SVG.
  - Use AVIF or WebP for photos, sized for the largest display they appear at.
  - Import images from `src/` (`import heroUrl from './hero.webp'`) to get hashed, long-cached URLs. Put files in `public/` only when they need a fixed URL.
  - Always set `width` and `height` (or an aspect ratio) to avoid layout shift.
  - Add `loading="lazy"` and `decoding="async"` to images below the fold.
- **Web Vitals:** optional; see docs/error-handling-and-logging.md.
