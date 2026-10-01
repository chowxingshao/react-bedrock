# Architecture

React Bedrock is a single-page app built with Vite. Code is organised by **layer**; business code by **feature**.

## Layers and dependency rules

```
config  →  lib  →  core  →  components / hooks / stores  →  features  →  app
(leaf)                                                                  (composition root)
```

An arrow means "may be imported by everything to its right". These rules are enforced by ESLint (`import-x/no-restricted-paths`, `no-restricted-imports`):

| Folder                    | Purpose                                                              | May import                                                                                                                                                                                                                                                                                                        |
| ------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/config`              | Validated env, constants, typed paths, feature flags                 | `config`, `lib`                                                                                                                                                                                                                                                                                                   |
| `src/lib`                 | Pure utilities (`cn`, formatters, ids)                               | `config`, `lib`                                                                                                                                                                                                                                                                                                   |
| `src/core`                | App infrastructure: api, auth, logger, notify, storage, i18n, errors | `config`, `lib`, `core`, `stores`, `components/ui`, `components/feedback`, `locales` — never `features`, `components/layout` or `app` (so it can be extracted to a package later). Inside `core`, `core/api` may not import `components` or `core/errors` either, because they import it and a cycle would follow |
| `src/components`          | Design system (`ui`), async states (`feedback`), layout (`layout`)   | anything except `features` and `app`                                                                                                                                                                                                                                                                              |
| `src/hooks`, `src/stores` | Shared hooks (docs/hooks.md); Zustand stores (UI/session state only) | anything except `features` and `app`                                                                                                                                                                                                                                                                              |
| `src/features/<name>`     | Business features                                                    | anything except `app` and **other features' internals**                                                                                                                                                                                                                                                           |
| `src/mocks`               | Mock API handlers, MSW server and worker                             | anything except `app`                                                                                                                                                                                                                                                                                             |
| `src/app`                 | Providers, router, route pages                                       | everything                                                                                                                                                                                                                                                                                                        |

More rules:

- **Features** are imported only through their public `index.ts`: `@/features/items`, never `@/features/items/components/x`.
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
- `router.tsx`: the route tree; `routes/`: thin, lazy page modules that export `Component`
- `navigation.ts`: the sidebar config
