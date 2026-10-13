# React Frontend Starter Template — Build Specification

> **Audience:** Claude (or any coding agent) building this template from scratch.
> **Goal:** A general-purpose, open starter repository for React + TypeScript frontend projects. Anyone should be able to use it, for any product or organisation. It ships with all the core infrastructure already wired up, so a developer can clone it and start writing business features on day one.
> **Neutrality rule:** the template must contain no company-specific names, branding, locales, currencies or business logic. Anything project-specific (app name, brand colours, languages, currency, API URL) is configuration, not code.

---

## 0. Instructions for the Agent

Read this whole document before writing any code.

1. **Confirm open decisions first.** Section 13 lists decisions that need the owner's answer. Ask about any that are unresolved before starting Phase 1. Do not guess them silently.
2. **Build in phases (Section 12).** Finish one phase, verify it (`lint`, `typecheck`, `test`, `build` all pass), then stop and report before starting the next phase.
3. **For each phase, report:** files created, files modified, commands run, anything deferred, and any deviation from this spec with the reason.
4. **Use the latest stable versions** of every library at build time. Check the official docs for current APIs rather than relying on memory, because several libraries here (Tailwind v4, React Router v7, TanStack Query v5, ESLint flat config) changed their APIs recently.
5. **Do not add libraries outside this spec** without flagging it. If something here is outdated or clearly worse than an alternative, say so and propose the change instead of silently swapping.
6. **Every module must include:** typed code, at least one test, and a short entry in `docs/`.
7. **Write the project's own `CLAUDE.md` last** (Section 11.3), so future agents working on projects created from this template understand its conventions.

---

## 1. Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Language | TypeScript (`strict: true`) | Also enable `noUncheckedIndexedAccess` |
| Framework | React (latest) | |
| Build tool | Vite | SPA by default |
| Package manager | pnpm | Commit the lockfile; pin version via `packageManager` field |
| Routing | React Router v7 (data/library mode) | Lazy-loaded routes |
| Server state | TanStack Query v5 | All API data goes through this |
| Client state | Zustand | UI/global state only, never API data |
| HTTP client | Axios (single shared instance) | Interceptors live in `src/core/api` |
| Forms | React Hook Form + Zod | |
| Validation | Zod | Env vars, forms, API responses |
| Styling | Tailwind CSS v4 | CSS-first config via `@theme` |
| Components | shadcn/ui (Radix primitives) + `class-variance-authority` | Components are owned code in `src/components/ui` |
| Icons | lucide-react | |
| Toasts | Sonner | Wrapped by `src/core/notify` |
| i18n | i18next + react-i18next | `en` + one example locale (`es`) to prove the setup |
| Dates | date-fns | Wrapped by `src/lib/format` |
| Tables | TanStack Table | Base `DataTable` component |
| Logging | Custom `logger` wrapper + Sentry adapter | Adapter optional, off by default |
| API mocking | MSW (Mock Service Worker) | Used in dev and tests |
| API codegen | Orval (from OpenAPI spec) | Generates types + TanStack Query hooks |
| Scaffolding codegen | Plop | Generators for features/components |
| Unit/component tests | Vitest + Testing Library | |
| E2E tests | Playwright | |
| Component docs | Storybook | Visual catalogue of the design system |
| Lint/format | ESLint (flat config) + Prettier | |
| Git hooks | Husky + lint-staged + commitlint | Conventional Commits |
| CI/CD | GitHub Actions (default, see Section 13) | |
| Container | Docker (multi-stage) + nginx + Docker Compose | Zero-config `docker compose up`; runtime env config (Section 10.4) |

---

## 2. Core Principles (Non-Negotiable)

1. **One source of truth for design.** All colours, radii, spacing, fonts, shadows and z-indexes are defined once as tokens in `src/styles/tokens.css`. Changing a value there changes it everywhere. No hard-coded hex colours or arbitrary pixel values in components.
2. **Wrap third-party libraries.** Feature code calls `logger`, `notify`, `storage`, `http`, `formatDate`, never the underlying libraries directly. Enforce with ESLint `no-restricted-imports`.
3. **Server state ≠ client state.** API data lives in TanStack Query. Zustand holds only UI/session state. Never copy query data into a store.
4. **Every async view handles all states.** Loading, empty, error and success must all be handled, using the shared state components (Section 5.4).
5. **Feature-based structure.** Business code lives in `src/features/<name>/`. Features do not import from each other's internals; shared code moves to `src/components`, `src/hooks` or `src/lib`.
6. **Validate at the boundaries.** Env vars at startup, forms on submit, and API responses where the contract is uncertain.
7. **Fail loudly in dev, gracefully in prod.** Dev shows detailed errors; prod shows friendly messages and reports to the logger.
8. **Accessible by default.** Keyboard navigable, visible focus states, labelled inputs, sufficient colour contrast.

---

## 3. Folder Structure

```
.
├── .github/workflows/        # CI/CD pipelines
├── .husky/                   # Git hooks
├── .storybook/               # Storybook config
├── docs/                     # Developer documentation (Section 11)
├── e2e/                      # Playwright tests
├── plop/                     # Plop generator templates
├── public/
│   └── mockServiceWorker.js  # Generated by MSW
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── providers.tsx     # All providers composed in one place
│   │   ├── router.tsx        # Route tree
│   │   └── routes/           # Route-level pages (thin; delegate to features)
│   ├── config/
│   │   ├── env.ts            # Zod-validated environment variables
│   │   └── constants.ts      # App-wide constants
│   ├── core/
│   │   ├── api/              # Axios instance, interceptors, errors, query client
│   │   ├── auth/             # Auth provider, hooks, route guards
│   │   ├── logger/           # Logger + transports
│   │   ├── notify/           # Toast wrapper
│   │   ├── storage/          # localStorage / sessionStorage / cookie wrappers
│   │   ├── i18n/             # i18next setup
│   │   └── errors/           # Error boundary, error types
│   ├── api/
│   │   └── generated/        # Orval output (do not edit by hand)
│   ├── components/
│   │   ├── ui/               # Design system primitives (Button, Input, ...)
│   │   ├── feedback/         # Loading, Skeleton, EmptyState, ErrorState, QueryState
│   │   └── layout/           # AppShell, Sidebar, Header, PageHeader
│   ├── features/
│   │   └── example/          # Reference feature showing every pattern
│   │       ├── api/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── schemas/
│   │       ├── types/
│   │       └── index.ts      # Public API of the feature
│   ├── hooks/                # Shared hooks
│   ├── lib/                  # Pure utilities (cn, format, etc.)
│   ├── locales/              # Translation JSON: en/, es/
│   ├── mocks/                # MSW handlers and fixtures
│   ├── stores/               # Zustand stores
│   ├── styles/
│   │   ├── tokens.css        # ★ Design tokens — single source of truth
│   │   └── globals.css       # Tailwind import, base styles
│   ├── test/                 # Test setup, render helpers
│   ├── types/                # Global types
│   └── main.tsx
├── .env.example
├── CLAUDE.md
├── docker/
│   ├── nginx.conf.template   # nginx config with env substitution
│   └── docker-entrypoint.sh  # Writes runtime config.js from env vars
├── .dockerignore
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.dev
├── orval.config.ts
├── plopfile.js
├── README.md
└── vite.config.ts
```

Configure the `@/` path alias to `src/` in both `tsconfig` and `vite.config.ts`.

---

## 4. Configuration & Environment

**Files:** `src/config/env.ts`, `.env.example`, `src/vite-env.d.ts`

- Define every env var in a Zod schema and parse it once at startup.
- **Two config sources, merged in this order (later wins):**
  1. Build-time: `import.meta.env` (used in local `pnpm dev`).
  2. Runtime: `window.__APP_CONFIG__`, loaded from `/config.js` via a `<script>` tag in `index.html` before the app bundle. In Docker this file is generated at container start from environment variables (Section 10.4), so **one built image can point at any API without rebuilding**. In local dev, `public/config.js` is an empty stub.
- Use the same variable names in both sources, so there is only one set of names to learn.
- If validation fails, render a clear full-screen config error in dev and throw in production builds.
- Export a typed `env` object; nothing else reads `import.meta.env` or `window.__APP_CONFIG__` directly (enforce with lint).
- Every variable has a safe default, so the app starts with no `.env` file at all (mocks on, localhost API).
- Initial variables:
  - `VITE_APP_NAME`
  - `VITE_API_BASE_URL`
  - `VITE_APP_ENV` (`development` | `staging` | `production`)
  - `VITE_DEFAULT_LOCALE` (default `en`)
  - `VITE_DEFAULT_CURRENCY` (default `USD`)
  - `VITE_ENABLE_MOCKS` (boolean, enables MSW)
  - `VITE_SENTRY_DSN` (optional)
  - `VITE_LOG_LEVEL` (`debug` | `info` | `warn` | `error`)
- `.env.example` documents every variable with a comment. `.env*` (except the example) is git-ignored.

---

## 5. Design System

### 5.1 Design Tokens — the "change it in one file" requirement

**File:** `src/styles/tokens.css`

Tailwind v4 uses CSS-first configuration, so there is no `tailwind.config.js` by default. All theming goes in CSS.

- Define semantic tokens as CSS variables on `:root`, with a dark theme override under `.dark` (and `prefers-color-scheme` fallback).
- Map them into Tailwind using `@theme inline` so utilities like `bg-primary`, `text-muted-foreground` and `rounded-md` read from the tokens.
- Use **semantic names**, not raw colour names: `primary`, `primary-foreground`, `secondary`, `accent`, `muted`, `destructive`, `success`, `warning`, `info`, `background`, `foreground`, `border`, `input`, `ring`, `card`, `popover`.
- Also tokenise: `--radius`, font families (`--font-sans`, `--font-mono`), font sizes if customised, shadows, z-index layers (`dropdown`, `sticky`, `modal`, `toast`), and animation durations.
- Use OKLCH colour values (Tailwind v4 default) for consistent perceived lightness.
- Add a comment block at the top of the file explaining: "To rebrand, change the values in this file only."

**Acceptance test:** changing `--primary` and `--radius` in `tokens.css` visibly updates every button, input, card and badge with no other file touched.

### 5.2 Theme Switching

**Files:** `src/stores/theme-store.ts`, `src/components/ui/theme-toggle.tsx`

- Light / dark / system modes, persisted via the storage wrapper.
- Apply the class on `<html>` before first paint (inline script in `index.html`) to avoid a flash.

### 5.3 UI Primitives

**Folder:** `src/components/ui/`

Install via the shadcn CLI, then adjust. Every component uses `cva` for variants and the `cn()` helper (`clsx` + `tailwind-merge`) for class merging. Minimum set:

`Button`, `Input`, `Textarea`, `Label`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `Card`, `Badge`, `Dialog`, `AlertDialog`, `Sheet` (drawer), `DropdownMenu`, `Popover`, `Tooltip`, `Tabs`, `Table`, `Avatar`, `Separator`, `Skeleton`, `Spinner`, `Pagination`, `Breadcrumb`, `Form` (RHF integration), `DatePicker`, `DataTable` (TanStack Table wrapper with sorting, pagination, loading/empty states).

Rules:
- Variants (e.g. `variant: default | secondary | outline | ghost | destructive`, `size: sm | md | lg | icon`) are defined once in the component's `cva` call. Changing a variant there changes it app-wide.
- No component may hard-code colours; only token-backed utilities.
- Every primitive gets a Storybook story showing all variants.

### 5.4 Async State Components

**Folder:** `src/components/feedback/`

| Component | Purpose |
|---|---|
| `Spinner` | Inline loading indicator (buttons, small areas) |
| `PageLoader` | Full-page/section loading, used as `Suspense` fallback for lazy routes |
| `Skeleton` | Base shimmer block |
| `SkeletonPresets` | Ready-made skeletons: `TableSkeleton`, `CardSkeleton`, `ListSkeleton`, `FormSkeleton`, `DetailSkeleton` |
| `EmptyState` | Icon + title + description + optional action button |
| `ErrorState` | Friendly message + "Try again" button; shows technical details only in dev |
| `QueryState` | Wraps a TanStack Query result and renders the right state automatically |

`QueryState` API (illustrative):

```tsx
<QueryState
  query={ordersQuery}
  loading={<TableSkeleton rows={10} />}
  empty={<EmptyState title={t('orders.empty')} />}
  isEmpty={(data) => data.items.length === 0}
>
  {(data) => <OrdersTable data={data.items} />}
</QueryState>
```

- Sensible defaults for every slot, so the minimal usage is `<QueryState query={q}>{(data) => ...}</QueryState>`.
- The error slot's retry calls `query.refetch()`.
- Also support `useSuspenseQuery` style via an `AsyncBoundary` component (Suspense + ErrorBoundary combined).
- Skeletons should avoid flashing for very fast responses (short delay before showing, ~200 ms).

### 5.5 Layout

**Folder:** `src/components/layout/`

- `AppShell`: responsive sidebar + header + content area; sidebar collapses to a sheet on mobile.
- `Sidebar`: navigation driven by a config array (label key, icon, path, required permission).
- `Header`: user menu, language switcher, theme toggle.
- `PageHeader`: title, breadcrumbs, action buttons slot.
- `AuthLayout`: centred card layout for login and similar pages.

---

## 6. Data Layer

### 6.1 HTTP Client & Interceptors

**Folder:** `src/core/api/`
**Files:** `http.ts`, `interceptors.ts`, `errors.ts`, `query-client.ts`

- One Axios instance, `baseURL` from `env`, sensible default timeout (e.g. 30 s).
- **Request interceptors:**
  - Attach auth (token header or rely on cookies with `withCredentials`, per Section 13).
  - Attach `Accept-Language` from the current i18n locale.
  - Attach a generated `X-Request-Id` for tracing.
  - Log request at `debug` level.
- **Response interceptors:**
  - Normalise every error into a single `AppError` type: `{ code, message, status, details?, requestId? }`.
  - On `401`: attempt one token refresh (single in-flight refresh shared by concurrent requests, queued retries). If refresh fails, clear session and redirect to login.
  - On `403`: show a "no permission" toast.
  - On network error / timeout: show a connectivity toast.
  - Log errors via `logger` with request id.
- `errors.ts` exports `AppError`, type guards (`isAppError`), and a `getErrorMessage(err)` helper that returns a translated, user-friendly message.
- Support request cancellation (`AbortSignal`), which TanStack Query passes automatically.

### 6.2 TanStack Query Setup

**File:** `src/core/api/query-client.ts`

- Defaults: `staleTime` ~30 s, `retry` 1 for queries (no retry on 4xx), `retry` 0 for mutations, `refetchOnWindowFocus` configurable.
- Global `QueryCache` / `MutationCache` `onError` handlers: log the error; toast for mutations unless the mutation opts out via `meta: { silent: true }`.
- Query key factory convention per feature, e.g. `orderKeys.all`, `orderKeys.list(filters)`, `orderKeys.detail(id)`.
- React Query Devtools in development only.

### 6.3 API Code Generation

**Files:** `orval.config.ts`, `src/api/generated/`

- Orval reads the backend's OpenAPI spec (URL or local file, see Section 13) and generates TypeScript types, Zod schemas and TanStack Query hooks.
- Configure Orval to use the shared Axios instance via a custom mutator so interceptors apply to generated calls.
- Script: `pnpm codegen:api`.
- Generated files are committed and excluded from lint/format.
- Document in `docs/api-codegen.md` how to regenerate and how to handle a backend without an OpenAPI spec (hand-written services in the feature's `api/` folder, same patterns).

### 6.4 Client State (Zustand)

**Folder:** `src/stores/`

- Stores: `theme-store`, `ui-store` (sidebar collapsed, etc.), `session-store` (current user profile, permissions; no tokens if using httpOnly cookies).
- Use `persist` middleware through the storage wrapper for anything that should survive reloads.
- Use `devtools` middleware in development.
- Export selector hooks; components never subscribe to the whole store.

### 6.5 Storage Wrappers

**Folder:** `src/core/storage/`

- `localStore`, `sessionStore`: typed `get<T>`, `set<T>`, `remove`, `clear`.
  - All keys namespaced with a configurable prefix derived from `VITE_APP_NAME` (e.g. `myapp:`).
  - JSON serialisation with try/catch; return `null` on parse failure or when storage is unavailable (private mode, quota).
  - Optional Zod schema on `get` to validate stored shape.
  - Optional TTL/expiry support.
- `cookies`: typed wrapper over `js-cookie` with secure defaults (`SameSite=Lax`, `Secure` in production).
- Central `storage-keys.ts` listing every key used, so there are no magic strings.
- **Security rule:** never store auth tokens or personal data in localStorage unless Section 13 explicitly decides otherwise. Document why in `docs/security.md`.

---

## 7. Application Infrastructure

### 7.1 Routing

**Files:** `src/app/router.tsx`, `src/app/routes/`, `src/core/auth/guards.tsx`

- Every route is lazy-loaded with `PageLoader` as the fallback.
- Route guards:
  - `RequireAuth`: redirects to login and returns to the original URL after login.
  - `RequireGuest`: redirects logged-in users away from login.
  - `RequirePermission`: renders a 403 page if the user lacks a permission.
- Pages included: Login, Dashboard (placeholder), Example feature list + detail, 403, 404, generic error page.
- Route-level error boundary via the router's `errorElement`.
- Central `paths.ts` exporting typed path builders (e.g. `paths.orders.detail(id)`), so links never use raw strings.
- Scroll restoration and document title updates per route (title translated).

### 7.2 Authentication

**Folder:** `src/core/auth/`

- `AuthProvider` + `useAuth()` hook: `user`, `isAuthenticated`, `isLoading`, `login()`, `logout()`, `hasPermission()`.
- Bootstraps the current user on app load (`/me` style call) with a full-page loader until resolved.
- Implementation depends on Section 13 (cookie vs token). Build an interface so switching strategies touches one file.
- Logout clears query cache, session store and relevant storage.
- Mocked in MSW so the template runs without a real backend.

### 7.3 Error Handling

**Folder:** `src/core/errors/`

- Global `ErrorBoundary` at the app root, plus per-route boundaries.
- Catches render errors, logs them with component stack, shows `ErrorState` with a reload button.
- `window.onerror` and `unhandledrejection` listeners forward to `logger`.
- User-facing messages are translated; technical details only visible in development.

### 7.4 Logging

**Folder:** `src/core/logger/`

- API: `logger.debug | info | warn | error(message, context?)`.
- Level threshold from `env.VITE_LOG_LEVEL`; default `debug` in dev, `warn` in prod.
- Transport pattern: `ConsoleTransport` (dev, pretty output), `SentryTransport` (prod, only if DSN is set), easy to add others (e.g. a backend log endpoint).
- Automatically attaches context: app version, environment, route, user id (never personal data), request id when available.
- Redacts sensitive keys (`password`, `token`, `authorization`, `cookie`, `secret`, `apiKey`; list is configurable) from logged objects.

### 7.5 Notifications

**Folder:** `src/core/notify/`

- API: `notify.success | error | info | warning(message, options?)`, `notify.promise(promise, messages)`, `notify.dismiss(id)`.
- Wraps Sonner; the `<Toaster />` is mounted once in `providers.tsx` and styled with design tokens.
- Deduplicates identical messages fired in quick succession (e.g. many parallel requests failing).
- Also provide a `useConfirm()` hook backed by `AlertDialog` for "Are you sure?" flows, returning a promise.

### 7.6 Internationalisation

**Folders:** `src/core/i18n/`, `src/locales/{en,es}/`

- Namespaces per area: `common`, `errors`, `validation`, plus one per feature.
- Language detection order: saved preference → browser → `env.VITE_DEFAULT_LOCALE`.
- Language switcher in the header; choice persisted via storage wrapper.
- Type-safe keys (i18next TypeScript resource typing) so missing keys fail typecheck.
- Zod validation messages translated through an error map.
- Formatting helpers in `src/lib/format.ts` that respect the current locale:
  - `formatDate`, `formatDateTime`, `formatRelative`
  - `formatCurrency` (currency from `env.VITE_DEFAULT_CURRENCY`, default `USD`)
  - `formatNumber`, `formatPercent`
- Missing translation keys log a warning in dev.

### 7.7 Forms

- Standard pattern: Zod schema in the feature's `schemas/` → `useForm` with `zodResolver` → shadcn `Form` components.
- Field-level errors displayed under inputs; server-side validation errors from `AppError.details` mapped back onto fields via a `applyServerErrors(form, error)` helper.
- Submit button shows loading state and disables during submission.
- Warn on navigation away with unsaved changes (`useUnsavedChangesWarning` hook).

### 7.8 Shared Hooks

**Folder:** `src/hooks/`

`useDebounce`, `useDisclosure` (open/close state), `useMediaQuery`, `useCopyToClipboard`, `usePagination` (synced with URL search params), `useUrlState` (typed search-param state for filters), `useDocumentTitle`, `useOnlineStatus` (shows an offline banner).

### 7.9 Permissions & Feature Flags

- `hasPermission(permission)` from auth; `<Can permission="orders.create">` component for conditional rendering.
- Simple feature flag module (`src/config/features.ts`) driven by env vars, with a `useFeature(flag)` hook. Designed so it can later be backed by a remote service.

---

## 8. Reference Feature

**Folder:** `src/features/example/`

Build one complete feature (e.g. "Items") that demonstrates every pattern, so developers can copy it:

- List page: `DataTable` with server-side pagination, search (debounced, URL-synced), filters, `QueryState` with `TableSkeleton` and `EmptyState`.
- Detail page: `DetailSkeleton`, `ErrorState` with retry, 404 handling.
- Create/edit form: Zod schema, RHF, server error mapping, success toast, cache invalidation.
- Delete with `useConfirm()` and optimistic update with rollback.
- MSW handlers with realistic fixtures and simulated latency/errors.
- Unit, component and E2E tests.
- Fully translated in all bundled locales.

---

## 9. Code Generation (Scaffolding)

**Files:** `plopfile.js`, `plop/templates/`

Plop generators, run via `pnpm gen`:

| Generator | Creates |
|---|---|
| `feature` | Full feature folder with api, hooks, schemas, types, components, index, locale file, MSW handler, test |
| `component` | Component + story + test, in `components/ui`, `components/feedback` or a feature |
| `page` | Route page + registers it in `router.tsx` and `paths.ts` |
| `hook` | Hook + test |
| `store` | Zustand store with selectors + test |

Templates must produce code that passes lint and typecheck immediately.

---

## 10. Quality, Testing & CI/CD

### 10.1 Code Quality

- ESLint flat config with: `typescript-eslint` (type-aware), `react`, `react-hooks`, `jsx-a11y`, `import` ordering, `@tanstack/eslint-plugin-query`, and `no-restricted-imports` rules enforcing the wrappers from Principle 2.
- Prettier with `prettier-plugin-tailwindcss` for class sorting.
- Husky hooks:
  - `pre-commit`: lint-staged (ESLint + Prettier on staged files)
  - `commit-msg`: commitlint (Conventional Commits)
- `.editorconfig` and `.nvmrc` (or Volta) pinning Node version.

### 10.2 Testing

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | Utilities, storage, logger, error normalisation, stores, hooks |
| Component | Vitest + Testing Library + user-event | UI primitives, feedback states, forms |
| Integration | Vitest + MSW | Feature flows with mocked API |
| E2E | Playwright | Login, navigation, reference feature CRUD, language switch, theme switch |
| Accessibility | `vitest-axe` or `@axe-core/playwright` | Key pages and components |

- `src/test/render.tsx`: custom `render()` wrapping all providers (query client, router, i18n, theme).
- Coverage via `@vitest/coverage-v8`; report in CI; initial threshold ~70% on `src/core` and `src/lib`.
- Scripts: `test`, `test:watch`, `test:coverage`, `test:e2e`.

### 10.3 CI/CD

**Folder:** `.github/workflows/`

- `ci.yml` (on pull request and push to main):
  1. Install with pnpm (cached)
  2. `lint`
  3. `typecheck`
  4. `test:coverage`
  5. `build`
  6. `test:e2e` (against preview build, with MSW enabled)
  7. Upload coverage and Playwright report as artifacts
- `deploy.yml`: build and deploy per environment (staging on main, production on tag/release). Leave the deploy step as a clearly marked placeholder until the target is decided (Section 13).
- `storybook.yml` (optional): build and publish Storybook.
- Dependency updates: Renovate or Dependabot config, grouped updates, weekly.
- Branch protection recommendations documented in `docs/contributing.md`.

### 10.4 Docker & Deployment

**Goal:** another team (backend devs, QA, anyone) can run the frontend with **only Docker installed** — no Node, no pnpm, no editing config files. One command, working app.

**Files:** `Dockerfile`, `Dockerfile.dev`, `docker-compose.yml`, `.dockerignore`, `docker/nginx.conf.template`, `docker/docker-entrypoint.sh`

#### Commands the README must promise

| Command | Result |
|---|---|
| `docker compose up` | Production build served by nginx at `http://localhost:8080`, mocks enabled, no backend or `.env` needed |
| `VITE_API_BASE_URL=http://my-api:3000 VITE_ENABLE_MOCKS=false docker compose up` | Same image, pointed at a real API |
| `docker compose --profile dev up` | Vite dev server with hot reload at `http://localhost:5173`, source mounted from the host |
| `docker compose down` | Stops everything |

Also add `pnpm docker:up`, `pnpm docker:dev` and `pnpm docker:down` scripts as shortcuts.

#### `Dockerfile` (production)

- Multi-stage:
  1. `deps`: Node LTS alpine, enable corepack, `pnpm install --frozen-lockfile` (copy lockfile + `package.json` first for layer caching).
  2. `build`: copy source, `pnpm build`. The build must **not** bake in environment-specific values.
  3. `runtime`: `nginx:alpine` (or `nginxinc/nginx-unprivileged` to run as non-root), copy `dist/`, nginx template and entrypoint.
- Build args for app version and git SHA (`APP_VERSION`, `GIT_SHA`), exposed in the UI footer/about area and as OCI image labels.
- `EXPOSE 8080`; run as a non-root user.
- `HEALTHCHECK` hitting a `/healthz` endpoint served by nginx.
- Final image should be small (target under ~50 MB).

#### `docker/docker-entrypoint.sh`

- On container start, write `/usr/share/nginx/html/config.js` containing `window.__APP_CONFIG__ = { ... }` from all `VITE_*` environment variables (whitelisted keys only, values JSON-escaped). Only public config belongs here — document clearly that anything in it is visible to browsers.
- Render `nginx.conf.template` with `envsubst` (only the variables it needs).
- Then `exec nginx -g 'daemon off;'`.

#### `docker/nginx.conf.template`

- SPA fallback: unknown paths serve `index.html`.
- `config.js` and `index.html`: `Cache-Control: no-store`. Hashed assets: long-lived immutable cache.
- gzip (and brotli if the image supports it).
- `/healthz` returns `200 ok`.
- **Optional API proxy:** if `API_PROXY_TARGET` is set, proxy `/api/` to it. This lets the frontend call the backend on the same origin, which avoids CORS setup entirely — a big part of "no configuration" for other teams. If unset, the block is omitted and the app calls `VITE_API_BASE_URL` directly.
- Security headers: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and a CSP placeholder with a comment on how to tighten it.

#### `Dockerfile.dev`

- Node LTS alpine with corepack/pnpm, runs `pnpm dev --host 0.0.0.0`.
- Source is bind-mounted; `node_modules` lives in a named volume so host and container dependencies never clash (important on macOS/Windows).
- Enable file-watch polling via an env var for Windows/WSL hosts where file events don't propagate.

#### `docker-compose.yml`

- Service `web` (default): builds `Dockerfile`, maps `8080:8080`, sets defaults for every variable using `${VAR:-default}` syntax so no `.env` is required, `restart: unless-stopped`, healthcheck.
- Service `web-dev` (profile `dev`): builds `Dockerfile.dev`, maps `5173:5173`, bind mount + `node_modules` volume.
- Reads an optional `.env` file if present; `.env.example` documents every variable.
- Include a commented-out example showing how another team adds their backend service to the same Compose file (or joins an external Docker network) and points `API_PROXY_TARGET` at it.

#### `.dockerignore`

Exclude `node_modules`, `dist`, `.git`, coverage, Playwright reports, `.env*` (except example), Storybook build output.

#### CI

- `ci.yml` also builds the Docker image and runs a smoke test: start the container, wait for `/healthz`, fetch `/` and `/config.js`.
- `docker-publish.yml` (optional): push the image to a registry (GHCR by default) on release tags, tagged with version and `latest`.
- Deploy workflows stay as clearly marked placeholders; the template does not assume a hosting provider.

#### Documentation

`docs/docker.md` covers: the commands table above, every runtime variable, how runtime config works and why, using the API proxy, connecting to a backend running in another Compose project, troubleshooting (port in use, hot reload not working on Windows, stale `config.js` cache).

### 10.5 Performance

- Route-level code splitting (lazy routes).
- `rollup-plugin-visualizer` behind a `pnpm analyze` script.
- Image guidance in docs (formats, lazy loading).
- Web Vitals reported via the logger in production (optional).

---

## 11. Documentation

### 11.1 README.md

Quick start (prerequisites, install, env setup, run with mocks), available scripts table, folder structure overview, links to `docs/`.

### 11.2 docs/

| File | Content |
|---|---|
| `architecture.md` | Layers, folder structure, dependency rules between folders |
| `design-system.md` | Tokens, how to rebrand, how to add a component variant |
| `data-fetching.md` | HTTP client, interceptors, query conventions, query keys, QueryState |
| `api-codegen.md` | Running Orval, custom mutator, handling non-OpenAPI backends |
| `state-management.md` | When to use Query vs Zustand vs URL state vs local state |
| `routing.md` | Adding routes, guards, paths helper |
| `auth.md` | Auth flow, guards, permissions |
| `i18n.md` | Adding languages, namespaces, formatting helpers |
| `forms.md` | Form pattern, server error mapping |
| `error-handling-and-logging.md` | Error flow, logger usage, redaction |
| `testing.md` | What to test where, render helper, MSW usage |
| `generators.md` | Plop generators |
| `security.md` | Token storage decision, XSS/CSRF notes, env secrets |
| `docker.md` | Running with Docker, runtime config, API proxy, troubleshooting (Section 10.4) |
| `deployment.md` | CI/CD, image publishing, environments |
| `contributing.md` | Branching, commit convention, PR checklist |
| `starting-a-new-project.md` | Step-by-step checklist for creating a project from this template (rename, env, remove example feature, set tokens, connect API) |

### 11.3 CLAUDE.md (for the generated project)

A concise guide for AI agents working in projects created from this template: stack summary, folder map, the core principles from Section 2, commands to run before finishing a task (`lint`, `typecheck`, `test`), how to add a feature (use `pnpm gen feature`), and a pointer to `docs/`.

---

## 12. Build Phases

Stop and report after each phase. Each phase must end with `pnpm lint && pnpm typecheck && pnpm test && pnpm build` passing.

| Phase | Scope |
|---|---|
| 1. Foundation | Vite + React + TS strict, pnpm, path aliases, ESLint/Prettier, Husky/lint-staged/commitlint, env validation with runtime-config support (Section 4), `.editorconfig`, `.nvmrc`, Vitest setup |
| 2. Design system | Tailwind v4, `tokens.css`, dark mode, theme toggle, shadcn primitives, `cn()`, Storybook with stories |
| 3. Feedback states | Spinner, PageLoader, Skeleton + presets, EmptyState, ErrorState, QueryState, AsyncBoundary |
| 4. Core services | Logger, notify + useConfirm, storage wrappers, error boundary + global handlers |
| 5. Data layer | Axios instance + interceptors, AppError, query client, Zustand stores, MSW setup |
| 6. i18n & formatting | i18next, `en` + `es`, typed keys, language switcher, format helpers, Zod error map |
| 7. Routing & auth | Router, lazy routes, guards, paths helper, AuthProvider, login page, 403/404/error pages, layouts |
| 8. Reference feature | Complete example feature (Section 8) with tests |
| 9. Codegen | Orval config + mutator, Plop generators |
| 10. Testing, Docker & CI/CD | Playwright E2E, a11y checks, coverage thresholds, Dockerfile + Dockerfile.dev + Compose + entrypoint (Section 10.4), GitHub Actions (including Docker image build), Renovate/Dependabot |
| 11. Documentation | README, `docs/`, project `CLAUDE.md`, final review against this spec |

---

## 13. Open Decisions (confirm before Phase 1)

| # | Decision | Default if not answered |
|---|---|---|
| 1 | Auth strategy: httpOnly cookie session (recommended) or bearer token + refresh token? | httpOnly cookie, `withCredentials: true` |
| 2 | Backend error response shape (need a real example) | `{ code, message, details? }` assumed; adapt in `errors.ts` |
| 3 | Should the sample OpenAPI spec be a real public API or a local fixture? | Local fixture spec matching the MSW mocks |
| 4 | Git host / CI: GitHub Actions or Bitbucket Pipelines? | GitHub Actions |
| 5 | Deployment target (own servers, cloud, static hosting) | Docker + nginx; deploy step left as placeholder |
| 6 | Example locales to bundle | `en` + `es` |
| 7 | Default look (colours, font) | Neutral, unbranded tokens |
| 8 | Error monitoring: Sentry, other, or none? | Adapter built, disabled unless DSN set |
| 9 | Are target projects mostly internal dashboards, or also public sites needing SEO? | Internal dashboards (SPA) |
| 10 | Should core modules later be extracted into a shared package (e.g. `@your-org/core`) to prevent template drift? | Keep in template now; structure `src/core` so it can be extracted cleanly |

---

## 14. Definition of Done

- [ ] All phases complete; lint, typecheck, unit/component/integration tests, E2E and build pass in CI.
- [ ] Changing values in `src/styles/tokens.css` restyles the entire app with no other edits.
- [ ] Every async view in the template uses the shared loading/skeleton/empty/error components.
- [ ] No direct imports of wrapped libraries outside `src/core` (lint-enforced).
- [ ] App runs fully with `VITE_ENABLE_MOCKS=true` and no backend.
- [ ] `pnpm gen feature` produces a working, lint-clean feature.
- [ ] `pnpm codegen:api` generates hooks that go through the shared interceptors.
- [ ] All UI text translated in all bundled locales; no hard-coded user-facing strings.
- [ ] No company-specific names, branding, locales or currencies anywhere in the repo.
- [ ] On a clean machine with only Docker installed, `docker compose up` serves a working app with no `.env` file and no backend.
- [ ] The same built image runs against a different API by changing only environment variables.
- [ ] Keyboard navigation and axe checks pass on key pages.
- [ ] README, `docs/`, and `CLAUDE.md` are complete and accurate.
- [ ] `docs/starting-a-new-project.md` has been followed end-to-end once to verify it works.
