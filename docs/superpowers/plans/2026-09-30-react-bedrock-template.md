# React Bedrock Starter Template — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `react-bedrock`, a neutral, general-purpose React + TypeScript SPA starter whose core infrastructure (design tokens, UI kit, data layer, auth, i18n, errors/logging, tests, codegen, Docker, CI) is already wired, so a team can clone it and write business features on day one.

**Architecture:** Vite SPA with a layered `src/` (`config` → `lib` → `core` → `components` / `hooks` / `stores` → `features` → `app`), with the layer rules enforced by ESLint. Third-party libraries sit behind thin wrappers in `src/core` and `src/lib`. Server state lives only in TanStack Query; UI/session state lives in Zustand. By default everything runs against MSW mocks, and one Docker image serves any environment through a runtime `config.js`.

**Tech Stack:** TypeScript 6 (strict), React 19, Vite 8, pnpm 12, React Router v8 (data mode), TanStack Query v5, Zustand 5, Axios, React Hook Form + Zod 4, Tailwind CSS v4, shadcn/ui (Radix, `new-york` style) + cva, lucide-react, Sonner, i18next 26, date-fns 4, TanStack Table v9, Sentry (optional), MSW 3, Orval 8, Plop 4, Vitest 5 + Testing Library, Playwright + axe, Storybook 10, ESLint 9 (flat) + Prettier, Husky + lint-staged + commitlint, GitHub Actions, Docker + nginx.

**Spec:** `../TEMPLATE_BUILD_SPEC.md` (one level above the repo root). Executors read the spec and this plan together. Where they disagree, the spec wins unless this plan lists the difference under **Deviations**.

---

## Context

The owner wrote a build spec for a reusable frontend starter. The target folder `react-bedrock/` is empty, and it is itself the repository root that gets published to git, so nothing is scaffolded into a sub-folder. The spec requires phased delivery (spec §12): each phase must end green on `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, and then work stops for an owner report. This plan turns the spec into ordered, test-first tasks and records the owner's answers to the open decisions (spec §13).

Machine facts found during planning (Windows 11):
- Node `v22.11.0` is installed. That is below what current Vite, Vitest and Storybook require (22.12+), so the owner must upgrade (Task 0.1).
- pnpm is not installed. corepack `0.29.4` is present but outdated.
- git `2.47`, Docker `29.7` and GitHub CLI are available.
- The folder is not yet a git repository.

## Owner decisions (spec §13, confirmed 2026-09-30)

| # | Decision | Answer |
|---|---|---|
| 1 | Auth strategy | **httpOnly cookie session**, `withCredentials: true`. On 401: one shared `POST /auth/refresh`, then retry. Behind an `AuthStrategy` interface so switching strategies touches one file. |
| 2 | Backend error shape | `{ code, message, details? }`. Validation details are assumed to be `{ fields: Record<string, string \| string[]> }`. Adapt only in `src/core/api/errors.ts`. |
| 3 | Sample OpenAPI spec | Local fixture `openapi/openapi.yaml` that matches the MSW mocks. |
| 4 | CI host | **GitHub Actions**, plus Dependabot. |
| 5 | Deployment target | Docker + nginx. Deploy steps are clearly marked placeholders. |
| 6 | Bundled locales | `en` + `es`. |
| 7 | Default look | Neutral, unbranded OKLCH tokens. |
| 8 | Error monitoring | Sentry adapter built, disabled unless `VITE_SENTRY_DSN` is set. |
| 9 | Target apps | Internal dashboards: SPA, no SSR/SEO. |
| 10 | Shared core package | Keep it in the template. `src/core` never imports `src/app`, `src/features` or `src/components/layout`, so it can be extracted later. |
| — | Plan location | `docs/superpowers/plans/2026-09-30-react-bedrock-template.md`, inside the repo (published). |
| — | Router major | **React Router v8** (8.4, latest stable). The spec names v7, but the data-mode API is the same. Everything is imported from `react-router`, and `RouterProvider` comes from `react-router/dom`. |
| — | MSW major | **MSW 3** (3.0, released 2026-09-28). If a v3 defect blocks a task, fall back to `msw@^2.15`, rename `onUnhandledFrame` → `onUnhandledRequest`, and record it. |

## Global Constraints

Every task implicitly includes these rules.

- **Repo root = `react-bedrock/`.** Never scaffold into a sub-folder. Every path in this plan is relative to the repo root. Run all commands from the repo root.
- **Neutrality:** no company-specific names, branding, locales, currencies or business logic anywhere, including docs, fixtures, commit messages and this plan. App name, brand colours, languages, currency and API URL are configuration, not code. Never write the owner's email or local absolute paths into repo files.
- **TypeScript:** `strict: true` plus `noUncheckedIndexedAccess: true`.
- **pnpm only:**
  - Commit `pnpm-lock.yaml` and pin pnpm via the `packageManager` field.
  - Install the **latest stable** versions at build time (`pnpm add <pkg>` with no version).
  - If an installed library's API differs from the code in this plan, follow the official docs, keep this plan's exported names and signatures, and record the difference in the phase report.
- **Dependencies:** no libraries outside the spec plus the **Approved supporting packages** list below. Anything else must be flagged to the owner before you add it.
- **Every module** ships typed code, at least one test, and a short `docs/` entry.
- **Path alias:** `@/` → `src/`, in both `tsconfig.app.json` and `vite.config.ts`. Use `@/…` across folders and relative imports inside a folder.
- **Design tokens (single source of truth):**
  - Colours, radii, fonts, shadows, z-index layers and durations are defined once in `src/styles/tokens.css`. Colours use OKLCH.
  - Components use only token-backed utilities: no hex values, no raw palette classes such as `bg-white` or `text-red-500`, no arbitrary pixel values like `w-[13px]`.
  - Enforced by `src/test/design-tokens.guard.test.ts`.
- **Wrappers only.** Outside each wrapper's home folder, code must not import:
  - `axios` → use `@/core/api`
  - `sonner` → use `@/core/notify`
  - `date-fns` → use `@/lib/format`
  - `js-cookie` → use `@/core/storage`
  - `@sentry/*` → use `@/core/logger`

  Code also must not use `localStorage`, `sessionStorage`, `console`, `import.meta.env` or `window.__APP_CONFIG__` directly. ESLint enforces all of this (Task 1.3).
- **State:** server state only in TanStack Query; Zustand only for UI/session state; never copy query data into a store.
- **Async views:** every async view handles loading, empty, error and success using `src/components/feedback`.
- **Features:** live in `src/features/<name>/` and are imported only through their `index.ts`. ESLint forbids `@/features/*/*`.
- **User-facing text** goes only through i18next and must exist in `en` and `es`. JSX text literals are forbidden by `react/jsx-no-literals`.
- **Accessibility:** keyboard navigable, visible focus rings (`--ring`), labelled inputs, WCAG AA contrast.
- **Errors:** dev fails loudly (full details); prod fails gracefully (friendly translated message, reported to the logger).
- **Env vars (exact names):**
  - `VITE_APP_NAME`
  - `VITE_API_BASE_URL`
  - `VITE_APP_ENV` (`development` | `staging` | `production`)
  - `VITE_DEFAULT_LOCALE` (default `en`)
  - `VITE_DEFAULT_CURRENCY` (default `USD`)
  - `VITE_ENABLE_MOCKS` (boolean)
  - `VITE_SENTRY_DSN` (optional)
  - `VITE_LOG_LEVEL` (`debug` | `info` | `warn` | `error`)
  - `VITE_FEATURE_FLAGS` (added; see Deviations)

  Every variable has a safe default, so the app starts with no `.env` at all.
- **Phase gate:** each phase ends with `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all passing. Then **STOP** and post the Phase Report (template below). Don't start the next phase until the owner says so.
- **Commits:**
  - Conventional Commits (enforced by commitlint from Task 1.4 on), at least one commit per task.
  - Every message ends with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Use a second `-m` so it forms its own paragraph.
  - Before the first commit, the owner confirms that `git config user.name` / `user.email` are the identity they want published.
- **Windows host:**
  - LF line endings everywhere (`.gitattributes`), which is critical for `docker/*.sh` and `.husky/*`.
  - Shell snippets are Git Bash syntax unless marked PowerShell.

### Phase Report template (post at every phase gate)

```text
## Phase N report — <name>
- Files created: …
- Files modified: …
- Commands run: …
- Gate: lint ✅  typecheck ✅  test ✅ (<n> tests)  build ✅
- Deferred: …
- Deviations from spec / plan (with reason): …
```

## Approved supporting packages (flagged additions)

These packages are not named in spec §1, but the spec's choices need them. They are pre-approved by this plan:

| Package | Why |
|---|---|
| `@vitejs/plugin-react`, `@tailwindcss/vite` | Vite integrations for React and Tailwind v4 |
| `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `radix-ui` (or `@radix-ui/react-*`, whichever the shadcn CLI installs), `react-day-picker` | Dependencies of shadcn/ui primitives and the Calendar/DatePicker |
| `@hookform/resolvers` | `zodResolver` for React Hook Form |
| `@tanstack/react-query-devtools` | Spec §6.2: devtools in development |
| `js-cookie`, `@types/js-cookie` | Spec §6.5 names js-cookie |
| `eslint-plugin-import-x`, `eslint-import-resolver-typescript` | "`import` ordering" (spec §10.1). `import-x` is the maintained flat-config fork. |
| `@eslint/js`, `globals`, `eslint-config-prettier`, `eslint-plugin-storybook`, `eslint-plugin-react-refresh` | Standard flat-config building blocks |
| `@storybook/react-vite`, `@storybook/addon-docs`, `@storybook/addon-a11y` | Storybook for React + Vite, with a11y checks on primitives |
| `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom`, `@vitest/coverage-v8` | Component tests and coverage (spec §10.2) |
| `@axe-core/playwright` | Spec §10.2 allows "`vitest-axe` or `@axe-core/playwright`". This plan picks axe in Playwright; `vitest-axe` is not added. |
| `@types/node` | Types for Node-side config files |

## Deviations & interpretations (flagged to the owner)

1. **Dependency-driven pull-forwards.** Spec §12 orders some modules after the modules that need them. The phase numbering is kept; the minimum is pulled forward and each pull is reported at its gate:
   - Storage wrappers (Phase 4) → **Task 2.1**. Theme persistence in Phase 2 needs them.
   - i18n core init with the `common` and `errors` namespaces (Phase 6) → **Task 2.2**. Primitives contain user-facing sr-only labels.
   - `theme-store` (Phase 5) → **Task 2.5**.
   - The generic `ErrorBoundary` component (Phase 4) → **Task 3.4**. `AsyncBoundary` needs it. Phase 4 then adds logging, the root boundary and global handlers.
2. **`paths.ts` lives at `src/config/paths.ts`.** Features import it, and features must not depend on `src/app`.
3. **`VITE_API_BASE_URL` defaults to `/api`** (same-origin), which we read as the spec's "localhost API". `pnpm dev` and nginx can proxy `/api` to a real backend through **`API_PROXY_TARGET`**. That is a server-side variable, never exposed to the browser, and uses the same name in Vite and Docker. Same-origin keeps the httpOnly cookie strategy CORS-free.
4. **New env var `VITE_FEATURE_FLAGS`**, a comma-separated list of enabled flags, backs `src/config/features.ts` (spec §7.9).
5. **Added files the spec's tree doesn't list:**
   - `openapi/openapi.yaml`: the local fixture spec from decision 3
   - `src/test/design-tokens.guard.test.ts`: enforces Principle 1
   - `src/test/docker-config.guard.test.ts`: keeps the entrypoint whitelist and the Compose defaults in step with `src/config/env.ts`
   - `pnpm-workspace.yaml`: pnpm settings, if pnpm requires it for build-script approvals
   - `scripts/csp-script-hashes.mjs` and `scripts/docker-smoke-test.sh`: the CSP hash build step (Deviation 17) and the image contract test that CI runs
   - `.github/actions/setup/action.yml` (the shared CI setup) and `.github/pull_request_template.md`

   The `/api` proxy block lives inside `docker/nginx.conf.template`, between marker comments. The entrypoint removes it when `API_PROXY_TARGET` is empty, so no extra template file is needed.
6. **Language detection is written in-house** in `src/core/i18n/detect.ts` (saved preference → `navigator.languages` → default). It persists through the storage wrapper, so `i18next-browser-languagedetector` is not needed.
7. **Lazy routes use React Router's data-mode `route.lazy`.** `PageLoader` is the router's `HydrateFallback` and the navigation-pending UI. Layouts also wrap `<Outlet/>` in `AsyncBoundary`, which is a `Suspense` fallback, for suspense queries. This is how we read "PageLoader as the Suspense fallback" in spec §5.4/§7.1.
8. **`session-store` holds the current user and permissions.** They're fetched through the `AuthStrategy` (a direct `http` call, not a query) at bootstrap and on login. That is session identity, not cached server data, so it doesn't break Principle 3. It lives in memory only, with no personal data in storage.
9. **Button sizes are renamed** from shadcn's `default` to `md`, giving `sm | md | lg | icon` as spec §5.3 says. shadcn's hard-coded colours (`bg-black/50`, `text-white`) and px values (`ring-[3px]`, `rounded-[4px]`) are replaced with tokens.
10. **Dependabot** was chosen over Renovate: it's native to GitHub and needs no app install. **Web Vitals** (optional in spec §10.5) is documented but not implemented, to avoid an extra dependency. **brotli** is off because official nginx images don't ship the module; gzip stays on.
11. **`src/core/api/form-errors.ts`** holds `applyServerErrors(form, error)` (spec §7.7), next to the `AppError` it parses.
12. **Version pins below `latest`, for compatibility** (spec §0.5):
    - **ESLint `^9`**, not 10: `eslint-plugin-react` 7.37.5 and `eslint-plugin-jsx-a11y` 6.10.2 only declare peer support up to ESLint 9, and their ESLint 10 fixes are still open PRs.
    - **TypeScript `~6.0.3`**, not 7.0: typescript-eslint 8.71 requires TypeScript below 6.1, and TS 7 has no programmatic API yet.

    Revisit both pins when the plugins catch up.
13. **Docker installs pnpm with `npm install -g pnpm@<packageManager version>`** instead of `corepack enable` (spec §10.4). Corepack is no longer shipped from Node 25 on, and the pnpm maintainers discourage it. The pinned version is still read from `package.json#packageManager`, so the lockfile and CI stay in sync.
14. **shadcn setup:**
    - `components.json` is hand-written with `"style": "new-york"`, which means Radix primitives from the unified `radix-ui` package. The CLI now defaults to Base UI, and its newer `radix-*` styles no longer ship the `form` component that spec §5.3 requires.
    - Generated files import `cn` from shadcn's new `cn` package, and the CLI does not rewrite that import. After every `shadcn add`, rewrite those imports to `@/lib/cn` (spec §5.3: `clsx` + `tailwind-merge`). ESLint forbids importing the `cn` package directly.
    - shadcn's `sonner.tsx` needs `next-themes`, so it is not used. `src/core/notify/toaster.tsx` wraps Sonner with our theme store instead.
15. **Two composites move later:**
    - **`DataTable`** is built in **Phase 3** (Task 3.5), because its loading and empty states reuse the Phase 3 feedback components.
    - **`DatePicker`** is built in **Phase 6** (Task 6.5), because it needs the locale-aware formatters and the date-fns locale for the calendar.
16. **New `scripts/ui-add.mjs` (`pnpm ui:add <component…>`).** It runs `shadcn add` and then applies the mechanical fixes shadcn output needs in this repo:
    - `cn` import → `@/lib/cn`
    - `ring-[3px]` → `ring-3`
    - `ring-ring/50` → `ring-ring`: full-strength focus rings, for 3:1 focus contrast
    - `bg-black/50` → `bg-overlay`
    - `z-50` → `z-modal` / `z-dropdown`
    - `rounded-[4px]` / `rounded-[2px]` → `rounded-sm` / `rounded-xs`
    - removes the `cn` package

    Anything else the design-token guard test flags is fixed by hand.
17. **The Content-Security-Policy is built at container start** (spec §10.4 asks for "a CSP placeholder with a comment on how to tighten it"). A fixed policy baked into the image couldn't allow an API origin chosen at runtime, which would break "same image, different API" (spec §14). So:
    - `scripts/csp-script-hashes.mjs` hashes the inline theme script during the image build.
    - The entrypoint builds a strict default: `script-src 'self'` plus that hash, and `connect-src 'self'` plus the origins of `VITE_API_BASE_URL` and `VITE_SENTRY_DSN`.
    - A new server-side variable, **`CONTENT_SECURITY_POLICY`**, replaces the whole policy when set.

    If the hash ever went wrong, the only effect would be a theme flash while loading; the smoke test checks the hash in CI.

## Global Constraints (library-specific addenda)

- **Zod 4:**
  - `import { z } from 'zod'`.
  - Use the `error` param, never the deprecated `message` param.
  - Use top-level `z.email()` / `z.url()`, not `z.string().email()`.
  - The global error map is set with `z.config({ customError })`.
- **TanStack Query 5.10x:**
  - Mutation callbacks are `onMutate(variables, context)`, `onError(error, variables, onMutateResult, context)` and `onSettled(data, error, variables, onMutateResult, context)`. `context.client` is the `QueryClient`.
  - `fetchQuery` and `prefetchQuery` are deprecated in favour of `queryClient.query()`.
- **Axios 1.20:**
  - Augment with `interface AxiosRequestConfig<D = any, P = any>`, repeating both generics.
  - Set `transitional: { clarifyTimeoutError: true }` so timeouts report `ETIMEDOUT`.
  - Check `isCancel(e)` before `isAxiosError(e)`.
- **React Router 8:** import from `react-router`; `RouterProvider` for the app comes from `react-router/dom`. There is no `react-router-dom`.
- **TanStack Table v9:**
  - `useTable({ features, columns, data })` with `tableFeatures({...})`.
  - Row models are feature slots, and state is read from `table.state`.
  - There is no `useReactTable` or `getCoreRowModel`.
- **MSW 3:**
  - Use `onUnhandledFrame` (not `onUnhandledRequest`).
  - `worker.stop()` returns a Promise.
  - Read cookies from the resolver's `cookies` argument.
  - A mocked `Set-Cookie` is forwarded to `document.cookie` in the browser, but not in jsdom.
  - Relative handler URLs resolve against `location`, which is `http://localhost:3000` in Vitest's jsdom.
  - There is no postinstall script, so re-run `pnpm exec msw init public` after upgrading msw.
- **i18next 26:**
  - `initAsync: false` for synchronous init with bundled resources (`initImmediate` is gone).
  - Namespaced keys are written `ns:key`.
- **Sentry 11:** `sendDefaultPii` is gone. Privacy is controlled by `dataCollection`, which collects by default, so the template turns collection off explicitly.
- **lucide-react 1.x:** icons are named exports, e.g. `import { SunIcon } from 'lucide-react'`.

## Verified toolchain (researched 2026-09-30)

`pnpm add` resolves the newest versions at execution time. These are the versions this plan's code was written against, plus the API changes that matter:

| Tool | Version | What changed and matters here |
|---|---|---|
| Node.js | **24.x LTS** (24.21.0) | `.nvmrc` = `24`. Node 26 becomes LTS on 2026-10-28; upgrade later. Minimum floor is 24.15 because jsdom 30 needs it. |
| pnpm | **12.8.x** | Settings live in `pnpm-workspace.yaml`; the `package.json#pnpm` field is no longer read. `allowBuilds` map. `strictDepBuilds` is on by default, so install **fails** on unapproved build scripts. `minimumReleaseAge` is 1 day by default. `packageManager` pin honoured (`pmOnFail: download`). |
| TypeScript | **~6.0.3** | Defaults: `strict: true`, `types: []` (list `vite/client` / `node` explicitly), `noUncheckedSideEffectImports: true`. `baseUrl` deprecated (use `paths` only). `erasableSyntaxOnly` ⇒ **no enums, namespaces or constructor parameter properties**. `verbatimModuleSyntax` ⇒ **`import type` for types**. |
| Vite / @vitejs/plugin-react | **8.3** / **6.1** | Rolldown + Oxc. `build.rolldownOptions` replaces `rollupOptions`. plugin-react uses Oxc (no Babel). `%VITE_X%` in `index.html` stays literal when the var is undefined. |
| Vitest / coverage-v8 / jsdom | **5.0** / **5.0** / **30.1** | `clearMocks` is on by default. `vi.mock` only at top level. Unawaited `.resolves`/`.rejects` fail the test. Output goes to `.vitest/`. Set `coverage.include` explicitly. Glob thresholds are supported. |
| Testing Library | react 16.3, dom 10.4 (**install explicitly**), user-event 14.6, jest-dom 7.0 (`@testing-library/jest-dom/vitest`) | Auto-cleanup relies on Vitest globals, and this plan keeps `globals: false`, so `cleanup()` is called manually in `src/test/setup.ts`. |
| ESLint / typescript-eslint | **9.39.x** / **8.71** | `defineConfig` + `globalIgnores` from `eslint/config`. `projectService: true`. |
| eslint plugins | react 7.37 (`configs.flat.recommended`, `flat['jsx-runtime']`), react-hooks 7.1 (`configs.flat.recommended` includes the React Compiler rules), jsx-a11y 6.10 (`flatConfigs.recommended`), import-x 4.17 (`importX.flatConfigs.*`, `import-x/resolver-next`), resolver-typescript 4.4, query 5.104 (`configs['flat/recommended']`), prettier 10.1 (`eslint-config-prettier/flat`), storybook 10.6 (`configs['flat/recommended']`), react-refresh 0.5 (`configs.vite`) | — |
| Prettier / tailwind plugin | **3.9** / **0.8** | Tailwind v4 needs `tailwindStylesheet`. The plugin must be listed last. |
| Husky / lint-staged / commitlint | **9.1** / **17.6** / **21.2** | Hook files have no shebang. `HUSKY=0` skips. A missing `.git` exits 0. |
| Storybook | **10.6** | ESM-only config. Essentials (controls, actions, viewport) are built into core. Install `addon-docs` and `addon-a11y` separately. CSF3 is still supported. |
| Playwright / axe | **1.63** / **4.13** | `new AxeBuilder({ page }).withTags([...]).analyze()` |
| Orval | **8.38** | The default `httpClient` is now `fetch`, so set `httpClient: 'axios'`. `output.formatter` replaces `output.prettier`. Mutator signature `(config, options?) => Promise<T>`; export `ErrorType`/`BodyType`. |
| Plop | **4.0.5** | ESM `plopfile.js`. Bypass prompts with `pnpm gen <generator> -- --name <value>`. |
| rollup-plugin-visualizer | **7.1** | ESM-only. Cast to `PluginOption` for Vite 8. |
| Docker bases | `node:24-alpine`, `nginxinc/nginx-unprivileged:stable-alpine-slim` | The nginx image runs as UID 101, port 8080, pid in `/tmp`. `/etc/nginx` is writable; `/usr/share/nginx/html` is root-owned (chown it in the Dockerfile). `envsubst` + BusyBox `wget` are present; there is no curl and no brotli. |
| GitHub Actions | checkout@v7, pnpm/action-setup@v6 (reads `packageManager`), setup-node@v7 (`cache: pnpm`, after pnpm setup), upload-artifact@v7, upload-pages-artifact@v5, deploy-pages@v4, docker/setup-buildx@v4, build-push@v7, login@v4, metadata@v6 | upload-pages-artifact v3+ requires deploy-pages v4+ |
| nginx | `stable-alpine-slim` | `add_header` is dropped in any location that sets its own, so the template sets every header at server level and varies `Cache-Control` through a `map` |
| Runtime libraries | react 19.3, react-router 8.4, @tanstack/react-query 5.104, zustand 5.0, axios 1.20, react-hook-form 7.89, @hookform/resolvers 5.9, zod 4.6, tailwindcss 4.3, shadcn CLI 4.21, radix-ui 1.6, sonner 2.0, i18next 26.4, react-i18next 17.0, date-fns 4.4, @tanstack/react-table 9.2, react-day-picker 10.0, lucide-react 1.49, js-cookie 3.0, msw 3.0, @sentry/react 11.1 | See the library addenda above. |

---

# Phase 0 — Preflight

### Task 0.1: Toolchain and repository initialisation

**Files:**
- Create: `.gitattributes`, `.gitignore`, `.editorconfig`, `.nvmrc`, `docs/superpowers/plans/2026-09-30-react-bedrock-template.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a git repo on branch `main` with LF line endings, Node 24 and pnpm 12 available on PATH.

- [ ] **Step 1 (owner action): Install Node.js 24 LTS**

Use whichever you prefer: the nodejs.org installer, nvm-windows (`nvm install 24 && nvm use 24`), fnm or Volta. Then verify:

Run: `node --version`
Expected: `v24.` followed by a minor version of 15 or higher (for example `v24.21.0`).

- [ ] **Step 2 (owner action): Install pnpm 12**

Run: `npm install -g pnpm@12`, then `pnpm --version`
Expected: `12.x.y`. Write this exact version into `packageManager` in Task 1.1.

- [ ] **Step 3 (owner action): Confirm the git identity that will be published**

Run: `git config user.name` and `git config user.email`
Expected: the name and email the owner wants in the public history. Change them with `git config --global` if not.

- [ ] **Step 4: Initialise the repository**

Run: `git init -b main`
Expected: `Initialized empty Git repository in …/react-bedrock/.git/`

- [ ] **Step 5: Create `.gitattributes`**

```gitattributes
* text=auto eol=lf
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.webp binary
*.ico binary
*.woff binary
*.woff2 binary
```

- [ ] **Step 6: Create `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 7: Create `.nvmrc`**

```text
24
```

- [ ] **Step 8: Create `.gitignore`**

```gitignore
# dependencies
node_modules/

# build output
dist/
storybook-static/
stats.html

# tests
coverage/
.vitest/
playwright-report/
test-results/
blob-report/

# env files (the example is committed)
.env
.env.*
!.env.example

# logs
*.log

# editors / OS
.DS_Store
Thumbs.db
.idea/
.vscode/

# TypeScript incremental build info
*.tsbuildinfo
```

- [ ] **Step 9: Store this plan in the repo**

Copy this plan file verbatim to `docs/superpowers/plans/2026-09-30-react-bedrock-template.md`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: initialise repository" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Verify: `git ls-files --eol` shows `i/lf` for every text file.

---

# Phase 1 — Foundation

Scope (spec §12): Vite + React + TS strict, pnpm, path aliases, ESLint/Prettier, Husky/lint-staged/commitlint, env validation with runtime config (§4), `.editorconfig`, `.nvmrc` (Task 0.1), and Vitest setup.

### Task 1.1: Vite + React + TypeScript scaffold (hand-written, in place)

We hand-write the files instead of running `pnpm create vite`, because create-vite prompts when the folder isn't empty and would scaffold its own boilerplate. The file contents mirror the current `create-vite` react-ts template, with the spec's additions.

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `public/favicon.svg`, `src/main.tsx`, `src/app/App.tsx`

**Interfaces:**
- Produces: the `@/` alias for `src/`; scripts `dev`, `build`, `preview`, `typecheck`; `export function App(): JSX.Element` in `src/app/App.tsx`.

- [ ] **Step 1: Create `package.json`**

Replace `12.8.1` with the exact output of `pnpm --version` from Task 0.1.

```json
{
  "name": "react-bedrock",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.8.1",
  "engines": {
    "node": ">=24.15.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b"
  }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
# pnpm >= 11 reads its settings from this file (not package.json). This repo is a single package.
# Dependencies allowed to run install scripts. pnpm blocks every other one (strictDepBuilds).
allowBuilds:
  esbuild: true
  unrs-resolver: true
```

A later `pnpm add` may fail with an "unreviewed build scripts" error naming another package. If so, check what that script does, add `<name>: true` (or `false` to deny it), and record it in the phase report. If pnpm rejects this file because it has no `packages` key, add `packages: ['.']`.

- [ ] **Step 3: Install the base dependencies**

```bash
pnpm add react react-dom
pnpm add -D typescript@~6.0.3 vite @vitejs/plugin-react @types/react @types/react-dom @types/node@^24
```

Expected: `pnpm-lock.yaml` is created, and `node_modules/.bin/vite` and `node_modules/.bin/tsc` exist.

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: Create `tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "allowArbitraryExtensions": true,
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,

    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "types": ["node"],
    "skipLibCheck": true,

    "module": "nodenext",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 7: Create `vite.config.ts`**

```ts
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
```

- [ ] **Step 8: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>React Bedrock</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Create `public/favicon.svg`**

This is a neutral mark: a dark rounded square with three strata lines.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#18181b"/><path d="M8 11h10M8 16h16M8 21h16" stroke="#fafafa" stroke-width="2.5" stroke-linecap="round"/></svg>
```

- [ ] **Step 10: Create `src/app/App.tsx`**

```tsx
export function App() {
  return <main id="main-content" />;
}
```

- [ ] **Step 11: Create `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 12: Verify typecheck and build**

Run: `pnpm typecheck`
Expected: exits 0 with no output.

Run: `pnpm build`
Expected: `dist/index.html` and `dist/assets/index-<hash>.js` are created.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite react typescript app" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 1.2: Vitest + Testing Library

**Files:**
- Create: `src/test/setup.ts`, `src/app/App.test.tsx`, `docs/testing.md`
- Modify: `vite.config.ts`, `package.json` (scripts)

**Interfaces:**
- Consumes: `App` from Task 1.1.
- Produces:
  - scripts `test`, `test:watch`, `test:coverage`
  - the global test setup file `src/test/setup.ts`, which later tasks append to
  - a jsdom environment at URL `http://localhost:3000`

- [ ] **Step 1: Install test dependencies**

```bash
pnpm add -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom
```

- [ ] **Step 2: Write the failing test `src/app/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('renders the main landmark', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `pnpm exec vitest run`
Expected: FAIL, with `document is not defined` or `Invalid Chai property: toBeInTheDocument`. No DOM environment or matchers exist yet.

- [ ] **Step 4: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest globals are off, so Testing Library's auto-cleanup is not registered: do it here.
afterEach(() => {
  cleanup();
});
```

- [ ] **Step 5: Replace `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stories.tsx',
        'src/**/*.d.ts',
        'src/test/**',
        'src/mocks/**',
        'src/api/generated/**',
        'src/main.tsx',
      ],
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
```

- [ ] **Step 6: Add the scripts to `package.json`**

Add these entries to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 7: Run the test to confirm it passes**

Run: `pnpm test`
Expected: PASS, `1 passed`.

- [ ] **Step 8: Write `docs/testing.md`**

```markdown
# Testing

| Layer | Tool | Location |
|---|---|---|
| Unit, component, integration | Vitest + Testing Library (jsdom) | `src/**/*.test.ts(x)`, next to the code under test |

## Commands

| Command | What it does |
|---|---|
| `pnpm test` | Run all unit/component tests once |
| `pnpm test:watch` | Re-run affected tests on save |
| `pnpm test:coverage` | Run once and write a coverage report to `coverage/` |

## Conventions

- Import `describe`, `it`, `expect` and `vi` from `vitest`. Globals are off, so every file says where its test APIs come from.
- Query the DOM the way users do: `getByRole`, `getByLabelText`, `getByText`. Use `data-testid` only as a last resort.
- Mocks are cleared and restored after every test (`clearMocks` is on by default in Vitest 5, and `restoreMocks: true` is set).
- `src/test/setup.ts` runs before every test file. It registers the jest-dom matchers and unmounts rendered trees after each test.
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "test: set up vitest with testing library" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 1.3: ESLint (flat, type-aware) + Prettier, with the wrapper and layer rules

**Files:**
- Create: `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `docs/architecture.md`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces:
  - scripts `lint` (ESLint + `prettier --check`, zero warnings), `lint:fix`, `format`
  - the lint contracts every later task must satisfy:
    - wrapped-library bans
    - `@/features/*/*` ban
    - `@/core/*/*` ban outside `src/core`
    - layer zones
    - bans on `console` / `localStorage` / `sessionStorage` / `document.cookie` / `import.meta.env` / `window.__APP_CONFIG__`
    - `react/jsx-no-literals`
  - import order: builtin → external → blank line → `@/…` → blank line → relative, alphabetised. `pnpm lint:fix` repairs ordering automatically.

- [ ] **Step 1: Install**

```bash
pnpm add -D eslint@^9 @eslint/js@^9 typescript-eslint globals eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y eslint-plugin-react-refresh eslint-plugin-import-x eslint-import-resolver-typescript @tanstack/eslint-plugin-query eslint-config-prettier prettier
```

- [ ] **Step 2: Create `eslint.config.js`**

```js
import js from '@eslint/js';
import pluginQuery from '@tanstack/eslint-plugin-query';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { createNodeResolver, importX } from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Spec Principle 2: each wrapped library may only be imported inside its home module.
 * Everything else goes through the wrapper.
 */
const WRAPPED = [
  { files: ['src/core/api/**'], paths: ['axios'], message: 'Use `http` from @/core/api.' },
  { files: ['src/core/notify/**'], paths: ['sonner'], message: 'Use `notify` from @/core/notify.' },
  { files: ['src/core/storage/**'], paths: ['js-cookie'], message: 'Use `cookies` from @/core/storage.' },
  { files: ['src/core/logger/**'], patterns: ['@sentry/*'], message: 'Use `logger` from @/core/logger.' },
  { files: ['src/lib/format.ts'], patterns: ['date-fns', 'date-fns/*'], message: 'Use the formatters in @/lib/format.' },
];

/**
 * Options for `no-restricted-imports`.
 * @param {{ allow?: number, insideCore?: boolean }} [options] `allow` is the WRAPPED index whose home is being linted.
 */
function restrictedImports({ allow = -1, insideCore = false } = {}) {
  const active = WRAPPED.filter((_, index) => index !== allow);
  return [
    'error',
    {
      paths: [
        { name: 'cn', message: 'Use `cn` from @/lib/cn.' },
        ...active.flatMap((w) => (w.paths ?? []).map((name) => ({ name, message: w.message }))),
      ],
      patterns: [
        { group: ['@/features/*/*'], message: 'Import a feature only through its public index: @/features/<name>.' },
        ...(insideCore
          ? []
          : [{ group: ['@/core/*/*'], message: 'Import core modules through their index: @/core/<module>.' }]),
        ...active.flatMap((w) => (w.patterns ? [{ group: w.patterns, message: w.message }] : [])),
      ],
    },
  ];
}

/** Layering rules (docs/architecture.md). */
const LAYER_ZONES = [
  {
    target: ['./src/config', './src/lib', './src/core', './src/components', './src/hooks', './src/stores', './src/features', './src/mocks', './src/locales', './src/types'],
    from: './src/app',
    message: 'Only src/main.tsx and src/test may import from src/app.',
  },
  {
    target: ['./src/config', './src/lib'],
    from: ['./src/core', './src/components', './src/features', './src/hooks', './src/stores', './src/mocks'],
    message: 'config/ and lib/ are leaf layers.',
  },
  {
    target: './src/core',
    from: ['./src/features', './src/components/layout'],
    message: 'core/ must stay extractable: no feature or layout imports.',
  },
  {
    target: ['./src/components', './src/hooks', './src/stores'],
    from: './src/features',
    message: 'Shared code must not depend on features.',
  },
];

const STORAGE_HINT = 'Use `localStore` / `sessionStore` from @/core/storage.';
const ENV_HINT = 'Read configuration from `env` (@/config/env).';

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    '.vitest',
    'storybook-static',
    'playwright-report',
    'test-results',
    'src/api/generated',
    'public/mockServiceWorker.js',
    'plop/templates',
  ]),

  // Plain JS config files (Node) and the browser runtime-config stub.
  { files: ['**/*.{js,mjs,cjs}'], extends: [js.configs.recommended], languageOptions: { globals: globals.node } },
  { files: ['public/**/*.js'], languageOptions: { globals: globals.browser } },

  // All TypeScript: type-aware rules + import hygiene.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ alwaysTryTypes: true }), createNodeResolver()],
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
      'import-x/no-unresolved': ['error', { ignore: ['\\?(raw|url)$'] }],
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // Application source (browser, React).
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
      reactRefresh.configs.vite,
      pluginQuery.configs['flat/recommended'],
    ],
    languageOptions: { globals: globals.browser },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/prop-types': 'off',
      // We do not run the React Compiler, so compiler-compatibility warnings are noise.
      'react-hooks/incompatible-library': 'off',
      // Spec DoD: no hard-coded user-facing strings. Text goes through i18next.
      'react/jsx-no-literals': ['error', { allowedStrings: ['·', '—', '–', '…', '/', '|', '•', '*', ':', '%', '(', ')', '+', '-', '×'] }],
      'no-console': 'error',
      'no-restricted-imports': restrictedImports(),
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: STORAGE_HINT },
        { name: 'sessionStorage', message: STORAGE_HINT },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: STORAGE_HINT },
        { object: 'window', property: 'sessionStorage', message: STORAGE_HINT },
        { object: 'document', property: 'cookie', message: 'Use `cookies` from @/core/storage.' },
        { object: 'window', property: '__APP_CONFIG__', message: ENV_HINT },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "MemberExpression[object.type='MetaProperty'][property.name='env']", message: ENV_HINT },
      ],
      'import-x/no-restricted-paths': ['error', { zones: LAYER_ZONES }],
    },
  },

  // Wrapper homes: core may deep-import itself, and each home may import its own library.
  { files: ['src/core/**/*.{ts,tsx}'], rules: { 'no-restricted-imports': restrictedImports({ insideCore: true }) } },
  ...WRAPPED.map((w, index) => ({
    files: w.files,
    rules: { 'no-restricted-imports': restrictedImports({ allow: index, insideCore: w.files[0].startsWith('src/core') }) },
  })),
  { files: ['src/config/env.ts'], rules: { 'no-restricted-syntax': 'off', 'no-restricted-properties': 'off' } },
  { files: ['src/core/storage/**'], rules: { 'no-restricted-globals': 'off', 'no-restricted-properties': 'off' } },
  { files: ['src/core/logger/**'], rules: { 'no-console': 'off' } },
  { files: ['src/components/ui/**/*.tsx'], rules: { 'react-refresh/only-export-components': 'off' } },

  // Tests, stories and test infrastructure.
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**', '**/*.stories.tsx', 'e2e/**'],
    rules: {
      'react/jsx-no-literals': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  eslintConfigPrettier,
]);
```

- [ ] **Step 3: Create `.prettierrc.json`**

The Tailwind plugin is added in Task 2.3, once Tailwind exists.

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "all"
}
```

- [ ] **Step 4: Create `.prettierignore`**

```gitignore
dist
coverage
.vitest
storybook-static
playwright-report
test-results
pnpm-lock.yaml
public/mockServiceWorker.js
src/api/generated
plop/templates
docs/superpowers
```

- [ ] **Step 5: Add the scripts to `package.json`**

```json
"lint": "eslint . --max-warnings=0 && prettier --check .",
"lint:fix": "eslint . --fix && prettier --write .",
"format": "prettier --write ."
```

- [ ] **Step 6: Format, then lint the current code**

Run: `pnpm format`, then `pnpm lint`
Expected: exits 0. If import-order errors appear, run `pnpm lint:fix`.

- [ ] **Step 7: Prove the guard rules fire**

Create a temporary file `src/lint-probe.tsx`:

```tsx
import axios from 'axios';

console.log(import.meta.env.VITE_APP_NAME, localStorage.length, axios);

export function Probe() {
  return <p>Hello</p>;
}
```

Run: `pnpm exec eslint src/lint-probe.tsx`
Expected: errors from `no-restricted-imports` ("Use `http` from @/core/api."), `no-console`, `no-restricted-syntax` ("Read configuration from `env`"), `no-restricted-globals` and `react/jsx-no-literals`. `import-x/no-unresolved` for axios is also fine, because axios isn't installed yet.

Then delete it: `rm src/lint-probe.tsx`.

- [ ] **Step 8: Write `docs/architecture.md`**

````markdown
# Architecture

React Bedrock is a single-page app built with Vite. Code is organised by **layer**; business code by **feature**.

## Layers and dependency rules

```
config  →  lib  →  core  →  components / hooks / stores  →  features  →  app
(leaf)                                                                  (composition root)
```

An arrow means "may be imported by everything to its right". These rules are enforced by ESLint (`import-x/no-restricted-paths`, `no-restricted-imports`):

| Folder | Purpose | May import |
|---|---|---|
| `src/config` | Validated env, constants, typed paths, feature flags | `config`, `lib` |
| `src/lib` | Pure utilities (`cn`, formatters, ids) | `config`, `lib` |
| `src/core` | App infrastructure: api, auth, logger, notify, storage, i18n, errors | `config`, `lib`, `core`, `stores`, `components/ui`, `components/feedback`, `locales` — never `features`, `components/layout` or `app` (so it can be extracted to a package later) |
| `src/components` | Design system (`ui`), async states (`feedback`), layout (`layout`) | anything except `features` and `app` |
| `src/hooks`, `src/stores` | Shared hooks; Zustand stores (UI/session state only) | anything except `features` and `app` |
| `src/features/<name>` | Business features | anything except `app` and **other features' internals** |
| `src/app` | Providers, router, route pages | everything |

More rules:

- **Features** are imported only through their public `index.ts`: `@/features/items`, never `@/features/items/components/x`.
- **Core modules** are imported through their index (`@/core/api`) from outside `src/core`.
- **Wrapped libraries** are only imported inside their wrapper. Use these instead:

  | Library | Wrapper |
  |---|---|
  | `axios` | `http` from `@/core/api` |
  | `sonner` | `notify` from `@/core/notify` |
  | `js-cookie` | `cookies` from `@/core/storage` |
  | `@sentry/*` | `logger` from `@/core/logger` |
  | `date-fns` | `@/lib/format` |

- **Browser globals** — `localStorage`, `sessionStorage`, `document.cookie`, `console`, `import.meta.env` and `window.__APP_CONFIG__` — are only touched by their wrappers.
- **User-facing text** is never a JSX literal (`react/jsx-no-literals`). Use `t('…')`.

## Tooling

- `pnpm lint` runs ESLint (type-aware, zero warnings) and then `prettier --check`.
- `pnpm lint:fix` applies auto-fixes. Import order is auto-fixable.
````

- [ ] **Step 9: Run lint and tests, then commit**

Run: `pnpm lint && pnpm test`
Expected: both exit 0.

```bash
git add -A
git commit -m "chore: add eslint flat config and prettier with architecture rules" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 1.4: Husky + lint-staged + commitlint

**Files:**
- Create: `.husky/pre-commit`, `.husky/commit-msg`, `lint-staged.config.js`, `commitlint.config.js`, `docs/contributing.md`
- Modify: `package.json` (gets the `prepare` script from `husky init`)

**Interfaces:**
- Produces:
  - a pre-commit hook that runs ESLint `--fix` and Prettier on staged files
  - a commit-msg hook that enforces Conventional Commits
  - the `prepare: husky` script (skip it with `HUSKY=0` in Docker)

- [ ] **Step 1: Install**

```bash
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional
```

- [ ] **Step 2: Initialise Husky**

Run: `pnpm exec husky init`
Expected: `.husky/pre-commit` is created, and `package.json` gains `"prepare": "husky"`.

- [ ] **Step 3: Replace `.husky/pre-commit`**

The file needs no shebang, because Husky 9 runs it with `sh`.

```sh
pnpm exec lint-staged
```

- [ ] **Step 4: Create `.husky/commit-msg`**

```sh
pnpm exec commitlint --edit "$1"
```

- [ ] **Step 5: Create `lint-staged.config.js`**

```js
export default {
  '*.{ts,tsx,js,mjs,cjs}': ['eslint --fix --max-warnings=0 --no-warn-ignored', 'prettier --write --ignore-unknown'],
  '*.{json,md,css,html,yml,yaml}': ['prettier --write --ignore-unknown'],
};
```

- [ ] **Step 6: Create `commitlint.config.js`**

```js
export default {
  extends: ['@commitlint/config-conventional'],
};
```

- [ ] **Step 7: Verify commitlint accepts and rejects messages**

Run: `echo "updated stuff" | pnpm exec commitlint`
Expected: exits 1, reporting `subject may not be empty` and `type may not be empty`.

Run: `echo "chore: verify commitlint" | pnpm exec commitlint`
Expected: exits 0.

- [ ] **Step 8: Write `docs/contributing.md`**

```markdown
# Contributing

## Workflow

1. Branch from `main`: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`.
2. Keep commits small and focused. Each commit message follows [Conventional Commits](https://www.conventionalcommits.org/):
   `type(optional-scope): summary`, where type is one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
3. Before pushing, run `pnpm lint && pnpm typecheck && pnpm test`.
4. Open a pull request and fill in the checklist below.

## Git hooks (installed automatically by `pnpm install`)

| Hook | Runs |
|---|---|
| `pre-commit` | `lint-staged`: ESLint `--fix` + Prettier on staged files only |
| `commit-msg` | `commitlint`: rejects messages that are not Conventional Commits |

Set `HUSKY=0` to skip installing hooks (CI images, Docker builds).

## Pull request checklist

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass locally
- [ ] New UI text exists in every locale (`src/locales/*`)
- [ ] Async views handle loading, empty, error and success states
- [ ] No new direct imports of wrapped libraries (ESLint enforces this)
- [ ] Docs in `docs/` updated for any new module or convention
```

- [ ] **Step 9: Commit (this runs both hooks for the first time)**

```bash
git add -A
git commit -m "chore: add husky, lint-staged and commitlint" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: lint-staged output appears, then the commit succeeds.

### Task 1.5: Environment validation with runtime config (spec §4)

**Files:**
- Create:
  - `src/config/env.ts` and `src/config/env.test.ts`
  - `src/config/constants.ts`
  - `src/vite-env.d.ts`, `src/types/global.d.ts`
  - `public/config.js`, `.env.example`
  - `src/app/config-error-screen.tsx` and `src/app/config-error-screen.test.tsx`
- Modify: `vite.config.ts`, `index.html`, `src/main.tsx`, `docs/architecture.md`

**Interfaces:**
- Produces (used by almost every later task):
  - `export const env: AppEnv`, with every `VITE_*` value typed plus `isDev`, `isProd`, `isTest`. `VITE_FEATURE_FLAGS` is `string[]`.
  - `export const envIssues: readonly string[]`
  - `export function parseEnv(sources: EnvSources): EnvResult`
  - `export const ENV_KEYS: readonly EnvKey[]`
  - `export type AppEnvironment = 'development' | 'staging' | 'production'`
  - `export type LogLevel = 'debug' | 'info' | 'warn' | 'error'`
  - `export const LOG_LEVELS`
  - From `src/config/constants.ts`: `APP_VERSION`, `GIT_SHA`, `SUPPORTED_LOCALES = ['en', 'es'] as const`, `type Locale`
  - The `window.__APP_CONFIG__` global type

- [ ] **Step 1: Install Zod**

Run: `pnpm add zod`

- [ ] **Step 2: Create `src/config/constants.ts`**

```ts
/** App-wide constants. Environment-specific values belong in `env` (./env.ts), not here. */

/** Version and git SHA of this build, injected by `define` in vite.config.ts. */
export const APP_VERSION = __APP_VERSION__;
export const GIT_SHA = __GIT_SHA__;

/** Locales with bundled translations in src/locales/<locale>/. */
export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
```

- [ ] **Step 3: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_DEFAULT_LOCALE?: string;
  readonly VITE_DEFAULT_CURRENCY?: string;
  readonly VITE_ENABLE_MOCKS?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_LOG_LEVEL?: string;
  readonly VITE_FEATURE_FLAGS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected by `define` in vite.config.ts. */
declare const __APP_VERSION__: string;
declare const __GIT_SHA__: string;
```

- [ ] **Step 4: Create `src/types/global.d.ts`**

```ts
export {};

declare global {
  interface Window {
    /**
     * Runtime configuration written by /config.js (docker/docker-entrypoint.sh in containers).
     * Only src/config/env.ts may read it.
     */
    __APP_CONFIG__?: Record<string, string | undefined>;
  }
}
```

- [ ] **Step 5: Write the failing tests `src/config/env.test.ts`**

```ts
import { describe, expect, it } from 'vitest';

import envExample from '/.env.example?raw';

import { ENV_KEYS, parseEnv } from './env';

const DEV = { dev: true, prod: false, test: false };
const PROD = { dev: false, prod: true, test: false };

describe('parseEnv', () => {
  it('starts with safe defaults when nothing is configured', () => {
    const result = parseEnv({ buildTime: {}, mode: DEV });

    expect(result.ok).toBe(true);
    expect(result.env).toMatchObject({
      VITE_APP_NAME: 'React Bedrock',
      VITE_API_BASE_URL: '/api',
      VITE_APP_ENV: 'development',
      VITE_DEFAULT_LOCALE: 'en',
      VITE_DEFAULT_CURRENCY: 'USD',
      VITE_ENABLE_MOCKS: true,
      VITE_LOG_LEVEL: 'debug',
      VITE_FEATURE_FLAGS: [],
      isDev: true,
      isProd: false,
    });
    expect(result.env.VITE_SENTRY_DSN).toBeUndefined();
  });

  it('lets runtime config override build-time values', () => {
    const result = parseEnv({
      buildTime: { VITE_API_BASE_URL: 'http://localhost:3000/api' },
      runtime: { VITE_API_BASE_URL: 'https://api.example.com' },
      mode: PROD,
    });

    expect(result.env.VITE_API_BASE_URL).toBe('https://api.example.com');
  });

  it('treats empty and blank strings as unset', () => {
    const result = parseEnv({
      buildTime: { VITE_SENTRY_DSN: '' },
      runtime: { VITE_APP_NAME: '   ' },
      mode: DEV,
    });

    expect(result.ok).toBe(true);
    expect(result.env.VITE_APP_NAME).toBe('React Bedrock');
    expect(result.env.VITE_SENTRY_DSN).toBeUndefined();
  });

  it('parses booleans and comma-separated feature flags', () => {
    const result = parseEnv({
      buildTime: { VITE_ENABLE_MOCKS: 'false', VITE_FEATURE_FLAGS: 'alpha, beta,,' },
      mode: DEV,
    });

    expect(result.env.VITE_ENABLE_MOCKS).toBe(false);
    expect(result.env.VITE_FEATURE_FLAGS).toEqual(['alpha', 'beta']);
  });

  it('derives the environment and log level from the build mode', () => {
    const result = parseEnv({ buildTime: {}, mode: PROD });

    expect(result.env.VITE_APP_ENV).toBe('production');
    expect(result.env.VITE_LOG_LEVEL).toBe('warn');
  });

  it('ignores keys it does not know', () => {
    const result = parseEnv({ buildTime: { VITE_UNKNOWN: 'x', PATH: '/usr/bin' }, mode: DEV });

    expect(result.ok).toBe(true);
    expect(result.env).not.toHaveProperty('VITE_UNKNOWN');
  });

  it('reports every invalid variable by name and falls back to defaults', () => {
    const result = parseEnv({
      buildTime: { VITE_DEFAULT_CURRENCY: 'dollars', VITE_API_BASE_URL: 'ftp://files.example.com' },
      mode: DEV,
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toHaveLength(2);
    expect(result.issues.join('\n')).toMatch(/VITE_DEFAULT_CURRENCY/);
    expect(result.issues.join('\n')).toMatch(/VITE_API_BASE_URL/);
    expect(result.env.VITE_DEFAULT_CURRENCY).toBe('USD');
  });
});

describe('.env.example', () => {
  it('documents every supported variable', () => {
    const documented = [...envExample.matchAll(/^#?\s*(VITE_[A-Z_]+)=/gm)].map((match) => match[1]);

    expect(new Set(documented)).toEqual(new Set(ENV_KEYS));
  });
});
```

- [ ] **Step 6: Run the tests to confirm they fail**

Run: `pnpm exec vitest run src/config/env.test.ts`
Expected: FAIL, with `Failed to resolve import "./env"` and `"/.env.example?raw"`.

- [ ] **Step 7: Create `src/config/env.ts`**

```ts
import { z } from 'zod';

import { SUPPORTED_LOCALES } from './constants';

export const APP_ENVIRONMENTS = ['development', 'staging', 'production'] as const;
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];
export type LogLevel = (typeof LOG_LEVELS)[number];

function isHttpUrlOrAbsolutePath(value: string): boolean {
  if (value.startsWith('/')) return true;
  try {
    return new URL(value).protocol.startsWith('http');
  } catch {
    return false;
  }
}

/** Every configuration value, each with a safe default so the app starts with no .env at all. */
export const envSchema = z.object({
  VITE_APP_NAME: z.string().min(1).default('React Bedrock'),
  VITE_API_BASE_URL: z
    .string()
    .refine(isHttpUrlOrAbsolutePath, { error: 'Must be an http(s) URL or a path starting with "/"' })
    .default('/api'),
  VITE_APP_ENV: z.enum(APP_ENVIRONMENTS).optional(),
  VITE_DEFAULT_LOCALE: z.enum(SUPPORTED_LOCALES).default('en'),
  VITE_DEFAULT_CURRENCY: z
    .string()
    .regex(/^[A-Z]{3}$/, { error: 'Must be a 3-letter ISO 4217 code, e.g. USD' })
    .default('USD'),
  VITE_ENABLE_MOCKS: z.stringbool().default(true),
  VITE_SENTRY_DSN: z.url().optional(),
  VITE_LOG_LEVEL: z.enum(LOG_LEVELS).optional(),
  VITE_FEATURE_FLAGS: z
    .string()
    .default('')
    .transform((csv) =>
      csv
        .split(',')
        .map((flag) => flag.trim())
        .filter(Boolean),
    ),
});

export type EnvKey = keyof z.input<typeof envSchema>;

/** Names of every supported variable (used by guard tests, docs and the Docker entrypoint whitelist). */
export const ENV_KEYS: readonly EnvKey[] = envSchema.keyof().options;

export interface AppEnv
  extends Omit<z.output<typeof envSchema>, 'VITE_APP_ENV' | 'VITE_LOG_LEVEL'> {
  VITE_APP_ENV: AppEnvironment;
  VITE_LOG_LEVEL: LogLevel;
  /** Vite dev server or Vitest (`import.meta.env.DEV`). */
  isDev: boolean;
  /** Production bundle (`import.meta.env.PROD`). */
  isProd: boolean;
  /** Running under Vitest. */
  isTest: boolean;
}

export interface BuildMode {
  dev: boolean;
  prod: boolean;
  test: boolean;
}

export interface EnvSources {
  /** Build-time values (`import.meta.env`). */
  buildTime: Readonly<Record<string, unknown>>;
  /** Runtime values (`window.__APP_CONFIG__` from /config.js). These win over build-time values. */
  runtime?: Readonly<Record<string, unknown>> | undefined;
  mode: BuildMode;
}

export type EnvResult =
  | { ok: true; env: AppEnv; issues: readonly string[] }
  | { ok: false; env: AppEnv; issues: readonly string[] };

/** Keeps only known keys that have a non-blank scalar value, as trimmed strings. */
function pickDefined(
  source: Readonly<Record<string, unknown>> | undefined,
): Partial<Record<EnvKey, string>> {
  const picked: Partial<Record<EnvKey, string>> = {};
  if (!source) return picked;
  for (const key of ENV_KEYS) {
    const value = source[key];
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      continue;
    }
    const text = String(value).trim();
    if (text !== '') picked[key] = text;
  }
  return picked;
}

function finalize(values: z.output<typeof envSchema>, mode: BuildMode): AppEnv {
  return {
    ...values,
    VITE_APP_ENV: values.VITE_APP_ENV ?? (mode.prod ? 'production' : 'development'),
    VITE_LOG_LEVEL: values.VITE_LOG_LEVEL ?? (mode.prod ? 'warn' : 'debug'),
    isDev: mode.dev,
    isProd: mode.prod,
    isTest: mode.test,
  };
}

/** Merges build-time and runtime config (runtime wins) and validates the result. Never throws. */
export function parseEnv({ buildTime, runtime, mode }: EnvSources): EnvResult {
  const merged = { ...pickDefined(buildTime), ...pickDefined(runtime) };
  const result = envSchema.safeParse(merged);
  if (result.success) return { ok: true, env: finalize(result.data, mode), issues: [] };
  return {
    ok: false,
    env: finalize(envSchema.parse({}), mode),
    issues: result.error.issues.map((issue) => `${issue.path.map(String).join('.')}: ${issue.message}`),
  };
}

const result = parseEnv({
  buildTime: import.meta.env,
  runtime: window.__APP_CONFIG__,
  mode: {
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    test: import.meta.env.MODE === 'test',
  },
});

if (!result.ok && import.meta.env.PROD) {
  // Spec §4: production builds refuse to start with invalid configuration.
  throw new Error(`Invalid app configuration:\n${result.issues.join('\n')}`);
}

/**
 * Validated, typed configuration.
 * This module is the only place allowed to read import.meta.env or window.__APP_CONFIG__.
 */
export const env: AppEnv = result.env;

/** Validation problems (development only). main.tsx renders ConfigErrorScreen when non-empty. */
export const envIssues: readonly string[] = result.issues;
```

- [ ] **Step 8: Create `.env.example`**

```dotenv
# Copy to .env.local (git-ignored) and adjust. Every variable is optional: the app runs with none set.
# The same names can be set when a container starts (docker compose / docker run -e). See docs/docker.md.
# Everything prefixed VITE_ is PUBLIC: it is shipped to the browser. Never put secrets here.

# Display name. Also namespaces browser storage keys (e.g. "react-bedrock:theme").
VITE_APP_NAME=React Bedrock
# Base URL for API calls. A path such as /api keeps calls same-origin (proxied, cookie-friendly).
VITE_API_BASE_URL=/api
# development | staging | production (default: derived from the build mode)
# VITE_APP_ENV=development
# Default language when no saved or browser preference matches: en | es
VITE_DEFAULT_LOCALE=en
# ISO 4217 currency used by formatCurrency()
VITE_DEFAULT_CURRENCY=USD
# true = Mock Service Worker answers API calls, so no backend is needed. Set false for real deployments.
VITE_ENABLE_MOCKS=true
# Sentry DSN. Leave empty to keep the Sentry transport off.
VITE_SENTRY_DSN=
# debug | info | warn | error (default: debug in development, warn in production builds)
# VITE_LOG_LEVEL=debug
# Comma-separated feature flags to enable, e.g. itemsBulkDelete,newDashboard
VITE_FEATURE_FLAGS=

# --- Server-side only (never sent to the browser) ---
# Forward /api to a real backend in `pnpm dev`, `pnpm preview` and the nginx container, e.g. http://localhost:3000
API_PROXY_TARGET=
```

- [ ] **Step 9: Run the tests to confirm they pass**

Run: `pnpm exec vitest run src/config/env.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 10: Create `public/config.js`**

```js
// Runtime configuration (spec §4). In local dev this stays an empty stub.
// In Docker it is regenerated at container start by docker/docker-entrypoint.sh.
// Everything in this file is PUBLIC: never put secrets here.
window.__APP_CONFIG__ = {};
```

- [ ] **Step 11: Replace `index.html`**

`config.js` must load before the bundle.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>React Bedrock</title>
    <!-- Runtime config (spec §4): defines window.__APP_CONFIG__ before the app bundle runs. -->
    <script src="/config.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 12: Write the failing test `src/app/config-error-screen.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ConfigErrorScreen } from './config-error-screen';

describe('ConfigErrorScreen', () => {
  it('lists every configuration problem', () => {
    render(<ConfigErrorScreen issues={['VITE_DEFAULT_CURRENCY: Must be a 3-letter ISO 4217 code, e.g. USD']} />);

    expect(screen.getByRole('heading', { name: 'Invalid configuration' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('VITE_DEFAULT_CURRENCY');
  });
});
```

- [ ] **Step 13: Create `src/app/config-error-screen.tsx`**

The token classes take effect once Tailwind lands in Task 2.3.

```tsx
/* eslint-disable react/jsx-no-literals -- Developer-facing, dev-only screen shown before i18n can be trusted (spec §4). */

interface ConfigErrorScreenProps {
  issues: readonly string[];
}

/** Full-screen error shown in development when environment validation fails (spec §4). */
export function ConfigErrorScreen({ issues }: ConfigErrorScreenProps) {
  return (
    <main className="bg-background text-foreground min-h-screen p-8">
      <div role="alert">
        <h1 className="text-destructive text-2xl font-semibold">Invalid configuration</h1>
        <p className="text-muted-foreground mt-2">
          Fix these variables in <code>.env.local</code> (see <code>.env.example</code>) or in the
          runtime <code>config.js</code>, then reload.
        </p>
        <ul className="mt-6 list-disc space-y-2 pl-6 font-mono text-sm">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
```

- [ ] **Step 14: Replace `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import { ConfigErrorScreen } from '@/app/config-error-screen';
import { envIssues } from '@/config/env';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    {envIssues.length > 0 ? <ConfigErrorScreen issues={envIssues} /> : <App />}
  </StrictMode>,
);
```

- [ ] **Step 15: Replace `vite.config.ts`**

This adds the build metadata and the optional same-origin `/api` proxy.

```ts
/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Server-side only, never exposed to the browser: forwards /api to a real backend when set.
  const apiProxyTarget = loadEnv(mode, process.cwd(), '').API_PROXY_TARGET;
  const proxy = apiProxyTarget
    ? { '/api': { target: apiProxyTarget, changeOrigin: true } }
    : undefined;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.APP_VERSION ?? pkg.version),
      __GIT_SHA__: JSON.stringify(process.env.GIT_SHA ?? 'local'),
    },
    server: { proxy },
    preview: { proxy },
    test: {
      environment: 'jsdom',
      environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/**/*.stories.tsx',
          'src/**/*.d.ts',
          'src/test/**',
          'src/mocks/**',
          'src/api/generated/**',
          'src/main.tsx',
        ],
        reporter: ['text', 'html', 'lcov'],
      },
    },
  };
});
```

- [ ] **Step 16: Append a "Configuration" section to `docs/architecture.md`**

```markdown
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
```

- [ ] **Step 17: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all exit 0, with 10 tests passing.

```bash
git add -A
git commit -m "feat(config): validate env with zod and support runtime config.js" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Phase 1 gate

- [ ] Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Expected: all green, and `dist/config.js` exists (copied from `public/`).
- [ ] Manual check: run `pnpm dev`, open http://localhost:5173 and confirm there are no console errors. Then put `VITE_DEFAULT_CURRENCY=dollars` in `.env.local`, restart, and confirm the "Invalid configuration" screen lists `VITE_DEFAULT_CURRENCY`. Delete `.env.local` afterwards.
- [ ] Post the **Phase 1 report**, using the Phase Report template, and **STOP** until the owner approves.

---

# Phase 2 — Design system

Scope (spec §12): Tailwind v4, `tokens.css`, dark mode, theme toggle, shadcn primitives, `cn()`, and Storybook with stories.

This phase also pulls two pieces forward from later phases (Deviation 1): storage wrappers (Task 2.1) and the i18n core (Task 2.2). Two composites move later (Deviation 15): `DataTable` goes to Phase 3, where its loading and empty states exist, and `DatePicker` goes to Phase 6, where locale-aware date formatting exists.

### Task 2.1: Storage wrappers (spec §6.5, pulled forward from Phase 4)

**Files:**
- Create:
  - `src/core/storage/prefix.ts`, `storage-keys.ts`, `typed-storage.ts`, `cookies.ts`, `zustand-storage.ts`, `index.ts`
  - tests: `src/core/storage/typed-storage.test.ts`, `prefix.test.ts`, `cookies.test.ts`, `zustand-storage.test.ts`
  - `docs/security.md`
- Modify: `src/test/setup.ts`

**Interfaces:**
- Consumes: `env.VITE_APP_NAME` and `env.isProd` from `@/config/env`.
- Produces (all from `@/core/storage`):
  - `toStoragePrefix(appName: string): string` — `"React Bedrock"` → `"react-bedrock:"`, and `"app:"` when the slug is empty
  - `STORAGE_KEYS = { theme: 'theme', locale: 'locale', ui: 'ui' } as const` and `type StorageKey`
  - `interface TypedStorage<K extends string>`:
    - `get<T>(key, { schema? }): T | null`
    - `set<T>(key, value: T, { ttlMs? }): boolean`
    - `remove(key): void`
    - `clear(): void` — removes this app's prefixed keys only
  - `createTypedStorage<K>(getBackend, prefix, now?)`
  - `localStore`, `sessionStore` (both `TypedStorage<StorageKey>`) and `storagePrefix`
  - `cookies.get(name)`, `cookies.set(name, value, options?)`, `cookies.remove(name, options?)`
  - `createZustandStorage<S>(store): PersistStorage<S>`
  - **Stored format:** `localStorage["react-bedrock:theme"] = '{"v":<value>,"e":<expiresAtMs?>}'`. The theme bootstrap script in Task 2.5 depends on it.

- [ ] **Step 1: Install**

Zustand is only used here for its persist types; the stores come in Task 2.5.

```bash
pnpm add js-cookie zustand
pnpm add -D @types/js-cookie
```

- [ ] **Step 2: Write the failing tests**

`src/core/storage/prefix.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { toStoragePrefix } from './prefix';

describe('toStoragePrefix', () => {
  it.each([
    ['React Bedrock', 'react-bedrock:'],
    ['  My App 2.0 ', 'my-app-2-0:'],
    ['!!!', 'app:'],
  ])('turns %j into %j', (appName, prefix) => {
    expect(toStoragePrefix(appName)).toBe(prefix);
  });
});
```

`src/core/storage/typed-storage.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createTypedStorage } from './typed-storage';

type Key = 'a' | 'b';

describe('createTypedStorage', () => {
  let now = 1_000;
  const store = createTypedStorage<Key>(() => window.localStorage, 'test:', () => now);

  beforeEach(() => {
    now = 1_000;
  });

  it('round-trips JSON values under the prefix', () => {
    expect(store.set('a', { count: 1 })).toBe(true);
    expect(window.localStorage.getItem('test:a')).toBe('{"v":{"count":1}}');
    expect(store.get('a')).toEqual({ count: 1 });
  });

  it('returns null for missing keys and malformed JSON', () => {
    expect(store.get('a')).toBeNull();
    window.localStorage.setItem('test:a', '{not json');
    expect(store.get('a')).toBeNull();
  });

  it('validates the stored shape when a schema is given', () => {
    const schema = z.object({ count: z.number() });
    store.set('a', { count: 'one' });
    store.set('b', { count: 2 });

    expect(store.get('a', { schema })).toBeNull();
    expect(store.get('b', { schema })).toEqual({ count: 2 });
  });

  it('expires values after their TTL and removes them', () => {
    store.set('a', 'soon gone', { ttlMs: 500 });
    now = 1_499;
    expect(store.get('a')).toBe('soon gone');
    now = 1_500;
    expect(store.get('a')).toBeNull();
    expect(window.localStorage.getItem('test:a')).toBeNull();
  });

  it('clears only its own prefixed keys', () => {
    store.set('a', 1);
    window.localStorage.setItem('other-app:a', 'keep');

    store.clear();

    expect(store.get('a')).toBeNull();
    expect(window.localStorage.getItem('other-app:a')).toBe('keep');
  });

  it('degrades gracefully when storage is unavailable', () => {
    const blocked = createTypedStorage<Key>(() => {
      throw new DOMException('Storage disabled', 'SecurityError');
    }, 'test:');

    expect(blocked.set('a', 1)).toBe(false);
    expect(blocked.get('a')).toBeNull();
    expect(() => {
      blocked.remove('a');
      blocked.clear();
    }).not.toThrow();
  });

  it('returns false when the quota is exceeded', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    expect(store.set('a', 'x')).toBe(false);
  });
});
```

`src/core/storage/cookies.test.ts`:

```ts
import Cookies from 'js-cookie';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { cookies } from './cookies';

describe('cookies', () => {
  afterEach(() => {
    cookies.remove('consent');
  });

  it('sets, reads and removes a cookie', () => {
    cookies.set('consent', 'yes');
    expect(cookies.get('consent')).toBe('yes');

    cookies.remove('consent');
    expect(cookies.get('consent')).toBeUndefined();
  });

  it('applies secure defaults', () => {
    const set = vi.spyOn(Cookies, 'set');

    cookies.set('consent', 'yes', { expires: 7 });

    expect(set).toHaveBeenCalledWith('consent', 'yes', {
      path: '/',
      sameSite: 'Lax',
      secure: false, // jsdom serves http://localhost; Secure is on whenever the page is https
      expires: 7,
    });
  });
});
```

`src/core/storage/zustand-storage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createTypedStorage } from './typed-storage';
import { createZustandStorage } from './zustand-storage';

describe('createZustandStorage', () => {
  it('persists zustand state through the typed storage without double encoding', () => {
    const store = createTypedStorage<'demo'>(() => window.localStorage, 'test:');
    const persistStorage = createZustandStorage<{ count: number }>(store);

    void persistStorage.setItem('demo', { state: { count: 3 }, version: 0 });

    expect(window.localStorage.getItem('test:demo')).toBe('{"v":{"state":{"count":3},"version":0}}');
    expect(persistStorage.getItem('demo')).toEqual({ state: { count: 3 }, version: 0 });

    void persistStorage.removeItem('demo');
    expect(window.localStorage.getItem('test:demo')).toBeNull();
  });
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `pnpm exec vitest run src/core/storage`
Expected: FAIL, because the modules can't be resolved.

- [ ] **Step 4: Create `src/core/storage/prefix.ts`**

```ts
/**
 * Storage namespace derived from the app name: "React Bedrock" → "react-bedrock:".
 * The theme bootstrap script in index.html repeats this logic (guarded by theme-bootstrap.test.ts).
 */
export function toStoragePrefix(appName: string): string {
  const slug = appName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'app'}:`;
}
```

- [ ] **Step 5: Create `src/core/storage/storage-keys.ts`**

```ts
/**
 * Every browser-storage key the app uses (spec §6.5). Use these constants, never string literals.
 * Keys are namespaced with the app prefix automatically.
 * Never add auth tokens or personal data here: see docs/security.md.
 */
export const STORAGE_KEYS = {
  /** Theme preference (light / dark / system). Also read before first paint by index.html. */
  theme: 'theme',
  /** Preferred UI language. */
  locale: 'locale',
  /** Persisted UI layout preferences (sidebar collapsed, …). */
  ui: 'ui',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
```

- [ ] **Step 6: Create `src/core/storage/typed-storage.ts`**

```ts
import type { z } from 'zod';

export interface StorageGetOptions<T> {
  /** Validates the stored shape. A mismatch reads as `null`. */
  schema?: z.ZodType<T>;
}

export interface StorageSetOptions {
  /** Time to live in milliseconds. Once expired, the value reads as `null` and is removed. */
  ttlMs?: number;
}

export interface TypedStorage<K extends string = string> {
  get<T>(key: K, options?: StorageGetOptions<T>): T | null;
  set<T>(key: K, value: T, options?: StorageSetOptions): boolean;
  remove(key: K): void;
  /** Removes only this app's (prefixed) keys. */
  clear(): void;
}

/** What is actually written to storage: `v` = value, `e` = expiry timestamp (ms). */
interface Envelope {
  v: unknown;
  e?: number;
}

function isEnvelope(value: unknown): value is Envelope {
  return typeof value === 'object' && value !== null && 'v' in value;
}

/**
 * JSON storage with namespacing, optional TTL and optional Zod validation.
 * Never throws: an unavailable storage (private mode, disabled, quota) reads as `null` / writes return `false`.
 */
export function createTypedStorage<K extends string>(
  getBackend: () => Storage | undefined,
  prefix: string,
  now: () => number = Date.now,
): TypedStorage<K> {
  const backend = (): Storage | undefined => {
    try {
      return getBackend();
    } catch {
      return undefined;
    }
  };

  const remove = (key: K): void => {
    try {
      backend()?.removeItem(prefix + key);
    } catch {
      // Storage unavailable: nothing to remove.
    }
  };

  return {
    get<T>(key: K, options?: StorageGetOptions<T>): T | null {
      let raw: string | null;
      try {
        raw = backend()?.getItem(prefix + key) ?? null;
      } catch {
        return null;
      }
      if (raw === null) return null;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return null;
      }
      if (!isEnvelope(parsed)) return null;

      if (parsed.e !== undefined && parsed.e <= now()) {
        remove(key);
        return null;
      }
      if (options?.schema) {
        const result = options.schema.safeParse(parsed.v);
        return result.success ? result.data : null;
      }
      return parsed.v as T;
    },

    set<T>(key: K, value: T, options?: StorageSetOptions): boolean {
      const envelope: Envelope = { v: value };
      if (options?.ttlMs !== undefined) envelope.e = now() + options.ttlMs;
      try {
        const store = backend();
        if (!store) return false;
        store.setItem(prefix + key, JSON.stringify(envelope));
        return true;
      } catch {
        return false;
      }
    },

    remove,

    clear(): void {
      try {
        const store = backend();
        if (!store) return;
        const ours: string[] = [];
        for (let index = 0; index < store.length; index += 1) {
          const name = store.key(index);
          if (name?.startsWith(prefix)) ours.push(name);
        }
        for (const name of ours) store.removeItem(name);
      } catch {
        // Storage unavailable: nothing to clear.
      }
    },
  };
}
```

- [ ] **Step 7: Create `src/core/storage/cookies.ts`**

```ts
import Cookies from 'js-cookie';

export interface CookieOptions {
  /** Days until expiry, or an absolute date. Omit it for a session cookie. */
  expires?: number | Date;
  path?: string;
  domain?: string;
  sameSite?: 'Strict' | 'Lax' | 'None';
  secure?: boolean;
}

/**
 * Secure defaults (spec §6.5): SameSite=Lax, whole-site path, and Secure whenever the page is served
 * over HTTPS (always true for production deployments). Tying Secure to the protocol keeps cookies
 * working when a production image is tried over plain http on a LAN address.
 */
function withDefaults(options: CookieOptions = {}): CookieOptions {
  return { path: '/', sameSite: 'Lax', secure: window.location.protocol === 'https:', ...options };
}

/** Readable (non-httpOnly) cookies only. Auth cookies are httpOnly and never touched by the frontend. */
export const cookies = {
  get(name: string): string | undefined {
    return Cookies.get(name);
  },
  set(name: string, value: string, options?: CookieOptions): void {
    Cookies.set(name, value, withDefaults(options));
  },
  remove(name: string, options?: Pick<CookieOptions, 'path' | 'domain'>): void {
    Cookies.remove(name, withDefaults(options));
  },
};
```

- [ ] **Step 8: Create `src/core/storage/zustand-storage.ts`**

```ts
import type { PersistStorage, StorageValue } from 'zustand/middleware';

import type { TypedStorage } from './typed-storage';

/** Adapts a TypedStorage for Zustand's `persist` middleware (values are stored once, not double-encoded). */
export function createZustandStorage<S, K extends string = string>(
  store: TypedStorage<K>,
): PersistStorage<S> {
  return {
    getItem: (name) => store.get<StorageValue<S>>(name as K),
    setItem: (name, value) => {
      store.set(name as K, value);
    },
    removeItem: (name) => {
      store.remove(name as K);
    },
  };
}
```

- [ ] **Step 9: Create `src/core/storage/index.ts`**

```ts
import { env } from '@/config/env';

import { toStoragePrefix } from './prefix';
import type { StorageKey } from './storage-keys';
import { createTypedStorage } from './typed-storage';

export { cookies, type CookieOptions } from './cookies';
export { toStoragePrefix } from './prefix';
export { STORAGE_KEYS, type StorageKey } from './storage-keys';
export {
  createTypedStorage,
  type StorageGetOptions,
  type StorageSetOptions,
  type TypedStorage,
} from './typed-storage';
export { createZustandStorage } from './zustand-storage';

/** Namespace for every key this app writes, derived from VITE_APP_NAME. */
export const storagePrefix = toStoragePrefix(env.VITE_APP_NAME);

export const localStore = createTypedStorage<StorageKey>(() => window.localStorage, storagePrefix);
export const sessionStore = createTypedStorage<StorageKey>(
  () => window.sessionStorage,
  storagePrefix,
);
```

- [ ] **Step 10: Reset browser storage between tests (replace `src/test/setup.ts`)**

```ts
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  // Vitest globals are off, so Testing Library's auto-cleanup is not registered: do it here.
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
```

- [ ] **Step 11: Run the tests to confirm they pass**

Run: `pnpm exec vitest run src/core/storage`
Expected: PASS, 12 tests.

- [ ] **Step 12: Write `docs/security.md`**

This is the first version; later phases add sections.

```markdown
# Security

## Browser storage

- Use `localStore` / `sessionStore` from `@/core/storage`, never `localStorage` or `sessionStorage` directly. ESLint enforces this.
- Every key is declared in `src/core/storage/storage-keys.ts` and namespaced with the app prefix, e.g. `react-bedrock:theme`.
- Values are JSON, optionally with a TTL (`{ ttlMs }`) and optionally validated on read (`{ schema }`). Corrupt, expired or mismatched values read as `null`. An unavailable storage (private mode, quota) never throws.
- **Never store auth tokens or personal data in localStorage or sessionStorage.** Any script on the page can read them, so one XSS bug would leak every token. This template authenticates with an **httpOnly session cookie** that JavaScript cannot read at all (docs/auth.md). Only non-sensitive UI preferences are stored: theme, language, sidebar state.

## Cookies

- `cookies` from `@/core/storage` wraps js-cookie with secure defaults: `SameSite=Lax`, `Path=/`, and `Secure` whenever the page is served over HTTPS.
- The auth session cookie is set by the server as `HttpOnly; Secure; SameSite=Lax`. The frontend never reads or writes it.
```

- [ ] **Step 13: Lint and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(storage): add typed storage and cookie wrappers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2.2: i18n core (spec §7.6, pulled forward from Phase 6)

This task covers only what the primitives need: an initialised instance, typed keys and the `common` namespace in `en` + `es`. Phase 6 adds language detection and persistence, the switcher, the `validation` namespace, the Zod error map, the formatters and missing-key warnings.

**Files:**
- Create:
  - `src/locales/en/common.json`, `src/locales/es/common.json`
  - `src/core/i18n/resources.ts`, `i18next.d.ts`, `i18n.ts`, `index.ts`
  - tests: `src/core/i18n/resources.test.ts`, `src/core/i18n/i18n.test.ts`
  - `docs/i18n.md`
- Modify: `tsconfig.app.json` (add `resolveJsonModule`), `src/test/setup.ts`, `src/main.tsx`

**Interfaces:**
- Produces:
  - `i18n` (from `@/core/i18n`): the i18next instance, initialised synchronously with `lng = env.VITE_DEFAULT_LOCALE`
  - `resources`, `namespaces`, `defaultNS = 'common'`, `type Namespace`
  - typed keys: `t('unknown.key')` is a compile error
  - **Convention for later tasks:** "add keys" means deep-merge the given JSON into both `src/locales/en/<ns>.json` and `src/locales/es/<ns>.json`. A new namespace is registered in `resources.ts` for **every** locale.

- [ ] **Step 1: Install**

Run: `pnpm add i18next react-i18next`

- [ ] **Step 2: Add `"resolveJsonModule": true` to `compilerOptions` in `tsconfig.app.json`**

Put it just after `"allowImportingTsExtensions": true,`.

- [ ] **Step 3: Create `src/locales/en/common.json`**

```json
{
  "actions": {
    "close": "Close",
    "more": "More"
  },
  "status": {
    "loading": "Loading"
  },
  "pagination": {
    "label": "Pagination",
    "previous": "Previous",
    "next": "Next",
    "previousPage": "Go to previous page",
    "nextPage": "Go to next page",
    "morePages": "More pages"
  },
  "breadcrumb": {
    "label": "Breadcrumb"
  },
  "theme": {
    "change": "Change theme",
    "light": "Light",
    "dark": "Dark",
    "system": "System"
  }
}
```

- [ ] **Step 4: Create `src/locales/es/common.json`**

```json
{
  "actions": {
    "close": "Cerrar",
    "more": "Más"
  },
  "status": {
    "loading": "Cargando"
  },
  "pagination": {
    "label": "Paginación",
    "previous": "Anterior",
    "next": "Siguiente",
    "previousPage": "Ir a la página anterior",
    "nextPage": "Ir a la página siguiente",
    "morePages": "Más páginas"
  },
  "breadcrumb": {
    "label": "Ruta de navegación"
  },
  "theme": {
    "change": "Cambiar tema",
    "light": "Claro",
    "dark": "Oscuro",
    "system": "Sistema"
  }
}
```

- [ ] **Step 5: Write the failing tests**

`src/core/i18n/resources.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { SUPPORTED_LOCALES } from '@/config/constants';

import { namespaces, resources } from './resources';

/** Flattens nested translations into [dotted.key, value] pairs. */
function flatten(value: unknown, prefix = ''): [string, unknown][] {
  if (typeof value !== 'object' || value === null) return [[prefix, value]];
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

const keysOf = (value: unknown) =>
  flatten(value)
    .map(([key]) => key)
    .sort((a, b) => a.localeCompare(b));

describe('translation resources', () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const ns of namespaces) {
      it(`${locale}/${ns} has exactly the keys of en/${ns}`, () => {
        expect(keysOf(resources[locale][ns])).toEqual(keysOf(resources.en[ns]));
      });

      it(`${locale}/${ns} has no empty or non-string values`, () => {
        for (const [key, text] of flatten(resources[locale][ns])) {
          expect(typeof text === 'string' && text.trim() !== '', `${locale}/${ns}:${key}`).toBe(true);
        }
      });
    }
  }
});
```

`src/core/i18n/i18n.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { i18n } from './i18n';

describe('i18n', () => {
  it('is initialised synchronously in the default locale', () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.t('actions.close')).toBe('Close');
  });

  it('translates into Spanish', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('actions.close')).toBe('Cerrar');
  });

  it('accepts namespace-prefixed keys', () => {
    expect(i18n.t('common:theme.dark')).toBe('Dark');
  });

  it('rejects unknown keys at compile time', () => {
    // @ts-expect-error -- 'actions.doesNotExist' is not a key in en/common.json (typed keys, spec §7.6)
    expect(i18n.t('actions.doesNotExist')).toBe('actions.doesNotExist');
  });
});
```

- [ ] **Step 6: Run the tests to confirm they fail**

Run: `pnpm exec vitest run src/core/i18n`
Expected: FAIL, because `./resources` and `./i18n` can't be resolved.

- [ ] **Step 7: Create `src/core/i18n/resources.ts`**

```ts
import type { Locale } from '@/config/constants';
import enCommon from '@/locales/en/common.json';
import esCommon from '@/locales/es/common.json';

/** English is the source of truth: its keys define the TypeScript key types. */
const en = { common: enCommon };

/** Every other locale must provide every English key (checked by the compiler and resources.test.ts). */
const es: typeof en = { common: esCommon };

export const resources = { en, es } satisfies Record<Locale, typeof en>;

export const defaultNS = 'common';
export type Namespace = keyof typeof en;
export const namespaces = Object.keys(en) as Namespace[];
```

- [ ] **Step 8: Create `src/core/i18n/i18next.d.ts`**

```ts
import type { defaultNS, resources } from './resources';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['en'];
    /** Unknown keys are type errors, even when a default value is passed. */
    strictKeyChecks: true;
  }
}
```

- [ ] **Step 9: Create `src/core/i18n/i18n.ts`**

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { SUPPORTED_LOCALES } from '@/config/constants';
import { env } from '@/config/env';

import { defaultNS, namespaces, resources } from './resources';

// Resources are bundled, so init completes synchronously (initAsync: false makes that explicit).
void i18n.use(initReactI18next).init({
  resources,
  lng: env.VITE_DEFAULT_LOCALE,
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LOCALES],
  nonExplicitSupportedLngs: true,
  ns: namespaces,
  defaultNS,
  initAsync: false,
  interpolation: { escapeValue: false }, // React already escapes output
});

export { i18n };
```

- [ ] **Step 10: Create `src/core/i18n/index.ts`**

```ts
export { i18n } from './i18n';
export { defaultNS, namespaces, resources, type Namespace } from './resources';
```

- [ ] **Step 11: Initialise i18n in tests and reset the language after each one (replace `src/test/setup.ts`)**

```ts
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import { i18n } from '@/core/i18n';

afterEach(async () => {
  // Vitest globals are off, so Testing Library's auto-cleanup is not registered: do it here.
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  if (i18n.language !== 'en') await i18n.changeLanguage('en');
});
```

- [ ] **Step 12: Initialise i18n before the first render (replace `src/main.tsx`)**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/core/i18n';
import { App } from '@/app/App';
import { ConfigErrorScreen } from '@/app/config-error-screen';
import { envIssues } from '@/config/env';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    {envIssues.length > 0 ? <ConfigErrorScreen issues={envIssues} /> : <App />}
  </StrictMode>,
);
```

- [ ] **Step 13: Run the tests to confirm they pass**

Run: `pnpm exec vitest run src/core/i18n`, then `pnpm typecheck`
Expected: PASS (6 tests). Typecheck is clean, which proves the `@ts-expect-error` line really is a type error.

- [ ] **Step 14: Write `docs/i18n.md`**

This is the first version; Phase 6 extends it.

````markdown
# Internationalisation (i18n)

The app uses i18next and react-i18next, with translations bundled into the build. Bundled locales: `en` (source of truth) and `es`.

## Where things live

| Path | What |
|---|---|
| `src/locales/<locale>/<namespace>.json` | Translations. `en` defines the keys. |
| `src/core/i18n/resources.ts` | Registers every locale × namespace |
| `src/core/i18n/i18next.d.ts` | Typed keys: an unknown key fails `pnpm typecheck` |
| `src/core/i18n/i18n.ts` | i18next initialisation |

## Using translations

```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation(); // default namespace: common
t('actions.close');

const { t: tItems } = useTranslation('items'); // a feature namespace
tItems('list.title');
t('items:list.title'); // or use a namespace prefix
```

Never write user-facing text directly in JSX: ESLint (`react/jsx-no-literals`) rejects it.

## Adding a key

1. Add it to `src/locales/en/<namespace>.json`.
2. Add the translation to every other locale. `pnpm typecheck` fails while a locale is missing a key, and `pnpm test` fails while locales have different keys or empty values.

## Namespaces

- `common`: shared UI text (actions, status, pagination, theme, …)
- `errors`: user-facing error messages (added in Phase 3)
- `validation`: form validation messages (added in Phase 6)
- one namespace per feature, added together with the feature
````

- [ ] **Step 15: Lint and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(i18n): initialise i18next with typed en and es resources" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2.3: Tailwind CSS v4 and design tokens (spec §5.1)

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/globals.css`, `src/styles/tokens.test.ts`, `src/test/design-tokens.guard.test.ts`, `docs/design-system.md`
- Modify: `vite.config.ts`, `src/main.tsx`, `.prettierrc.json`

**Interfaces:**
- Produces:
  - **Token-backed utilities:**
    - colours: `bg-/text-/border-/ring-` × `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `destructive-foreground`, `success`, `success-foreground`, `warning`, `warning-foreground`, `info`, `info-foreground`, `border`, `input`, `ring`, `overlay`
    - radii: `rounded-xs|sm|md|lg|xl|2xl`, all derived from `--radius`
    - shadows: `shadow-xs|sm|md|lg`
    - fonts: `font-sans`, `font-mono`
    - layers: `z-sticky`, `z-dropdown`, `z-modal`, `z-toast`
    - durations: `duration-fast|normal|slow`
  - **Dark mode:** the `.dark` class on `<html>`, used through the `dark:` variant
  - **Guard rules, which later tasks must pass:** no hex colours, no raw palette colours (`bg-white`, `text-red-500`), no arbitrary `px` values, no raw `z-<number>` anywhere in `src/**/*.{ts,tsx}` (tests, mocks and generated code excluded)

- [ ] **Step 1: Install**

```bash
pnpm add -D tailwindcss @tailwindcss/vite tw-animate-css prettier-plugin-tailwindcss
```

- [ ] **Step 2: Write the failing tests**

`src/styles/tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import tokensCss from './tokens.css?raw';

/** Returns the custom-property declarations of the first `<selector> { … }` block. */
function declarations(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Selector "${selector}" not found in tokens.css`);
  const end = css.indexOf('}', start);
  const body = css.slice(start + selector.length + 2, end);
  return new Map(
    [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1] ?? '', (m[2] ?? '').trim()]),
  );
}

describe('tokens.css', () => {
  const light = declarations(tokensCss, ':root');
  const dark = declarations(tokensCss, '.dark');
  const fallback = declarations(tokensCss, ':root:not(.light):not(.dark)');

  it('defines the semantic tokens the spec requires', () => {
    const required = [
      '--primary', '--primary-foreground', '--secondary', '--accent', '--muted', '--destructive',
      '--success', '--warning', '--info', '--background', '--foreground', '--border', '--input',
      '--ring', '--card', '--popover', '--radius', '--z-dropdown', '--z-sticky', '--z-modal',
      '--z-toast', '--duration-fast', '--duration-normal', '--duration-slow',
    ];
    expect(required.filter((name) => !light.has(name))).toEqual([]);
  });

  it('gives every light colour token a dark value', () => {
    const colourTokens = [...light].filter(([, value]) => value.startsWith('oklch(')).map(([name]) => name);
    expect(colourTokens.length).toBeGreaterThan(20);
    expect(colourTokens.filter((name) => !dark.has(name))).toEqual([]);
  });

  it('keeps the prefers-color-scheme fallback identical to .dark', () => {
    expect(Object.fromEntries(fallback)).toEqual(Object.fromEntries(dark));
  });
});
```

`src/test/design-tokens.guard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

/**
 * Spec Principle 1: components use token-backed utilities only.
 * Scans source files (not tests, mocks or generated code) for hard-coded design values.
 * For a justified exception, put the comment `design-tokens-guard-ignore` on the same line.
 */
const sources = import.meta.glob<string>(
  [
    '/src/**/*.{ts,tsx}',
    '!/src/**/*.test.{ts,tsx}',
    '!/src/test/**',
    '!/src/mocks/**',
    '!/src/api/generated/**',
  ],
  { query: '?raw', import: 'default', eager: true },
);

const PALETTE =
  'black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|mauve|olive|mist|taupe';
const COLOUR_UTILITIES =
  'bg|text|border|border-[trblxy]|ring|ring-offset|outline|fill|stroke|from|via|to|decoration|divide|placeholder|caret|accent|shadow';

const RULES = [
  {
    name: 'hex colour',
    pattern: /(?<![\w&/])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i,
    hint: 'Use a semantic colour utility backed by tokens.css (bg-primary, text-muted-foreground, …).',
  },
  {
    name: 'raw palette colour',
    pattern: new RegExp(`\\b(?:${COLOUR_UTILITIES})-(?:${PALETTE})(?:-\\d{2,3})?(?![\\w-])`),
    hint: 'Use a semantic colour utility backed by tokens.css instead of the Tailwind palette.',
  },
  {
    name: 'arbitrary pixel value',
    pattern: /\[[^\]\n]*\d(?:\.\d+)?px[^\]\n]*\]/,
    hint: 'Use the spacing / radius / ring scale (p-2, rounded-md, ring-3, --spacing(n), …).',
  },
  {
    name: 'raw z-index',
    pattern: /\bz-\d+\b/,
    hint: 'Use the layers from tokens.css: z-sticky, z-dropdown, z-modal, z-toast.',
  },
];

describe('design-token guard (spec Principle 1)', () => {
  it('actually scans the source tree', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(5);
  });

  it.each(RULES)('finds no $name in src/', ({ pattern, hint }) => {
    const offences: string[] = [];
    for (const [file, source] of Object.entries(sources)) {
      source.split('\n').forEach((line, index) => {
        if (!line.includes('design-tokens-guard-ignore') && pattern.test(line)) {
          offences.push(`${file}:${index + 1}  ${line.trim()}`);
        }
      });
    }
    expect(offences, hint).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `pnpm exec vitest run src/styles src/test/design-tokens.guard.test.ts`
Expected: `tokens.test.ts` FAILS because `./tokens.css?raw` can't be found. The guard test PASSES, since there are no offences yet; it's a regression guard for the next tasks.

- [ ] **Step 4: Create `src/styles/tokens.css`**

```css
/*
 * =============================================================================
 *  DESIGN TOKENS — the single source of truth for the look of the app.
 *
 *  To rebrand, change the values in this file only.
 * =============================================================================
 *
 *  - Colours are semantic (what they are FOR, not what they look like) and use
 *    OKLCH: oklch(lightness chroma hue [/ alpha]). Keep every *-foreground
 *    readable on its base colour (WCAG AA: 4.5:1 for normal text) and keep
 *    --ring at 3:1 against the background (visible focus).
 *  - The root selector is the light theme; the dark class overrides it. The
 *    prefers-color-scheme block is only a fallback for when the theme script in
 *    index.html could not run: keep it identical to the dark block
 *    (src/styles/tokens.test.ts checks this).
 *  - Tailwind utilities read these through the @theme inline block in
 *    globals.css: bg-primary, text-muted-foreground, border-border, rounded-md,
 *    shadow-sm, z-modal, duration-fast, font-sans, ...
 *  - Components never use raw colours or pixel values
 *    (src/test/design-tokens.guard.test.ts fails the build if they do).
 * =============================================================================
 */

/* Typography and elevation: identical in light and dark. */
@theme {
  --font-sans:
    ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';
  --font-mono:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;

  --shadow-xs: 0 1px 2px 0 oklch(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 oklch(0 0 0 / 0.1), 0 1px 2px -1px oklch(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px oklch(0 0 0 / 0.1), 0 2px 4px -2px oklch(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1);
}

:root {
  color-scheme: light;

  /* Shape: every radius (rounded-xs … rounded-2xl) is derived from this. */
  --radius: 0.625rem;

  /* Motion */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;

  /* Layers (z-index) */
  --z-sticky: 10; /* sticky headers */
  --z-modal: 50; /* dialogs, sheets, alert dialogs */
  --z-dropdown: 50; /* menus, selects, popovers, tooltips: equal to modal so ones opened inside a dialog stack above it */
  --z-toast: 100; /* notifications, always on top */

  /* Colours: light theme */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --success: oklch(0.527 0.154 150.069);
  --success-foreground: oklch(0.985 0 0);
  --warning: oklch(0.769 0.188 70.08);
  --warning-foreground: oklch(0.205 0 0);
  --info: oklch(0.546 0.245 262.881);
  --info-foreground: oklch(0.985 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.556 0 0);
  --overlay: oklch(0 0 0 / 0.5);
}

.dark {
  color-scheme: dark;

  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.145 0 0);
  --success: oklch(0.723 0.219 149.579);
  --success-foreground: oklch(0.145 0 0);
  --warning: oklch(0.828 0.189 84.429);
  --warning-foreground: oklch(0.145 0 0);
  --info: oklch(0.707 0.165 254.624);
  --info-foreground: oklch(0.145 0 0);
  --border: oklch(1 0 0 / 0.1);
  --input: oklch(1 0 0 / 0.15);
  --ring: oklch(0.708 0 0);
  --overlay: oklch(0 0 0 / 0.7);
}

/* Fallback when no theme class is set (theme script did not run). Keep identical to the dark block above. */
@media (prefers-color-scheme: dark) {
  :root:not(.light):not(.dark) {
    color-scheme: dark;

    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --popover: oklch(0.205 0 0);
    --popover-foreground: oklch(0.985 0 0);
    --primary: oklch(0.922 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --secondary: oklch(0.269 0 0);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.269 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.704 0.191 22.216);
    --destructive-foreground: oklch(0.145 0 0);
    --success: oklch(0.723 0.219 149.579);
    --success-foreground: oklch(0.145 0 0);
    --warning: oklch(0.828 0.189 84.429);
    --warning-foreground: oklch(0.145 0 0);
    --info: oklch(0.707 0.165 254.624);
    --info-foreground: oklch(0.145 0 0);
    --border: oklch(1 0 0 / 0.1);
    --input: oklch(1 0 0 / 0.15);
    --ring: oklch(0.708 0 0);
    --overlay: oklch(0 0 0 / 0.7);
  }
}

/* Respect reduced-motion preferences everywhere durations are used. */
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-normal: 0ms;
    --duration-slow: 0ms;
  }
}
```

- [ ] **Step 5: Create `src/styles/globals.css`**

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import './tokens.css';

/* Class-based dark mode: <html class="dark">, set before first paint by index.html. */
@custom-variant dark (&:where(.dark, .dark *));

/* Map design tokens to Tailwind utilities. References only: all values live in tokens.css. */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-overlay: var(--overlay);

  --radius-xs: calc(var(--radius) * 0.2);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);

  --default-transition-duration: var(--duration-normal);
}

/* Tailwind has no z-index or duration theme namespace, so the token layers become utilities here. */
@utility z-sticky {
  z-index: var(--z-sticky);
}
@utility z-dropdown {
  z-index: var(--z-dropdown);
}
@utility z-modal {
  z-index: var(--z-modal);
}
@utility z-toast {
  z-index: var(--z-toast);
}
@utility duration-fast {
  --tw-duration: var(--duration-fast);
  transition-duration: var(--duration-fast);
}
@utility duration-normal {
  --tw-duration: var(--duration-normal);
  transition-duration: var(--duration-normal);
}
@utility duration-slow {
  --tw-duration: var(--duration-slow);
  transition-duration: var(--duration-slow);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 6: Wire Tailwind into Vite (`vite.config.ts`)**

Add the import between the `node:` imports and `@vitejs/plugin-react`:

```ts
import tailwindcss from '@tailwindcss/vite';
```

Then change `plugins: [react()],` to `plugins: [react(), tailwindcss()],`.

- [ ] **Step 7: Load the stylesheet (in `src/main.tsx`)**

Add `import '@/styles/globals.css';` directly above `import '@/core/i18n';`.

- [ ] **Step 8: Enable Tailwind class sorting (replace `.prettierrc.json`)**

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "all",
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindStylesheet": "./src/styles/globals.css",
  "tailwindFunctions": ["cn", "cva", "clsx"]
}
```

- [ ] **Step 9: Run the tests and the build**

Run: `pnpm exec vitest run src/styles src/test/design-tokens.guard.test.ts`
Expected: PASS (3 token tests and 5 guard tests).

Run: `pnpm format && pnpm build`
Expected: `dist/assets/index-<hash>.css` contains `--primary` and `.dark`.

- [ ] **Step 10: Write `docs/design-system.md`**

This is the first version; Tasks 2.4 and 2.6 add sections.

````markdown
# Design system

## Tokens: change the look in one file

All colours, radii, fonts, shadows, z-index layers and animation durations are defined **once** in `src/styles/tokens.css`. Tailwind utilities read them through `@theme inline` in `src/styles/globals.css`, so changing a token restyles every button, input, card and badge.

| Group | Tokens | Utilities |
|---|---|---|
| Colours | `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--success`, `--warning`, `--info` (each with a `-foreground`), `--border`, `--input`, `--ring`, `--overlay` | `bg-primary`, `text-primary-foreground`, `border-border`, `ring-ring`, `bg-overlay`, … |
| Shape | `--radius` | `rounded-xs` … `rounded-2xl`, all derived from `--radius` |
| Type | `--font-sans`, `--font-mono` | `font-sans`, `font-mono` |
| Elevation | `--shadow-xs` … `--shadow-lg` | `shadow-xs` … `shadow-lg` |
| Layers | `--z-sticky`, `--z-dropdown`, `--z-modal`, `--z-toast` | `z-sticky`, `z-dropdown`, `z-modal`, `z-toast` |
| Motion | `--duration-fast`, `--duration-normal`, `--duration-slow` (0 ms under reduced motion) | `duration-fast`, `duration-normal`, `duration-slow` |

Colours use **OKLCH** (`oklch(lightness chroma hue)`), so shades with the same lightness look equally bright.

### How to rebrand

1. Edit `src/styles/tokens.css` only. Change `--primary` / `--primary-foreground` in the light (`:root`) and dark (`.dark`) blocks, and copy the dark values into the `prefers-color-scheme` fallback block (a test checks they match).
2. Change `--radius` to make everything rounder or sharper.
3. For a brand font: self-host the font files in `public/fonts/`, add an `@font-face` rule to `tokens.css`, and put the family first in `--font-sans`. The template makes no external font requests by default.
4. Check contrast: text on each `*-foreground` pair needs 4.5:1, and `--ring` needs 3:1 against the background.

## Rules (enforced)

`src/test/design-tokens.guard.test.ts` fails `pnpm test` when source files contain:
- hex colours
- Tailwind palette colours (`bg-white`, `text-red-500`)
- arbitrary pixel values (`w-[13px]`)
- raw z-index numbers (`z-50`)

Use the token utilities above. For a justified one-off, add the comment `design-tokens-guard-ignore` on that line and explain why.

## Dark mode

- Class-based: `<html class="dark">` or `<html class="light">`.
- The `dark:` variant is available. An inline script in `index.html` applies the saved theme **before first paint**, so there is no flash.
- The theme store (`src/stores/theme-store.ts`) keeps it in sync afterwards.
````

- [ ] **Step 11: Lint and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(design): add tailwind v4 with oklch design tokens and token guard" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2.4: `cn()` and the shadcn/ui primitives (spec §5.3)

**Files:**
- Create:
  - `src/lib/cn.ts`, `src/lib/cn.test.ts`
  - `components.json`, `scripts/ui-add.mjs`
  - the generated primitives in `src/components/ui/`: `button`, `input`, `textarea`, `label`, `select`, `checkbox`, `radio-group`, `switch`, `card`, `badge`, `dialog`, `alert-dialog`, `sheet`, `dropdown-menu`, `popover`, `tooltip`, `tabs`, `table`, `avatar`, `separator`, `skeleton`, `spinner`, `pagination`, `breadcrumb`, `form`
  - tests: `src/components/ui/button.test.tsx`, `badge.test.tsx`, `built-in-labels.test.tsx`
- Modify: `tsconfig.json`, `package.json` (script), `src/test/setup.ts`, `docs/design-system.md`

**Interfaces:**
- Produces:
  - `cn(...inputs: ClassValue[]): string` from `@/lib/cn`. It is tailwind-merge aware of `z-*` layers and `duration-*` tokens.
  - `Button` + `buttonVariants`: `variant: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'`, `size: 'sm' | 'md' | 'lg' | 'icon'`, `asChild`
  - `Badge` + `badgeVariants`: `variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'outline'`
  - the standard shadcn new-york-v4 exports for every other primitive, e.g. `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`, `DialogTrigger`
  - `pnpm ui:add <name…>` for adding more primitives later

- [ ] **Step 1: Install the `cn` dependencies**

Run: `pnpm add clsx tailwind-merge`

- [ ] **Step 2: Write the failing test `src/lib/cn.test.ts`**

```ts
import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('joins class names and drops empty values', () => {
    expect(cn('px-2', null, undefined, { 'font-bold': true, italic: false })).toBe('px-2 font-bold');
  });

  it('lets later utilities win conflicts', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    expect(cn('bg-primary', 'bg-destructive')).toBe('bg-destructive');
  });

  it('understands the token layer and duration utilities', () => {
    expect(cn('z-dropdown', 'z-modal')).toBe('z-modal');
    expect(cn('duration-fast', 'duration-slow')).toBe('duration-slow');
  });
});
```

- [ ] **Step 3: Run it to confirm it fails, then create `src/lib/cn.ts`**

Run: `pnpm exec vitest run src/lib/cn.test.ts`
Expected: FAIL, because `./cn` can't be resolved.

```ts
import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** tailwind-merge, taught the token utilities defined in src/styles/globals.css. */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      z: [{ z: ['sticky', 'dropdown', 'modal', 'toast'] }],
      duration: [{ duration: ['fast', 'normal', 'slow'] }],
    },
  },
});

/** Merges class names. Later Tailwind utilities override conflicting earlier ones (spec §5.3). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

Run: `pnpm exec vitest run src/lib/cn.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 4: Create `components.json`**

It is hand-written so the CLI never runs `init`, which would default to Base UI.

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/cn",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 5: Let the shadcn CLI resolve `@/` (replace `tsconfig.json`)**

```json
{
  "files": [],
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  },
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```

The CLI may still report "No import alias found". If so, also add `"baseUrl": "."` and `"ignoreDeprecations": "6.0"` to this file's `compilerOptions`, and record that in the phase report.

- [ ] **Step 6: Create `scripts/ui-add.mjs`**

```js
/**
 * Adds shadcn/ui components and normalises them to this repo's rules (docs/design-system.md).
 *
 *   pnpm ui:add dialog button            # add
 *   pnpm ui:add button --overwrite       # re-fetch an existing component
 *
 * Afterwards run `pnpm lint && pnpm test`, and fix what they still report by hand
 * (hard-coded English strings → t('…'), any remaining raw values the token guard flags).
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: pnpm ui:add <component> [component…] [--overwrite]');
  process.exit(1);
}

const run = (command, commandArgs) =>
  execFileSync(command, commandArgs, { stdio: 'inherit', shell: process.platform === 'win32' });

run('pnpm', ['dlx', 'shadcn@latest', 'add', ...args, '--yes']);

const UI_DIR = 'src/components/ui';
const MODAL_FILES = new Set(['alert-dialog.tsx', 'dialog.tsx', 'drawer.tsx', 'sheet.tsx']);

/** Mechanical fixes for shadcn output. Each one is idempotent. */
const REPLACEMENTS = [
  [/from ["']cn["']/g, "from '@/lib/cn'"],
  [/from ["']@\/lib\/utils["']/g, "from '@/lib/cn'"],
  [/ring-\[3px\]/g, 'ring-3'],
  [/ring-ring\/50/g, 'ring-ring'],
  [/bg-black\/50/g, 'bg-overlay'],
  [/bg-destructive text-white/g, 'bg-destructive text-destructive-foreground'],
  [/ dark:bg-destructive\/60/g, ''],
  [/rounded-\[4px\]/g, 'rounded-sm'],
  [/rounded-\[2px\]/g, 'rounded-xs'],
];

let changed = 0;
const files = readdirSync(UI_DIR).filter(
  (name) => name.endsWith('.tsx') && !name.includes('.test.') && !name.includes('.stories.'),
);
for (const file of files) {
  const path = join(UI_DIR, file);
  const before = readFileSync(path, 'utf8');
  let after = before;
  for (const [pattern, replacement] of REPLACEMENTS) after = after.replace(pattern, replacement);
  after = after.replace(/\bz-50\b/g, MODAL_FILES.has(file) ? 'z-modal' : 'z-dropdown');
  if (after !== before) {
    writeFileSync(path, after);
    changed += 1;
  }
}
console.log(`ui:add: normalised ${changed} file(s) in ${UI_DIR}`);

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (pkg.dependencies?.cn || pkg.devDependencies?.cn) run('pnpm', ['remove', 'cn']);

run('pnpm', ['exec', 'prettier', '--write', UI_DIR]);
console.log('ui:add: done. Run `pnpm lint && pnpm test` and fix anything still reported.');
```

Add the script to `package.json`: `"ui:add": "node scripts/ui-add.mjs"`.

- [ ] **Step 7: Add the jsdom gaps Radix needs (replace `src/test/setup.ts`)**

```ts
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import { i18n } from '@/core/i18n';

// jsdom gaps that Radix primitives and the theme code rely on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'ResizeObserver', {
  configurable: true,
  writable: true,
  value: ResizeObserverStub,
});
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }),
});
for (const method of [
  'hasPointerCapture',
  'setPointerCapture',
  'releasePointerCapture',
  'scrollIntoView',
] as const) {
  Object.defineProperty(Element.prototype, method, {
    configurable: true,
    writable: true,
    value: () => false,
  });
}

afterEach(async () => {
  // Vitest globals are off, so Testing Library's auto-cleanup is not registered: do it here.
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  if (i18n.language !== 'en') await i18n.changeLanguage('en');
});
```

- [ ] **Step 8: Write the failing tests for the spec-mandated behaviour**

`src/components/ui/button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button, buttonVariants } from './button';

describe('Button', () => {
  it('defaults to the default variant and md size', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });

    expect(button).toHaveAttribute('data-variant', 'default');
    expect(button).toHaveAttribute('data-size', 'md');
  });

  it.each(['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const)(
    'supports the %s variant',
    (variant) => {
      render(<Button variant={variant}>Go</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('data-variant', variant);
    },
  );

  it.each(['sm', 'md', 'lg', 'icon'] as const)('defines the %s size', (size) => {
    expect(buttonVariants({ size })).toMatch(/\b(h-\d+|size-\d+)\b/);
  });

  it('renders its child element when asChild is set', () => {
    render(
      <Button asChild>
        <a href="/somewhere">Go</a>
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute('data-slot', 'button');
  });

  it('uses token-backed colours for the destructive variant', () => {
    expect(buttonVariants({ variant: 'destructive' })).toContain('text-destructive-foreground');
  });
});
```

`src/components/ui/badge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from './badge';

describe('Badge', () => {
  it.each(['success', 'warning', 'info'] as const)('has a token-backed %s variant', (variant) => {
    render(<Badge variant={variant}>Status</Badge>);
    expect(screen.getByText('Status')).toHaveClass(`bg-${variant}`, `text-${variant}-foreground`);
  });
});
```

`src/components/ui/built-in-labels.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { i18n } from '@/core/i18n';

import { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbList } from './breadcrumb';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from './pagination';
import { Spinner } from './spinner';

describe('built-in labels are translated', () => {
  it('Dialog close button', async () => {
    await i18n.changeLanguage('es');
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
  });

  it('Pagination landmark, links and ellipsis', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="/items?page=1" />
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="/items?page=3" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to previous page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to next page' })).toBeInTheDocument();
    expect(screen.getByText('More pages')).toBeInTheDocument();
  });

  it('Breadcrumb landmark and ellipsis', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('Spinner status label', () => {
    render(<Spinner />);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });
});
```

Run: `pnpm exec vitest run src/components/ui`
Expected: FAIL, because the component modules don't exist yet.

- [ ] **Step 9: Add the primitives**

`dialog` is added together with `button`, because it imports Button without declaring it as a dependency.

```bash
pnpm ui:add button input textarea label select checkbox radio-group switch card badge dialog alert-dialog sheet dropdown-menu popover tooltip tabs table avatar separator skeleton spinner pagination breadcrumb form
```

Expected:
- 25 files in `src/components/ui/`.
- The `radix-ui`, `class-variance-authority`, `lucide-react`, `react-hook-form` and `@hookform/resolvers` packages are installed.
- The script prints `normalised N file(s)` and removes `cn`.

Check `git diff src/styles`. If the CLI edited `globals.css`, move any new variables into `tokens.css` with semantic names, keep only the `var()` references in `globals.css`, and note it in the report.

- [ ] **Step 10: Replace `src/components/ui/button.tsx`**

This applies the spec's size names and token-only colours.

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';

import { cn } from '@/lib/cn';

/** Variants are defined once here; changing one changes it app-wide (spec §5.3). */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
        md: 'h-9 px-4 py-2 has-[>svg]:px-3',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'md',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
```

- [ ] **Step 11: Replace `src/components/ui/badge.tsx`**

This adds the `success`, `warning` and `info` variants.

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';

import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90',
        success: 'border-transparent bg-success text-success-foreground [a&]:hover:bg-success/90',
        warning: 'border-transparent bg-warning text-warning-foreground [a&]:hover:bg-warning/90',
        info: 'border-transparent bg-info text-info-foreground [a&]:hover:bg-info/90',
        outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
```

- [ ] **Step 12: Translate the built-in strings**

In each function below, add `import { useTranslation } from 'react-i18next';` to the file, put `const { t } = useTranslation();` at the top of the function body, and make these replacements:

| File | Function | Change |
|---|---|---|
| `dialog.tsx` | `DialogContent` | `<span className="sr-only">Close</span>` → `<span className="sr-only">{t('actions.close')}</span>` |
| `dialog.tsx` | `DialogFooter` (only if it renders a close button) | button text `Close` → `{t('actions.close')}` |
| `sheet.tsx` | `SheetContent` | sr-only `Close` → `{t('actions.close')}` |
| `pagination.tsx` | `Pagination` | `aria-label="pagination"` → `aria-label={t('pagination.label')}` |
| `pagination.tsx` | `PaginationPrevious` | `aria-label="Go to previous page"` → `aria-label={t('pagination.previousPage')}`; text `Previous` → `{t('pagination.previous')}`; `size="default"` → `size="md"` |
| `pagination.tsx` | `PaginationNext` | `aria-label="Go to next page"` → `aria-label={t('pagination.nextPage')}`; text `Next` → `{t('pagination.next')}`; `size="default"` → `size="md"` |
| `pagination.tsx` | `PaginationEllipsis` | sr-only `More pages` → `{t('pagination.morePages')}` |
| `breadcrumb.tsx` | `Breadcrumb` | `aria-label="breadcrumb"` → `aria-label={t('breadcrumb.label')}` |
| `breadcrumb.tsx` | `BreadcrumbEllipsis` | sr-only `More` → `{t('actions.more')}` |
| `spinner.tsx` | `Spinner` | `aria-label="Loading"` → `aria-label={t('status.loading')}` |

- [ ] **Step 13: Fix the pixel offsets the script can't rewrite**

| File | Replace | With |
|---|---|---|
| `tooltip.tsx` | `translate-y-[calc(-50%_-_2px)]` | `translate-y-[calc(-50%_-_--spacing(0.5))]` |
| `switch.tsx` | `translate-x-[calc(100%-2px)]` | `translate-x-[calc(100%_-_--spacing(0.5))]` |

- [ ] **Step 14: Run everything and fix what's reported**

Run: `pnpm exec vitest run src/components/ui src/test/design-tokens.guard.test.ts`
Expected: PASS. If the guard lists an offence, fix it with a token utility, as the hint says.

Run: `pnpm typecheck`
Expected: exits 0. Any leftover `size="default"` is a type error; change it to `size="md"`.

Run: `pnpm lint`
Expected: exits 0. Remaining `react/jsx-no-literals` errors are English strings: move them into `common.json` (en + es) and use `t()`.

- [ ] **Step 15: Append "UI primitives" to `docs/design-system.md`**

````markdown
## UI primitives (`src/components/ui/`)

These are shadcn/ui components (Radix primitives, `new-york` style) that **we own**: edit them freely. Each one uses `cva` for variants and `cn()` (`src/lib/cn.ts`, clsx + tailwind-merge) to merge classes.

Included: Button, Input, Textarea, Label, Select, Checkbox, RadioGroup, Switch, Card, Badge, Dialog, AlertDialog, Sheet, DropdownMenu, Popover, Tooltip, Tabs, Table, Avatar, Separator, Skeleton, Spinner, Pagination, Breadcrumb and Form (React Hook Form). DataTable and DatePicker are composites built on top of these.

### Adding another shadcn component

```bash
pnpm ui:add accordion            # or several at once; add --overwrite to re-fetch
pnpm lint && pnpm test           # fix what is still reported
```

`scripts/ui-add.mjs` makes these fixes automatically:

| shadcn output | Rewritten to |
|---|---|
| `import { cn } from "cn"` | `@/lib/cn` (the `cn` package is removed) |
| `ring-[3px]` | `ring-3` |
| `ring-ring/50` | `ring-ring` (full-strength focus rings, for 3:1 focus contrast) |
| `bg-black/50` | `bg-overlay` |
| `text-white` on the destructive colour | `text-destructive-foreground` |
| `z-50` | `z-modal` (dialog/sheet) or `z-dropdown` |
| `rounded-[4px]`, `rounded-[2px]` | `rounded-sm`, `rounded-xs` |

Two things are fixed by hand:
- **English strings** (sr-only labels, `aria-label`): use `t('…')` from `react-i18next`, and add the keys to every locale.
- **Anything else the token guard reports.**

### Adding or changing a variant

Variants live in the component's `cva()` call, for example `buttonVariants` in `button.tsx`. Add an entry built only from token utilities, such as `success: 'bg-success text-success-foreground hover:bg-success/90'`. Every usage of the component can then pick it, and TypeScript autocompletes the new name. Add the variant to the component's story too.

Button sizes are `sm | md | lg | icon` (default `md`). Button variants are `default | secondary | outline | ghost | destructive | link`. Badge adds `success | warning | info`.
````

- [ ] **Step 16: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(ui): add shadcn primitives normalised to tokens and i18n" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2.5: Theme store, theme toggle and no-flash bootstrap (spec §5.2)

**Files:**
- Create:
  - `src/stores/theme-store.ts`, `src/stores/theme-store.test.ts`, `src/stores/theme-bootstrap.test.ts`
  - `src/components/ui/theme-toggle.tsx`, `src/components/ui/theme-toggle.test.tsx`
  - `src/app/providers.tsx`
- Modify: `index.html`, `src/app/App.tsx`, `docs/design-system.md`

**Interfaces:**
- Consumes: `localStore`, `STORAGE_KEYS`, `createZustandStorage` from `@/core/storage`; `env`.
- Produces:
  - from `src/stores/theme-store.ts`:
    - `THEME_MODES = ['light', 'dark', 'system'] as const`, `type ThemeMode`, `type ResolvedTheme = 'light' | 'dark'`
    - `useThemeStore` (Zustand; state `{ mode, setMode }`, persisted under `react-bedrock:theme`)
    - selector hooks `useThemeMode()` and `useSetThemeMode()`
    - `resolveTheme(mode, prefersDark)`, `applyResolvedTheme(theme, root?)`
    - `useThemeSync()`: mount once
  - `ThemeToggle` from `@/components/ui/theme-toggle`
  - `AppProviders` from `src/app/providers.tsx`: every app-wide provider is composed here; later phases add to it

- [ ] **Step 1: Write the failing store tests `src/stores/theme-store.test.ts`**

```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { localStore, STORAGE_KEYS } from '@/core/storage';

import { applyResolvedTheme, resolveTheme, useThemeStore, useThemeSync } from './theme-store';

describe('theme store', () => {
  afterEach(() => {
    act(() => {
      useThemeStore.setState({ mode: 'system' });
    });
    document.documentElement.className = '';
  });

  it('defaults to system mode', () => {
    expect(useThemeStore.getState().mode).toBe('system');
  });

  it('persists the chosen mode through the storage wrapper', () => {
    act(() => {
      useThemeStore.getState().setMode('dark');
    });
    expect(localStore.get(STORAGE_KEYS.theme)).toEqual({ state: { mode: 'dark' }, version: 0 });
  });

  it('resolves system mode from the OS preference', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('applies exactly one theme class to <html>', () => {
    applyResolvedTheme('dark');
    expect(document.documentElement).toHaveClass('dark');

    applyResolvedTheme('light');
    expect(document.documentElement).toHaveClass('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('keeps <html> in sync with the store', () => {
    renderHook(() => {
      useThemeSync();
    });
    act(() => {
      useThemeStore.getState().setMode('dark');
    });
    expect(document.documentElement).toHaveClass('dark');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/stores/theme-store.test.ts`
Expected: FAIL, because `./theme-store` can't be resolved.

- [ ] **Step 3: Create `src/stores/theme-store.ts`**

```ts
import { useEffect } from 'react';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { env } from '@/config/env';
import { createZustandStorage, localStore, STORAGE_KEYS } from '@/core/storage';

export const THEME_MODES = ['light', 'dark', 'system'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

type PersistedTheme = Pick<ThemeState, 'mode'>;

/**
 * UI state only (spec §6.4): the user's theme preference.
 * The persisted format is read before first paint by the inline script in index.html.
 */
export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set) => ({
        mode: 'system',
        setMode: (mode) => {
          set({ mode }, undefined, 'theme/setMode');
        },
      }),
      {
        name: STORAGE_KEYS.theme,
        storage: createZustandStorage<PersistedTheme>(localStore),
        partialize: (state): PersistedTheme => ({ mode: state.mode }),
      },
    ),
    { name: 'theme-store', enabled: env.isDev && !env.isTest },
  ),
);

export const useThemeMode = () => useThemeStore((state) => state.mode);
export const useSetThemeMode = () => useThemeStore((state) => state.setMode);

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === 'system') return prefersDark ? 'dark' : 'light';
  return mode;
}

/** Puts exactly one of `light` / `dark` on <html>. Mirrors the bootstrap script in index.html. */
export function applyResolvedTheme(
  theme: ResolvedTheme,
  root: HTMLElement = document.documentElement,
): void {
  root.classList.remove(theme === 'dark' ? 'light' : 'dark');
  root.classList.add(theme);
}

const PREFERS_DARK = '(prefers-color-scheme: dark)';

/** Keeps <html> in sync with the chosen mode (and with the OS setting in `system` mode). Mount once. */
export function useThemeSync(): void {
  const mode = useThemeMode();

  useEffect(() => {
    const media = window.matchMedia(PREFERS_DARK);
    const apply = () => {
      applyResolvedTheme(resolveTheme(mode, media.matches));
    };
    apply();
    if (mode !== 'system') return;
    media.addEventListener('change', apply);
    return () => {
      media.removeEventListener('change', apply);
    };
  }, [mode]);
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `pnpm exec vitest run src/stores/theme-store.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the failing bootstrap test `src/stores/theme-bootstrap.test.ts`**

This test executes the real inline script from `index.html`.

```ts
import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import indexHtml from '/index.html?raw';

import { useThemeStore } from './theme-store';

function runThemeBootstrap(): void {
  const match = /<script id="theme-bootstrap">([\s\S]*?)<\/script>/.exec(indexHtml);
  if (!match?.[1]) throw new Error('<script id="theme-bootstrap"> not found in index.html');
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- running the real inline script is the point of this test
  new Function(match[1])();
}

describe('index.html theme bootstrap', () => {
  afterEach(() => {
    act(() => {
      useThemeStore.setState({ mode: 'system' });
    });
    document.documentElement.className = '';
  });

  it('applies the theme the store persisted, before React runs', () => {
    act(() => {
      useThemeStore.getState().setMode('dark');
    });
    document.documentElement.className = '';

    runThemeBootstrap();

    expect(document.documentElement).toHaveClass('dark');
  });

  it('follows the OS preference in system mode', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);

    runThemeBootstrap();

    expect(document.documentElement).toHaveClass('dark');
  });

  it('uses light when nothing is saved and the OS prefers light', () => {
    runThemeBootstrap();
    expect(document.documentElement).toHaveClass('light');
  });
});
```

Run: `pnpm exec vitest run src/stores/theme-bootstrap.test.ts`
Expected: FAIL with `<script id="theme-bootstrap"> not found`.

- [ ] **Step 6: Replace `index.html`**

This adds the app-name meta and the inline bootstrap script.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="application-name" content="%VITE_APP_NAME%" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>React Bedrock</title>
    <!-- Runtime config (spec §4): defines window.__APP_CONFIG__ before the app bundle runs. -->
    <script src="/config.js"></script>
    <!--
      Theme bootstrap (spec §5.2): applies the saved theme before first paint, so there is no flash.
      Mirrors src/core/storage/prefix.ts, src/stores/theme-store.ts and the VITE_APP_NAME default in
      src/config/env.ts. Guarded by src/stores/theme-bootstrap.test.ts.
    -->
    <script id="theme-bootstrap">
      (function () {
        var cfg = window.__APP_CONFIG__ || {};
        var meta = document.querySelector('meta[name="application-name"]');
        var built = ((meta && meta.getAttribute('content')) || '').trim();
        if (built.charAt(0) === '%') built = '';
        var name = String(cfg.VITE_APP_NAME || '').trim() || built || 'React Bedrock';
        var slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        var mode = 'system';
        try {
          var saved = JSON.parse(window.localStorage.getItem((slug || 'app') + ':theme') || 'null');
          if (saved && saved.v && saved.v.state && saved.v.state.mode) mode = saved.v.state.mode;
        } catch (e) {}
        var dark =
          mode === 'dark' ||
          (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.add(dark ? 'dark' : 'light');
        document.title = name;
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Run: `pnpm exec vitest run src/stores`
Expected: PASS (8 tests).

- [ ] **Step 7: Write the failing toggle test `src/components/ui/theme-toggle.test.tsx`**

```tsx
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { useThemeStore } from '@/stores/theme-store';

import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  afterEach(() => {
    act(() => {
      useThemeStore.setState({ mode: 'system' });
    });
  });

  it('switches the theme from its menu', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'Change theme' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Dark' }));

    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('marks the current mode as checked', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'Change theme' }));

    expect(await screen.findByRole('menuitemradio', { name: 'System' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});
```

- [ ] **Step 8: Create `src/components/ui/theme-toggle.tsx`**

```tsx
import { MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  THEME_MODES,
  type ThemeMode,
  useSetThemeMode,
  useThemeMode,
} from '@/stores/theme-store';

const ICONS = { light: SunIcon, dark: MoonIcon, system: MonitorIcon } satisfies Record<
  ThemeMode,
  LucideIcon
>;

function isThemeMode(value: string): value is ThemeMode {
  return (THEME_MODES as readonly string[]).includes(value);
}

/** Light / dark / system switcher (spec §5.2). The choice persists via the theme store. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const mode = useThemeMode();
  const setMode = useSetThemeMode();
  const CurrentIcon = ICONS[mode];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('theme.change')}>
          <CurrentIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => {
            if (isThemeMode(value)) setMode(value);
          }}
        >
          {THEME_MODES.map((option) => {
            const Icon = ICONS[option];
            return (
              <DropdownMenuRadioItem key={option} value={option}>
                <Icon aria-hidden="true" />
                {t(`theme.${option}`)}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

Run: `pnpm exec vitest run src/components/ui/theme-toggle.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Create `src/app/providers.tsx`**

Phases 3, 4, 5 and 7 add providers here.

```tsx
import type { ReactNode } from 'react';

import { useThemeSync } from '@/stores/theme-store';

function ThemeSync() {
  useThemeSync();
  return null;
}

/** Every app-wide provider, composed in one place (spec §3). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <ThemeSync />
      {children}
    </>
  );
}
```

- [ ] **Step 10: Replace `src/app/App.tsx`**

```tsx
import { AppProviders } from './providers';

export function App() {
  return (
    <AppProviders>
      <main id="main-content" />
    </AppProviders>
  );
}
```

- [ ] **Step 11: Add to the "Dark mode" section of `docs/design-system.md`**

````markdown
### Theme switching

- `ThemeToggle` (`src/components/ui/theme-toggle.tsx`) offers Light, Dark and System. The choice is stored under the `theme` storage key, e.g. `react-bedrock:theme`.
- Read or change the theme anywhere through the selector hooks:

  ```ts
  const mode = useThemeMode(); // 'light' | 'dark' | 'system'
  const setMode = useSetThemeMode();
  ```

- **No flash:** `<script id="theme-bootstrap">` in `index.html` reads the saved preference and sets the class on `<html>` before first paint. It duplicates a little logic: the storage prefix, the stored format and the default app name. `src/stores/theme-bootstrap.test.ts` runs the real script against the real store, so any drift fails the test suite.
````

- [ ] **Step 12: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(theme): add persisted theme store, toggle and no-flash bootstrap" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2.6: Storybook with a story for every primitive (spec §5.3)

**Files:**
- Create:
  - `.storybook/main.ts`, `.storybook/preview.tsx`
  - one `src/components/ui/<name>.stories.tsx` per primitive (26 files, listed in Steps 5–6)
- Modify: `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`, `package.json` (scripts), `docs/design-system.md`

**Interfaces:**
- Consumes: every primitive from Task 2.4; `ThemeToggle`, `applyResolvedTheme` and `ResolvedTheme` from Task 2.5; `i18n`.
- Produces:
  - scripts `storybook` (dev, port 6006) and `storybook:build` (to `storybook-static/`)
  - toolbar globals `theme` (`light` | `dark`) and `locale` (`en` | `es`)
  - the story convention (CSF3): `title: 'UI/<Name>'`, `satisfies Meta<typeof Component>`, and an `AllVariants`-style story wherever the component has variants

- [ ] **Step 1: Install**

```bash
pnpm add -D storybook @storybook/react-vite @storybook/addon-docs @storybook/addon-a11y eslint-plugin-storybook
```

If pnpm stops on an unreviewed build script (for example `esbuild`), check that the package is listed in `pnpm-workspace.yaml` `allowBuilds`.

- [ ] **Step 2: Create `.storybook/main.ts`**

```ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  staticDirs: ['../public'],
  core: { disableTelemetry: true },
};

export default config;
```

- [ ] **Step 3: Create `.storybook/preview.tsx`**

```tsx
import type { Preview } from '@storybook/react-vite';
import { type ReactNode, useEffect } from 'react';

import '@/styles/globals.css';
import { SUPPORTED_LOCALES, type Locale } from '@/config/constants';
import { i18n } from '@/core/i18n';
import { applyResolvedTheme, type ResolvedTheme } from '@/stores/theme-store';

function StoryShell({
  theme,
  locale,
  children,
}: {
  theme: ResolvedTheme;
  locale: Locale;
  children: ReactNode;
}) {
  useEffect(() => {
    applyResolvedTheme(theme);
  }, [theme]);
  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [locale]);
  return children;
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: { title: 'Theme', icon: 'circlehollow', items: ['light', 'dark'], dynamicTitle: true },
    },
    locale: {
      description: 'Language',
      toolbar: { title: 'Locale', icon: 'globe', items: [...SUPPORTED_LOCALES], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light', locale: 'en' },
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
  decorators: [
    (Story, context) => (
      <StoryShell
        theme={context.globals.theme as ResolvedTheme}
        locale={context.globals.locale as Locale}
      >
        <Story />
      </StoryShell>
    ),
  ],
};

export default preview;
```

- [ ] **Step 4: Wire up the TS projects, ESLint and scripts**

1. `tsconfig.app.json`: change `"include": ["src"]` to `"include": ["src", ".storybook/preview.tsx"]`.
2. `tsconfig.node.json`: change `"include": ["vite.config.ts"]` to `"include": ["vite.config.ts", ".storybook/main.ts"]`.
3. `eslint.config.js`: add `import storybook from 'eslint-plugin-storybook';`, placed alphabetically after the `eslint-plugin-react-refresh` import. Then add `...storybook.configs['flat/recommended'],` on the line directly above `eslintConfigPrettier,`.
4. `package.json` scripts:

   ```json
   "storybook": "storybook dev -p 6006 --no-open",
   "storybook:build": "storybook build -o storybook-static"
   ```

- [ ] **Step 5: Write the form-control and display stories**

Create each file exactly as shown.

`src/components/ui/button.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlusIcon } from 'lucide-react';

import { Button } from './button';
import { Spinner } from './spinner';

const VARIANTS = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const;
const TEXT_SIZES = ['sm', 'md', 'lg'] as const;

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Button' },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    size: { control: 'select', options: [...TEXT_SIZES, 'icon'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: (args) => (
    <div className="grid gap-3">
      {VARIANTS.map((variant) => (
        <div key={variant} className="flex items-center gap-2">
          {TEXT_SIZES.map((size) => (
            <Button key={size} {...args} variant={variant} size={size}>
              {variant} · {size}
            </Button>
          ))}
          <Button {...args} variant={variant} size="icon" aria-label={`${variant} icon button`}>
            <PlusIcon />
          </Button>
        </div>
      ))}
    </div>
  ),
};

export const Loading: Story = {
  render: (args) => (
    <Button {...args} disabled>
      <Spinner />
      Saving…
    </Button>
  ),
};

export const AsLink: Story = {
  render: (args) => (
    <Button {...args} asChild variant="link">
      <a href="/">Go home</a>
    </Button>
  ),
};
```

`src/components/ui/badge.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from './badge';

const VARIANTS = ['default', 'secondary', 'destructive', 'success', 'warning', 'info', 'outline'] as const;

const meta = {
  title: 'UI/Badge',
  component: Badge,
  args: { children: 'Badge' },
  argTypes: { variant: { control: 'select', options: VARIANTS } },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      {VARIANTS.map((variant) => (
        <Badge key={variant} {...args} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
};
```

`src/components/ui/input.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input } from './input';
import { Label } from './label';

const meta = {
  title: 'UI/Input',
  component: Input,
  args: { placeholder: 'you@example.com' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const States: Story = {
  render: (args) => (
    <div className="grid w-72 gap-4">
      <div className="grid gap-2">
        <Label htmlFor="input-default">Email</Label>
        <Input id="input-default" type="email" {...args} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="input-disabled">Disabled</Label>
        <Input id="input-disabled" disabled {...args} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="input-invalid">Invalid</Label>
        <Input id="input-invalid" aria-invalid {...args} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="input-file">File</Label>
        <Input id="input-file" type="file" />
      </div>
    </div>
  ),
};
```

`src/components/ui/textarea.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from './label';
import { Textarea } from './textarea';

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  args: { placeholder: 'Type your message here.' },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="grid w-80 gap-2">
      <Label htmlFor="message">Message</Label>
      <Textarea id="message" {...args} />
    </div>
  ),
};

export const Invalid: Story = { args: { 'aria-invalid': true } };

export const Disabled: Story = { args: { disabled: true } };
```

`src/components/ui/label.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from './checkbox';
import { Label } from './label';

const meta = { title: 'UI/Label', component: Label } satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithControl: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms" {...args}>
        Accept terms and conditions
      </Label>
    </div>
  ),
};
```

`src/components/ui/select.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from './label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';

const meta = { title: 'UI/Select', component: Select } satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="grid w-64 gap-2">
      <Label htmlFor="produce">Produce</Label>
      <Select {...args}>
        <SelectTrigger id="produce" className="w-full">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruit</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Vegetables</SelectLabel>
            <SelectItem value="carrot">Carrot</SelectItem>
            <SelectItem value="leek" disabled>
              Leek
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const Small: Story = {
  render: (args) => (
    <Select {...args}>
      <SelectTrigger size="sm" aria-label="Page size">
        <SelectValue placeholder="10" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="10">10</SelectItem>
        <SelectItem value="20">20</SelectItem>
        <SelectItem value="50">50</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = { args: { disabled: true }, render: Default.render };
```

`src/components/ui/checkbox.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from './checkbox';
import { Label } from './label';

const meta = { title: 'UI/Checkbox', component: Checkbox } satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Checkbox id="cb-unchecked" />
        <Label htmlFor="cb-unchecked">Unchecked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-checked" defaultChecked />
        <Label htmlFor="cb-checked">Checked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-disabled" disabled />
        <Label htmlFor="cb-disabled">Disabled</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-invalid" aria-invalid />
        <Label htmlFor="cb-invalid">Invalid</Label>
      </div>
    </div>
  ),
};
```

`src/components/ui/radio-group.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from './label';
import { RadioGroup, RadioGroupItem } from './radio-group';

const OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
] as const;

const meta = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  args: { defaultValue: 'comfortable' },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <RadioGroup {...args}>
      {OPTIONS.map((option) => (
        <div key={option.value} className="flex items-center gap-2">
          <RadioGroupItem value={option.value} id={`density-${option.value}`} />
          <Label htmlFor={`density-${option.value}`}>{option.label}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
};

export const Disabled: Story = { args: { disabled: true }, render: Default.render };
```

`src/components/ui/switch.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from './label';
import { Switch } from './switch';

const meta = { title: 'UI/Switch', component: Switch } satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Switch id="sw-off" />
        <Label htmlFor="sw-off">Off</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="sw-on" defaultChecked />
        <Label htmlFor="sw-on">On</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="sw-disabled" disabled />
        <Label htmlFor="sw-disabled">Disabled</Label>
      </div>
    </div>
  ),
};
```

`src/components/ui/form.stories.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from './button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form';
import { Input } from './input';

const schema = z.object({
  name: z.string().min(2, { error: 'Use at least 2 characters' }),
  email: z.email({ error: 'Enter a valid email address' }),
});
type Values = z.infer<typeof schema>;

function DemoForm() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  });

  return (
    <Form {...form}>
      <form
        noValidate
        className="grid w-80 gap-4"
        onSubmit={form.handleSubmit(() => undefined)}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Shown on your profile.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

const meta = { title: 'UI/Form', component: DemoForm } satisfies Meta<typeof DemoForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Press Submit with empty fields to see field-level errors under each input. */
export const Validation: Story = {};
```

- [ ] **Step 6: Write the overlay, navigation and data-display stories**

Create each file exactly as shown.

`src/components/ui/card.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from './badge';
import { Button } from './button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';

const meta = { title: 'UI/Card', component: Card } satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Card className="w-80" {...args}>
      <CardHeader>
        <CardTitle>Project</CardTitle>
        <CardDescription>Deploy your new project in one click.</CardDescription>
        <CardAction>
          <Badge variant="secondary">New</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">Cards group related content and actions.</p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  ),
};
```

`src/components/ui/dialog.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Input } from './input';
import { Label } from './label';

const meta = { title: 'UI/Dialog', component: Dialog } satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Make changes, then save when you are done.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="dialog-name">Name</Label>
          <Input id="dialog-name" defaultValue="Alex" />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
```

`src/components/ui/alert-dialog.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';
import { Button, buttonVariants } from './button';

const meta = { title: 'UI/AlertDialog', component: AlertDialog } satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Destructive: Story = {
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete item</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this item?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className={buttonVariants({ variant: 'destructive' })}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
```

`src/components/ui/sheet.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet';

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

const meta = { title: 'UI/Sheet', component: Sheet } satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sides: Story = {
  render: () => (
    <div className="flex gap-2">
      {SIDES.map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild>
            <Button variant="outline">{side}</Button>
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Sheet from the {side}</SheetTitle>
              <SheetDescription>Use sheets for secondary tasks and mobile navigation.</SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <SheetClose asChild>
                <Button>Done</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  ),
};
```

`src/components/ui/dropdown-menu.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu';

const meta = { title: 'UI/DropdownMenu', component: DropdownMenu } satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Open menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>My account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked>Show status bar</DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Archive</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
```

`src/components/ui/popover.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

const meta = { title: 'UI/Popover', component: Popover } satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger asChild>
        <Button variant="outline">Open popover</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="grid gap-2">
          <h4 className="leading-none font-medium">Dimensions</h4>
          <p className="text-muted-foreground text-sm">Set the dimensions for the layer.</p>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
```

`src/components/ui/tooltip.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

const meta = { title: 'UI/Tooltip', component: Tooltip } satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover or focus me</Button>
      </TooltipTrigger>
      <TooltipContent>A helpful hint</TooltipContent>
    </Tooltip>
  ),
};
```

`src/components/ui/tabs.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  args: { defaultValue: 'account' },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Tabs className="w-96" {...args}>
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="disabled" disabled>
          Disabled
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account settings go here.</TabsContent>
      <TabsContent value="password">Password settings go here.</TabsContent>
    </Tabs>
  ),
};
```

`src/components/ui/table.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

const ROWS = [
  { id: 'INV-001', status: 'Paid', amount: '250.00' },
  { id: 'INV-002', status: 'Pending', amount: '150.00' },
  { id: 'INV-003', status: 'Unpaid', amount: '350.00' },
];

const meta = { title: 'UI/Table', component: Table } satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Table className="w-96" {...args}>
      <TableCaption>Recent invoices</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROWS.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.id}</TableCell>
            <TableCell>{row.status}</TableCell>
            <TableCell className="text-right">{row.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};
```

`src/components/ui/avatar.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Avatar, AvatarFallback, AvatarImage } from './avatar';

const meta = { title: 'UI/Avatar', component: Avatar } satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ImageAndFallback: Story = {
  render: (args) => (
    <div className="flex gap-4">
      <Avatar {...args}>
        <AvatarImage src="/favicon.svg" alt="App logo" />
        <AvatarFallback>RB</AvatarFallback>
      </Avatar>
      <Avatar {...args}>
        <AvatarImage src="/does-not-exist.png" alt="Missing image" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    </div>
  ),
};
```

`src/components/ui/separator.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Separator } from './separator';

const meta = { title: 'UI/Separator', component: Separator } satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Orientations: Story = {
  render: () => (
    <div className="w-72">
      <p className="text-sm font-medium">Section title</p>
      <p className="text-muted-foreground text-sm">Supporting text.</p>
      <Separator className="my-4" />
      <div className="flex h-5 items-center gap-4 text-sm">
        <span>Docs</span>
        <Separator orientation="vertical" />
        <span>Guides</span>
        <Separator orientation="vertical" />
        <span>Source</span>
      </div>
    </div>
  ),
};
```

`src/components/ui/skeleton.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Skeleton } from './skeleton';

const meta = { title: 'UI/Skeleton', component: Skeleton } satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Shapes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Skeleton className="size-12 rounded-full" />
      <div className="grid gap-2">
        <Skeleton className="h-4 w-60" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  ),
};
```

`src/components/ui/spinner.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Spinner } from './spinner';

const meta = { title: 'UI/Spinner', component: Spinner } satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sizes: Story = {
  render: () => (
    <div className="text-muted-foreground flex items-center gap-4">
      <Spinner />
      <Spinner className="size-6" />
      <Spinner className="size-8" />
    </div>
  ),
};
```

`src/components/ui/pagination.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './pagination';

const meta = { title: 'UI/Pagination', component: Pagination } satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Pagination {...args}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="/?page=1" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="/?page=1">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="/?page=2" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="/?page=3">3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="/?page=3" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};
```

`src/components/ui/breadcrumb.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './breadcrumb';

const meta = { title: 'UI/Breadcrumb', component: Breadcrumb } satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Breadcrumb {...args}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/items">Items</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Details</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};
```

`src/components/ui/theme-toggle.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ThemeToggle } from './theme-toggle';

const meta = { title: 'UI/ThemeToggle', component: ThemeToggle } satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Changes the real app theme store; the Storybook toolbar theme is independent. */
export const Default: Story = {};
```

- [ ] **Step 7: Build Storybook**

Run: `pnpm storybook:build`
Expected: `storybook-static/index.html` is built with no errors, and the output lists 26 story files.

Run: `pnpm storybook`, then open http://localhost:6006 and check:
- The Theme toolbar switches every story between light and dark.
- The Locale toolbar switches the built-in labels to Spanish (for example the Pagination story shows "Anterior").
- The Accessibility panel shows no violations on Button, Input and Dialog.

- [ ] **Step 8: Append "Storybook" to `docs/design-system.md`**

```markdown
## Storybook: the visual catalogue

- `pnpm storybook` runs it at http://localhost:6006; `pnpm storybook:build` writes a static site to `storybook-static/`.
- Every primitive has a story in `src/components/ui/<name>.stories.tsx` that shows all its variants. Add or update the story whenever you add a component or variant.
- The toolbar switches **Theme** (light/dark) and **Locale** (en/es). The **Accessibility** panel runs axe on the current story.
- Stories are CSF3 (`satisfies Meta<typeof Component>`), titled `UI/<Name>`. Demo copy in stories may be plain English, because stories are not shipped to users.
```

- [ ] **Step 9: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "docs(storybook): add storybook with stories for every ui primitive" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Phase 2 gate

- [ ] Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm storybook:build`. Expected: all green.
- [ ] **Rebrand acceptance test (spec §5.1):**
  1. In `src/styles/tokens.css` **only**, set `--primary: oklch(0.55 0.2 260);` in `:root` and `--radius: 0rem;`.
  2. Run `pnpm storybook` and confirm that Button, Input, Card and Badge all change colour and lose their rounding. No other file is touched.
  3. Revert with `git checkout src/styles/tokens.css`.
- [ ] **No-flash check:**
  1. Run `pnpm dev`, choose Dark in a page that renders `<ThemeToggle />`, or run `localStorage.setItem('react-bedrock:theme', '{"v":{"state":{"mode":"dark"},"version":0}}')` in the console.
  2. Hard-reload and confirm the page never flashes light.
- [ ] Post the **Phase 2 report**. Include both pull-forwards (storage, i18n core), both push-backs (DataTable, DatePicker), and any manual shadcn fixes beyond the table in Task 2.4. Then **STOP** until the owner approves.

---

# Phase 3 — Feedback states

Scope (spec §12, §5.4): Spinner, PageLoader, Skeleton and its presets, EmptyState, ErrorState, QueryState and AsyncBoundary. This phase also includes the generic `ErrorBoundary` (pulled from Phase 4, Deviation 1) and `DataTable` (Deviation 15). `Spinner` and `Skeleton` already exist in `src/components/ui/` and are re-exported from `@/components/feedback`.

### Task 3.1: `errors` namespace, delayed rendering, PageLoader and skeleton presets

**Files:**
- Create:
  - `src/locales/en/errors.json`, `src/locales/es/errors.json`
  - `src/components/feedback/delayed.tsx`, `page-loader.tsx`, `skeleton-presets.tsx`, `index.ts`
  - tests: `src/components/feedback/delayed.test.tsx`, `page-loader.test.tsx`, `skeleton-presets.test.tsx`
  - stories: `src/components/feedback/page-loader.stories.tsx`, `skeleton-presets.stories.tsx`
- Modify: `src/config/constants.ts`, `src/core/i18n/resources.ts`, `src/locales/{en,es}/common.json`

**Interfaces:**
- Produces:
  - `SKELETON_DELAY_MS = 200` (constants)
  - `<Delayed delayMs?>`: renders its children only after the delay (spec: avoid skeleton flashes)
  - `<PageLoader variant?: 'page' | 'section' delayMs? />`
  - `<TableSkeleton rows? columns? />`, `<CardSkeleton />`, `<ListSkeleton items? />`, `<FormSkeleton fields? />`, `<DetailSkeleton />`. Every loader renders `role="status"` with the translated "Loading" label.
  - `@/components/feedback` re-exports `Spinner` and `Skeleton`
  - the `errors` i18n namespace

- [ ] **Step 1: Add the constant (in `src/config/constants.ts`)**

Append:

```ts
/** Loading indicators wait this long before appearing, so fast responses never flash a skeleton. */
export const SKELETON_DELAY_MS = 200;
```

- [ ] **Step 2: Add the translations**

Deep-merge into `src/locales/en/common.json`:

```json
{
  "actions": { "retry": "Try again", "reload": "Reload page" },
  "states": {
    "empty": {
      "title": "Nothing here yet",
      "description": "When there is something to show, it will appear here."
    }
  }
}
```

Deep-merge into `src/locales/es/common.json`:

```json
{
  "actions": { "retry": "Reintentar", "reload": "Recargar la página" },
  "states": {
    "empty": {
      "title": "Aún no hay nada aquí",
      "description": "Cuando haya algo que mostrar, aparecerá aquí."
    }
  }
}
```

Create `src/locales/en/errors.json`:

```json
{
  "generic": {
    "title": "Something went wrong",
    "description": "An unexpected error occurred. Please try again."
  },
  "details": "Technical details"
}
```

Create `src/locales/es/errors.json`:

```json
{
  "generic": {
    "title": "Algo salió mal",
    "description": "Se produjo un error inesperado. Inténtalo de nuevo."
  },
  "details": "Detalles técnicos"
}
```

- [ ] **Step 3: Register the namespace (replace `src/core/i18n/resources.ts`)**

```ts
import type { Locale } from '@/config/constants';
import enCommon from '@/locales/en/common.json';
import enErrors from '@/locales/en/errors.json';
import esCommon from '@/locales/es/common.json';
import esErrors from '@/locales/es/errors.json';

/** English is the source of truth: its keys define the TypeScript key types. */
const en = { common: enCommon, errors: enErrors };

/** Every other locale must provide every English key (checked by the compiler and resources.test.ts). */
const es: typeof en = { common: esCommon, errors: esErrors };

export const resources = { en, es } satisfies Record<Locale, typeof en>;

export const defaultNS = 'common';
export type Namespace = keyof typeof en;
export const namespaces = Object.keys(en) as Namespace[];
```

- [ ] **Step 4: Write the failing tests**

`src/components/feedback/delayed.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Delayed } from './delayed';

describe('Delayed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing until the delay has passed', () => {
    render(
      <Delayed delayMs={200}>
        <p>Loading</p>
      </Delayed>,
    );
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('renders immediately when the delay is zero', () => {
    render(
      <Delayed delayMs={0}>
        <p>Now</p>
      </Delayed>,
    );
    expect(screen.getByText('Now')).toBeInTheDocument();
  });
});
```

`src/components/feedback/page-loader.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageLoader } from './page-loader';

describe('PageLoader', () => {
  it('announces loading with a translated label', () => {
    render(<PageLoader delayMs={0} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('fills the viewport in page mode', () => {
    render(<PageLoader variant="page" delayMs={0} />);
    expect(screen.getByRole('status')).toHaveClass('min-h-svh');
  });
});
```

`src/components/feedback/skeleton-presets.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  ListSkeleton,
  TableSkeleton,
} from './skeleton-presets';

const countSkeletons = (container: HTMLElement) =>
  container.querySelectorAll('[data-slot="skeleton"]').length;

describe('skeleton presets', () => {
  it('TableSkeleton renders a header row plus the requested rows and columns', () => {
    const { container } = render(<TableSkeleton rows={3} columns={2} />);
    expect(countSkeletons(container)).toBe((3 + 1) * 2);
  });

  it('ListSkeleton renders one avatar and two lines per item', () => {
    const { container } = render(<ListSkeleton items={2} />);
    expect(countSkeletons(container)).toBe(2 * 3);
  });

  it('FormSkeleton renders a label and control per field plus a submit button', () => {
    const { container } = render(<FormSkeleton fields={3} />);
    expect(countSkeletons(container)).toBe(3 * 2 + 1);
  });

  it.each([
    ['CardSkeleton', <CardSkeleton key="card" />],
    ['DetailSkeleton', <DetailSkeleton key="detail" />],
    ['TableSkeleton', <TableSkeleton key="table" />],
  ])('%s is announced as loading', (_name, element) => {
    render(element);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });
});
```

Run: `pnpm exec vitest run src/components/feedback`
Expected: FAIL, because the modules don't exist.

- [ ] **Step 5: Create `src/components/feedback/delayed.tsx`**

```tsx
import { type ReactNode, useEffect, useState } from 'react';

import { SKELETON_DELAY_MS } from '@/config/constants';

interface DelayedProps {
  children: ReactNode;
  /** Milliseconds to wait before rendering `children` (default SKELETON_DELAY_MS). */
  delayMs?: number;
}

/** Renders children only after a short delay, so loading indicators never flash for fast responses. */
export function Delayed({ children, delayMs = SKELETON_DELAY_MS }: DelayedProps) {
  const [visible, setVisible] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) return;
    const timer = window.setTimeout(() => {
      setVisible(true);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [delayMs]);

  return visible ? children : null;
}
```

- [ ] **Step 6: Create `src/components/feedback/page-loader.tsx`**

```tsx
import { Loader2Icon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SKELETON_DELAY_MS } from '@/config/constants';
import { cn } from '@/lib/cn';

import { Delayed } from './delayed';

interface PageLoaderProps {
  /** `page` fills the viewport (bootstrap, lazy routes); `section` fills its container. */
  variant?: 'page' | 'section';
  delayMs?: number;
}

/** Full-page or section loading indicator; the Suspense / HydrateFallback for lazy routes (spec §5.4). */
export function PageLoader({ variant = 'section', delayMs = SKELETON_DELAY_MS }: PageLoaderProps) {
  const { t } = useTranslation();

  return (
    <Delayed delayMs={delayMs}>
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'text-muted-foreground flex w-full items-center justify-center',
          variant === 'page' ? 'min-h-svh' : 'min-h-48',
        )}
      >
        <Loader2Icon aria-hidden="true" className="size-6 animate-spin" />
        <span className="sr-only">{t('status.loading')}</span>
      </div>
    </Delayed>
  );
}
```

- [ ] **Step 7: Create `src/components/feedback/skeleton-presets.tsx`**

```tsx
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';

function SkeletonRegion({ children, className }: { children: ReactNode; className?: string }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" className={cn('w-full', className)}>
      <span className="sr-only">{t('status.loading')}</span>
      {children}
    </div>
  );
}

const range = (length: number) => Array.from({ length }, (_, index) => index);

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <SkeletonRegion className="overflow-hidden rounded-md border">
      <div className="bg-muted/50 flex gap-4 border-b p-3">
        {range(columns).map((column) => (
          <Skeleton key={column} className="h-4 flex-1" />
        ))}
      </div>
      {range(rows).map((row) => (
        <div key={row} className="flex gap-4 border-b p-3 last:border-b-0">
          {range(columns).map((column) => (
            <Skeleton key={column} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function CardSkeleton() {
  return (
    <SkeletonRegion className="bg-card grid gap-4 rounded-lg border p-6">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-9 w-24" />
    </SkeletonRegion>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <SkeletonRegion className="grid gap-4">
      {range(items).map((item) => (
        <div key={item} className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <SkeletonRegion className="grid max-w-xl gap-6">
      {range(fields).map((field) => (
        <div key={field} className="grid gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-28" />
    </SkeletonRegion>
  );
}

export function DetailSkeleton() {
  return (
    <SkeletonRegion className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-7 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {range(6).map((cell) => (
          <div key={cell} className="grid gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}
```

- [ ] **Step 8: Create `src/components/feedback/index.ts`**

Tasks 3.2 to 3.4 extend it.

```ts
export { Skeleton } from '@/components/ui/skeleton';
export { Spinner } from '@/components/ui/spinner';
export { Delayed } from './delayed';
export { PageLoader } from './page-loader';
export {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  ListSkeleton,
  TableSkeleton,
} from './skeleton-presets';
```

- [ ] **Step 9: Write the stories**

`src/components/feedback/page-loader.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { PageLoader } from './page-loader';

const meta = {
  title: 'Feedback/PageLoader',
  component: PageLoader,
  args: { delayMs: 0 },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PageLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Section: Story = { args: { variant: 'section' } };
export const Page: Story = { args: { variant: 'page' } };
```

`src/components/feedback/skeleton-presets.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  ListSkeleton,
  TableSkeleton,
} from './skeleton-presets';

const meta = {
  title: 'Feedback/SkeletonPresets',
  component: TableSkeleton,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof TableSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Table: Story = { args: { rows: 5, columns: 4 } };
export const Card: Story = { render: () => <CardSkeleton /> };
export const List: Story = { render: () => <ListSkeleton items={4} /> };
export const Form: Story = { render: () => <FormSkeleton fields={3} /> };
export const Detail: Story = { render: () => <DetailSkeleton /> };
```

- [ ] **Step 10: Run the tests to confirm they pass, then commit**

Run: `pnpm exec vitest run src/components/feedback src/core/i18n`
Expected: PASS. The resource tests now also cover the `errors` namespace.

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(feedback): add page loader, delayed rendering and skeleton presets" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3.2: EmptyState and ErrorState

**Files:**
- Create:
  - `src/lib/describe-error.ts`, `src/lib/describe-error.test.ts`
  - `src/components/feedback/empty-state.tsx`, `error-state.tsx`
  - tests: `src/components/feedback/empty-state.test.tsx`, `error-state.test.tsx`
  - stories: `src/components/feedback/empty-state.stories.tsx`, `error-state.stories.tsx`
- Modify: `src/components/feedback/index.ts`

**Interfaces:**
- Produces:
  - `describeError(error: unknown): string`, a developer-facing dump (stack plus extra own properties)
  - `<EmptyState title? description? icon?: LucideIcon action?: ReactNode className? />`
  - `<ErrorState error? title? description? onRetry? retryLabel? showDetails? className? />`
    - `showDetails` defaults to `env.isDev`
    - the default description is `t('errors:generic.description')`. Task 5.1 swaps this for `getErrorMessage(error)`.

- [ ] **Step 1: Write the failing tests**

`src/lib/describe-error.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { describeError } from './describe-error';

describe('describeError', () => {
  it('includes the message, stack and extra properties of errors', () => {
    const error = Object.assign(new Error('Boom'), { code: 'E_BOOM', status: 500 });
    const text = describeError(error);

    expect(text).toContain('Boom');
    expect(text).toContain('"code": "E_BOOM"');
    expect(text).toContain('"status": 500');
  });

  it('describes strings, objects and unserialisable values', () => {
    expect(describeError('plain text')).toBe('plain text');
    expect(describeError({ reason: 'x' })).toContain('"reason": "x"');

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(describeError(circular)).toBe('[object Object]');
  });
});
```

`src/components/feedback/empty-state.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('shows translated defaults', () => {
    render(<EmptyState />);
    expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument();
  });

  it('shows a custom title, description and action', () => {
    render(
      <EmptyState
        title="No items"
        description="Create your first item."
        action={<button type="button">Create item</button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'No items' })).toBeInTheDocument();
    expect(screen.getByText('Create your first item.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create item' })).toBeInTheDocument();
  });
});
```

`src/components/feedback/error-state.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { i18n } from '@/core/i18n';

import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('shows a friendly, translated message by default', () => {
    render(<ErrorState />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('calls onRetry from its "Try again" button', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorState onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows technical details when asked (the default in development)', () => {
    render(<ErrorState error={new Error('Kaboom')} showDetails />);
    expect(screen.getByText('Technical details')).toBeInTheDocument();
    expect(screen.getByText(/Kaboom/)).toBeInTheDocument();
  });

  it('hides technical details in production', () => {
    render(<ErrorState error={new Error('Kaboom')} showDetails={false} />);
    expect(screen.queryByText(/Kaboom/)).not.toBeInTheDocument();
  });

  it('is translated', async () => {
    await i18n.changeLanguage('es');
    render(<ErrorState onRetry={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
```

Run: `pnpm exec vitest run src/lib/describe-error.test.ts src/components/feedback`
Expected: FAIL, because the modules are missing.

- [ ] **Step 2: Create `src/lib/describe-error.ts`**

```ts
/** Developer-facing description of any thrown value: the stack for Errors plus their extra own properties. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const extra = Object.fromEntries(Object.entries(error));
    const head = error.stack ?? `${error.name}: ${error.message}`;
    return Object.keys(extra).length > 0 ? `${head}\n\n${toJson(extra)}` : head;
  }
  return typeof error === 'string' ? error : toJson(error);
}

function toJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}
```

- [ ] **Step 3: Create `src/components/feedback/empty-state.tsx`**

```tsx
import { InboxIcon, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  /** Optional call to action, e.g. <Button>Create item</Button>. */
  action?: ReactNode;
  className?: string;
}

/** Icon, title, description and optional action for "no data" (spec §5.4). */
export function EmptyState({
  title,
  description,
  icon: Icon = InboxIcon,
  action,
  className,
}: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center',
        className,
      )}
    >
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <Icon aria-hidden="true" className="size-6" />
      </div>
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">{title ?? t('states.empty.title')}</h2>
        <p className="text-muted-foreground text-sm">{description ?? t('states.empty.description')}</p>
      </div>
      {action}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/feedback/error-state.tsx`**

```tsx
import { RotateCwIcon, TriangleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { env } from '@/config/env';
import { cn } from '@/lib/cn';
import { describeError } from '@/lib/describe-error';

export interface ErrorStateProps {
  /** The error being shown. Its technical details are listed only when `showDetails` is true. */
  error?: unknown;
  title?: string;
  /** A friendly message. Defaults to a translated generic message. */
  description?: string;
  /** Shows a "Try again" button, e.g. `() => void query.refetch()`. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Show technical details. Default: development only (spec Principle 7). */
  showDetails?: boolean;
  className?: string;
}

/** Friendly error message with "Try again"; technical details only in development (spec §5.4). */
export function ErrorState({
  error,
  title,
  description,
  onRetry,
  retryLabel,
  showDetails = env.isDev,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation(['common', 'errors']);

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border p-8 text-center',
        className,
      )}
    >
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <TriangleAlertIcon aria-hidden="true" className="size-6" />
      </div>
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">{title ?? t('errors:generic.title')}</h2>
        <p className="text-muted-foreground text-sm">
          {description ?? t('errors:generic.description')}
        </p>
      </div>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          <RotateCwIcon aria-hidden="true" />
          {retryLabel ?? t('actions.retry')}
        </Button>
      ) : null}
      {showDetails && error !== undefined ? (
        <details className="w-full max-w-2xl text-left">
          <summary className="cursor-pointer text-sm font-medium">{t('errors:details')}</summary>
          <pre className="bg-muted mt-2 max-h-64 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">
            {describeError(error)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Export them (append to `src/components/feedback/index.ts`)**

```ts
export { EmptyState, type EmptyStateProps } from './empty-state';
export { ErrorState, type ErrorStateProps } from './error-state';
```

- [ ] **Step 6: Write the stories**

`src/components/feedback/empty-state.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchXIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { EmptyState } from './empty-state';

const meta = { title: 'Feedback/EmptyState', component: EmptyState } satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    title: 'No items yet',
    description: 'Create your first item to get started.',
    action: <Button>Create item</Button>,
  },
};

export const NoSearchResults: Story = {
  args: {
    icon: SearchXIcon,
    title: 'No results',
    description: 'Try a different search term or clear the filters.',
  },
};
```

`src/components/feedback/error-state.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ErrorState } from './error-state';

const meta = {
  title: 'Feedback/ErrorState',
  component: ErrorState,
  args: { onRetry: () => undefined },
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTechnicalDetails: Story = {
  args: { error: new Error('Request failed with status 500'), showDetails: true },
};

export const WithoutRetry: Story = { args: { onRetry: undefined } };
```

- [ ] **Step 7: Run the tests to confirm they pass, then commit**

Run: `pnpm exec vitest run src/lib src/components/feedback`
Expected: PASS.

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(feedback): add empty and error states" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3.3: QueryState and the provider-aware test `render`

**Files:**
- Create:
  - `src/components/feedback/query-state.tsx`, `query-state.test.tsx`, `query-state.stories.tsx`
  - `src/test/render.tsx`
  - `docs/data-fetching.md`
- Modify: `src/components/feedback/index.ts`, `docs/testing.md`

**Interfaces:**
- Consumes: `Delayed`, `PageLoader`, `EmptyState`, `ErrorState`.
- Produces:
  - `interface QueryLike<TData, TError> { status; data; error; refetch }`. Any `UseQueryResult` satisfies it.
  - `<QueryState query children={(data) => …} loading? empty? isEmpty? error? />`
  - from `@/test/render`:
    - `render(ui, { queryClient? })`, which returns RTL's result plus `queryClient`
    - `createTestQueryClient()` (no retries, `gcTime: Infinity`)
    - re-exports `act`, `fireEvent`, `renderHook`, `screen`, `waitFor`, `waitForElementToBeRemoval`, `within`
    - Phase 7 adds `route` / auth options.

- [ ] **Step 1: Install**

Run: `pnpm add @tanstack/react-query`

- [ ] **Step 2: Create `src/test/render.tsx`**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

export {
  act,
  fireEvent,
  renderHook,
  screen,
  waitFor,
  waitForElementToBeRemoval,
  within,
} from '@testing-library/react';

/** A QueryClient for tests: failures surface immediately and nothing is garbage-collected mid-test. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

export interface ProviderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

/** Renders `ui` inside the app providers (spec §10.2). i18n is global; routing and auth come in Phase 7. */
export function render(
  ui: ReactElement,
  { queryClient = createTestQueryClient(), ...options }: ProviderOptions = {},
) {
  function Providers({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, ...rtlRender(ui, { wrapper: Providers, ...options }) };
}
```

- [ ] **Step 3: Write the failing test `src/components/feedback/query-state.test.tsx`**

```tsx
import { useQuery } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { act, render, screen } from '@/test/render';

import { QueryState, type QueryLike } from './query-state';

function queryOf<T>(overrides: Partial<QueryLike<T, Error>>): QueryLike<T, Error> {
  return {
    status: 'pending',
    data: undefined,
    error: null,
    refetch: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('QueryState', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the loading slot only after the skeleton delay', () => {
    vi.useFakeTimers();
    render(
      <QueryState query={queryOf<string[]>({})} loading={<p>Loading items</p>}>
        {(data) => <p>{data.join(',')}</p>}
      </QueryState>,
    );
    expect(screen.queryByText('Loading items')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText('Loading items')).toBeInTheDocument();
  });

  it('renders children with the data on success', () => {
    render(
      <QueryState query={queryOf({ status: 'success', data: ['a', 'b'] })}>
        {(data) => <p>{data.join(',')}</p>}
      </QueryState>,
    );
    expect(screen.getByText('a,b')).toBeInTheDocument();
  });

  it('shows the default empty state for an empty array', () => {
    render(
      <QueryState query={queryOf<string[]>({ status: 'success', data: [] })}>
        {() => <p>list</p>}
      </QueryState>,
    );
    expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument();
  });

  it('uses isEmpty and the empty slot', () => {
    render(
      <QueryState
        query={queryOf({ status: 'success', data: { items: [] as string[] } })}
        isEmpty={(data) => data.items.length === 0}
        empty={<p>No items</p>}
      >
        {() => <p>list</p>}
      </QueryState>,
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('shows an error whose retry refetches the query', async () => {
    const query = queryOf<string[]>({ status: 'error', error: new Error('Boom') });
    const user = userEvent.setup();
    render(<QueryState query={query}>{() => null}</QueryState>);

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(query.refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps showing cached data when a background refetch fails', () => {
    render(
      <QueryState query={queryOf({ status: 'error', data: ['cached'], error: new Error('offline') })}>
        {(data) => <p>{data[0]}</p>}
      </QueryState>,
    );
    expect(screen.getByText('cached')).toBeInTheDocument();
  });

  it('works with a real useQuery result', async () => {
    function Harness() {
      const query = useQuery({
        queryKey: ['query-state-test'],
        queryFn: () => Promise.resolve(['real']),
      });
      return <QueryState query={query}>{(data) => <p>{data[0]}</p>}</QueryState>;
    }
    render(<Harness />);
    expect(await screen.findByText('real')).toBeInTheDocument();
  });
});
```

Run: `pnpm exec vitest run src/components/feedback/query-state.test.tsx`
Expected: FAIL, because `./query-state` is missing.

- [ ] **Step 4: Create `src/components/feedback/query-state.tsx`**

```tsx
import type { ReactNode } from 'react';

import { Delayed } from './delayed';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { PageLoader } from './page-loader';

/** The parts of a TanStack Query result that QueryState needs. Any `UseQueryResult` satisfies it. */
export interface QueryLike<TData, TError> {
  status: 'pending' | 'error' | 'success';
  data: TData | undefined;
  error: TError | null;
  refetch: () => Promise<unknown>;
}

export interface QueryStateProps<TData, TError> {
  query: QueryLike<TData, TError>;
  children: (data: TData) => ReactNode;
  /** Shown while the first load is pending, after SKELETON_DELAY_MS. Default: <PageLoader />. */
  loading?: ReactNode;
  /** Shown when `isEmpty(data)` is true. Default: <EmptyState />. */
  empty?: ReactNode;
  /** Default: null or undefined data, or an empty array. */
  isEmpty?: (data: TData) => boolean;
  /** Replaces the default <ErrorState />, whose "Try again" calls `query.refetch()`. */
  error?: ReactNode | ((error: TError, retry: () => void) => ReactNode);
}

function defaultIsEmpty(data: unknown): boolean {
  return data === null || data === undefined || (Array.isArray(data) && data.length === 0);
}

/**
 * Renders the right view for a query: loading, error (with retry), empty or success (spec §5.4).
 * Minimal usage: <QueryState query={q}>{(data) => …}</QueryState>
 */
export function QueryState<TData, TError = unknown>({
  query,
  children,
  loading,
  empty,
  isEmpty = defaultIsEmpty,
  error,
}: QueryStateProps<TData, TError>) {
  const retry = () => {
    void query.refetch();
  };

  // Data we already have wins over a failed background refetch (the global handler reports that error).
  if (query.data !== undefined) {
    return isEmpty(query.data) ? (empty ?? <EmptyState />) : children(query.data);
  }
  if (query.status === 'error') {
    if (typeof error === 'function') return error(query.error as TError, retry);
    return error ?? <ErrorState error={query.error} onRetry={retry} />;
  }
  return <Delayed>{loading ?? <PageLoader delayMs={0} />}</Delayed>;
}
```

Append to `src/components/feedback/index.ts`:

```ts
export { QueryState, type QueryLike, type QueryStateProps } from './query-state';
```

Run: `pnpm exec vitest run src/components/feedback/query-state.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Create `src/components/feedback/query-state.stories.tsx`**

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { QueryState, type QueryLike } from './query-state';
import { ListSkeleton } from './skeleton-presets';

const refetch = () => Promise.resolve();
const pending: QueryLike<string[], Error> = { status: 'pending', data: undefined, error: null, refetch };
const success: QueryLike<string[], Error> = { status: 'success', data: ['Alpha', 'Beta', 'Gamma'], error: null, refetch };
const empty: QueryLike<string[], Error> = { status: 'success', data: [], error: null, refetch };
const failed: QueryLike<string[], Error> = { status: 'error', data: undefined, error: new Error('Request failed'), refetch };

const renderList = (data: string[]) => (
  <ul className="list-disc pl-6">
    {data.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const meta = { title: 'Feedback/QueryState', parameters: { layout: 'padded' } } satisfies Meta;

export default meta;
type Story = StoryObj;

export const Loading: Story = {
  render: () => (
    <QueryState query={pending} loading={<ListSkeleton items={3} />}>
      {renderList}
    </QueryState>
  ),
};
export const Success: Story = { render: () => <QueryState query={success}>{renderList}</QueryState> };
export const Empty: Story = { render: () => <QueryState query={empty}>{renderList}</QueryState> };
export const Failed: Story = { render: () => <QueryState query={failed}>{renderList}</QueryState> };
```

- [ ] **Step 6: Write `docs/data-fetching.md`**

This is the first version. Phase 5 adds the HTTP client, query conventions and query keys above this section.

````markdown
# Data fetching

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

  | Slot | Default |
  |---|---|
  | loading | `PageLoader` |
  | empty | `EmptyState` (used for `null`, `undefined` and `[]`) |
  | error | `ErrorState` with **Try again** → `query.refetch()` |

- **No skeleton flash:** loading UI appears only after 200 ms (`SKELETON_DELAY_MS`), so fast responses never flash a skeleton.
- **Cached data wins:** if a background refetch fails while data is cached, the cached data stays on screen; the global error handler reports the failure.
- **Custom error slot:** pass `error={(err, retry) => …}` to take over the error view.
````

- [ ] **Step 7: Document the test helper (append to `docs/testing.md`)**

````markdown
## The provider-aware `render`

Import test helpers from `@/test/render` instead of `@testing-library/react`:

```tsx
import { render, screen } from '@/test/render';

const { queryClient } = render(<ItemsPage />); // wrapped in QueryClientProvider (retries off)
```

`createTestQueryClient()` gives you a client with retries off and no garbage collection, for tests that need one directly.
````

- [ ] **Step 8: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(feedback): add QueryState and provider-aware test render" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3.4: Generic ErrorBoundary and AsyncBoundary

**Files:**
- Create:
  - `src/core/errors/error-boundary.tsx`, `error-boundary.test.tsx`, `index.ts`
  - `src/components/feedback/async-boundary.tsx`, `async-boundary.test.tsx`
  - `docs/error-handling-and-logging.md`
- Modify: `src/components/feedback/index.ts`, `docs/data-fetching.md`

**Interfaces:**
- Produces:
  - `class ErrorBoundary` with props `{ children; fallback: (p: ErrorBoundaryFallbackProps) => ReactNode; onError?; onReset?; resetKeys? }`, and `interface ErrorBoundaryFallbackProps { error: unknown; reset: () => void }`. Both come from `@/core/errors`. Phase 4 adds `AppErrorBoundary` and global handlers there.
  - `<AsyncBoundary loading? error? resetKeys?>`: Suspense plus ErrorBoundary plus `QueryErrorResetBoundary`, so "Try again" also refetches failed suspense queries.

- [ ] **Step 1: Write the failing tests**

`src/core/errors/error-boundary.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './error-boundary';

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error('Kaboom');
  return <p>Safe</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // React reports caught errors
  });

  it('renders the fallback and reports the error with its component stack', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary
        onError={onError}
        fallback={({ error }) => <p>Caught: {error instanceof Error ? error.message : 'unknown'}</p>}
      >
        <Bomb explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Caught: Kaboom')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.stringContaining('Bomb') as unknown }),
    );
  });

  it('recovers when the fallback calls reset', async () => {
    let explode = true;
    function Maybe() {
      return <Bomb explode={explode} />;
    }
    const onReset = vi.fn();
    const user = userEvent.setup();
    render(
      <ErrorBoundary
        onReset={onReset}
        fallback={({ reset }) => (
          <button
            type="button"
            onClick={() => {
              explode = false;
              reset();
            }}
          >
            Reset
          </button>
        )}
      >
        <Maybe />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByText('Safe')).toBeInTheDocument();
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('resets itself when a reset key changes', () => {
    const fallback = () => <p>Fallback</p>;
    const { rerender } = render(
      <ErrorBoundary resetKeys={['/a']} fallback={fallback}>
        <Bomb explode />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Fallback')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKeys={['/b']} fallback={fallback}>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Safe')).toBeInTheDocument();
  });
});
```

`src/components/feedback/async-boundary.test.tsx`:

```tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { use } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/render';

import { AsyncBoundary } from './async-boundary';

describe('AsyncBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('shows the loading fallback while children suspend', async () => {
    let resolve: (value: string) => void = () => undefined;
    const promise = new Promise<string>((done) => {
      resolve = done;
    });
    function Suspends() {
      return <p>{use(promise)}</p>;
    }

    render(
      <AsyncBoundary loading={<p>Waiting</p>}>
        <Suspends />
      </AsyncBoundary>,
    );
    expect(screen.getByText('Waiting')).toBeInTheDocument();

    resolve('Ready');
    expect(await screen.findByText('Ready')).toBeInTheDocument();
  });

  it('retries a failed suspense query from its error state', async () => {
    let attempts = 0;
    function Data() {
      const { data } = useSuspenseQuery({
        queryKey: ['async-boundary-retry'],
        queryFn: () => {
          attempts += 1;
          return attempts === 1 ? Promise.reject(new Error('Boom')) : Promise.resolve('Loaded');
        },
      });
      return <p>{data}</p>;
    }
    const user = userEvent.setup();
    render(
      <AsyncBoundary>
        <Data />
      </AsyncBoundary>,
    );

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Loaded')).toBeInTheDocument();
  });
});
```

Run: `pnpm exec vitest run src/core/errors src/components/feedback/async-boundary.test.tsx`
Expected: FAIL, because the modules are missing.

- [ ] **Step 2: Create `src/core/errors/error-boundary.tsx`**

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryFallbackProps {
  error: unknown;
  /** Clears the error and renders the children again. */
  reset: () => void;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (props: ErrorBoundaryFallbackProps) => ReactNode;
  /** Called once per caught error, with React's component stack. */
  onError?: (error: unknown, info: ErrorInfo) => void;
  onReset?: () => void;
  /** When any value changes (e.g. the route path), a caught error is cleared automatically. */
  resetKeys?: readonly unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

const changed = (a: readonly unknown[] = [], b: readonly unknown[] = []) =>
  a.length !== b.length || a.some((value, index) => !Object.is(value, b[index]));

/** Generic render-error boundary. Class components are still the only way to catch render errors. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.hasError && changed(previous.resetKeys, this.props.resetKeys)) this.reset();
  }

  reset = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback({ error: this.state.error, reset: this.reset });
    }
    return this.props.children;
  }
}
```

- [ ] **Step 3: Create `src/core/errors/index.ts`**

```ts
export {
  ErrorBoundary,
  type ErrorBoundaryFallbackProps,
  type ErrorBoundaryProps,
} from './error-boundary';
```

- [ ] **Step 4: Create `src/components/feedback/async-boundary.tsx`**

```tsx
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { type ReactNode, Suspense } from 'react';

import { ErrorBoundary, type ErrorBoundaryFallbackProps } from '@/core/errors';

import { ErrorState } from './error-state';
import { PageLoader } from './page-loader';

export interface AsyncBoundaryProps {
  children: ReactNode;
  /** Suspense fallback. Default: <PageLoader />. */
  loading?: ReactNode;
  /** Error fallback. Default: <ErrorState /> whose "Try again" also resets failed queries. */
  error?: (props: ErrorBoundaryFallbackProps) => ReactNode;
  resetKeys?: readonly unknown[];
}

const defaultError = ({ error, reset }: ErrorBoundaryFallbackProps) => (
  <ErrorState error={error} onRetry={reset} />
);

/** Suspense + error boundary in one, for `useSuspenseQuery` and lazy components (spec §5.4). */
export function AsyncBoundary({ children, loading, error = defaultError, resetKeys }: AsyncBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} resetKeys={resetKeys} fallback={error}>
          <Suspense fallback={loading ?? <PageLoader />}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

Append to `src/components/feedback/index.ts`:

```ts
export { AsyncBoundary, type AsyncBoundaryProps } from './async-boundary';
```

Run: `pnpm exec vitest run src/core/errors src/components/feedback`
Expected: PASS.

- [ ] **Step 5: Document it (append to `docs/data-fetching.md`)**

````markdown
## Suspense style: `AsyncBoundary`

For `useSuspenseQuery` (or lazy components), wrap the subtree once:

```tsx
<AsyncBoundary loading={<DetailSkeleton />}>
  <ItemDetails id={id} /> {/* calls useSuspenseQuery inside */}
</AsyncBoundary>
```

`AsyncBoundary` combines `Suspense`, an error boundary and TanStack Query's `QueryErrorResetBoundary`, so **Try again** also refetches the failed queries. Use `resetKeys={[id]}` to clear the error automatically when the input changes.
````

- [ ] **Step 6: Write `docs/error-handling-and-logging.md`**

This is the first version; Phase 4 completes it.

````markdown
# Error handling and logging

## Error boundaries

`ErrorBoundary` (`@/core/errors`) catches render errors in its subtree and renders a fallback:

```tsx
<ErrorBoundary
  fallback={({ error, reset }) => <ErrorState error={error} onRetry={reset} />}
  onError={(error, info) => {/* report */}}
  resetKeys={[location.pathname]}
>
  {children}
</ErrorBoundary>
```

- `reset()` clears the error and renders the children again.
- `resetKeys` does the same automatically when a key changes, for example on navigation.
- For data fetched with suspense, use `AsyncBoundary`, which also resets failed queries (docs/data-fetching.md).
````

- [ ] **Step 7: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(errors): add error boundary and async boundary" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3.5: DataTable (TanStack Table v9, server-driven)

**Files:**
- Create: `src/components/ui/data-table-features.ts`, `src/components/ui/data-table.tsx`, `src/components/ui/data-table.test.tsx`, `src/components/ui/data-table.stories.tsx`
- Modify: `src/config/constants.ts`, `src/locales/{en,es}/common.json`, `docs/design-system.md`

**Interfaces:**
- Consumes: `TableSkeleton`, `EmptyState` (Phase 3); the `Table*`, `Button` and `Select*` primitives.
- Produces:
  - `dataTableFeatures` and `type DataTableFeatures`
  - `createDataTableColumnHelper<TData>()`, which is `createColumnHelper<DataTableFeatures, TData>()`
  - `<DataTable columns data isLoading? empty? pagination? sorting? getRowId? caption? />`
    - `pagination = { state: PaginationState; onChange: OnChangeFn<PaginationState>; rowCount: number; pageSizeOptions?: readonly number[] }`
    - `sorting = { state: SortingState; onChange: OnChangeFn<SortingState> }`
  - constants `DEFAULT_PAGE_SIZE = 10` and `PAGE_SIZE_OPTIONS = [10, 20, 50]`

- [ ] **Step 1: Install and add the constants**

Run: `pnpm add @tanstack/react-table`

Append to `src/config/constants.ts`:

```ts
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
```

- [ ] **Step 2: Add the translations**

Deep-merge into `src/locales/en/common.json`:

```json
{
  "pagination": {
    "firstPage": "Go to first page",
    "lastPage": "Go to last page",
    "pageOf": "Page {{page}} of {{pageCount}}",
    "rowsPerPage": "Rows per page",
    "total": "{{count}} total"
  }
}
```

Deep-merge into `src/locales/es/common.json`:

```json
{
  "pagination": {
    "firstPage": "Ir a la primera página",
    "lastPage": "Ir a la última página",
    "pageOf": "Página {{page}} de {{pageCount}}",
    "rowsPerPage": "Filas por página",
    "total": "{{count}} en total"
  }
}
```

- [ ] **Step 3: Write the failing test `src/components/ui/data-table.test.tsx`**

```tsx
import type { PaginationState, SortingState, Updater } from '@tanstack/react-table';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/render';

import { createDataTableColumnHelper, DataTable } from './data-table';

interface Person {
  id: string;
  name: string;
  age: number;
}

const people: Person[] = [
  { id: '1', name: 'Ada', age: 36 },
  { id: '2', name: 'Grace', age: 45 },
];

const column = createDataTableColumnHelper<Person>();
const columns = column.columns([
  column.accessor('name', { header: 'Name' }),
  column.accessor('age', { header: 'Age', enableSorting: false }),
]);

const apply = <T,>(updater: Updater<T>, old: T): T =>
  typeof updater === 'function' ? (updater as (previous: T) => T)(old) : updater;

describe('DataTable', () => {
  it('renders headers and cells', () => {
    render(<DataTable columns={columns} data={people} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Grace' })).toBeInTheDocument();
  });

  it('shows the table skeleton while loading', () => {
    render(<DataTable columns={columns} data={undefined} isLoading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('shows the empty state when there are no rows', () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument();
  });

  it('reports sorting changes from sortable headers only', async () => {
    const onChange = vi.fn<(updater: Updater<SortingState>) => void>();
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={people} sorting={{ state: [], onChange }} />);

    expect(screen.queryByRole('button', { name: /Age/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Name/ }));

    const update = onChange.mock.calls[0]?.[0];
    expect(update && apply(update, [])).toEqual([expect.objectContaining({ id: 'name' })]);
  });

  it('reports page changes and shows the page position', async () => {
    const onChange = vi.fn<(updater: Updater<PaginationState>) => void>();
    const user = userEvent.setup();
    const state = { pageIndex: 0, pageSize: 2 };
    render(
      <DataTable columns={columns} data={people} pagination={{ state, onChange, rowCount: 4 }} />,
    );

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to next page' }));

    const update = onChange.mock.calls[0]?.[0];
    expect(update && apply(update, state)).toEqual({ pageIndex: 1, pageSize: 2 });
  });
});
```

Run: `pnpm exec vitest run src/components/ui/data-table.test.tsx`
Expected: FAIL, because `./data-table` is missing.

- [ ] **Step 4: Create `src/components/ui/data-table-features.ts`**

```ts
import {
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/react-table';

/**
 * Features every DataTable supports (TanStack Table v9 tree-shakes the rest).
 * Tables are server-driven, so no client-side row models are registered.
 * `columnVisibilityFeature` is required for `row.getVisibleCells()`.
 */
export const dataTableFeatures = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
});

export type DataTableFeatures = typeof dataTableFeatures;
```

- [ ] **Step 5: Create `src/components/ui/data-table.tsx`**

```tsx
import {
  type ColumnDef,
  createColumnHelper,
  type OnChangeFn,
  type PaginationState,
  type ReactTable,
  type RowData,
  type SortingState,
  useTable,
} from '@tanstack/react-table';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronsUpDownIcon,
} from 'lucide-react';
import { type ReactNode, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState, TableSkeleton } from '@/components/feedback';
import { PAGE_SIZE_OPTIONS } from '@/config/constants';

import { Button } from './button';
import { dataTableFeatures, type DataTableFeatures } from './data-table-features';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

export type { DataTableFeatures } from './data-table-features';

/** Column helper bound to the DataTable feature set: `const col = createDataTableColumnHelper<Item>()`. */
export const createDataTableColumnHelper = <TData extends RowData>() =>
  createColumnHelper<DataTableFeatures, TData>();

export interface DataTablePaginationConfig {
  state: PaginationState;
  onChange: OnChangeFn<PaginationState>;
  /** Total number of rows on the server, used for the page count. */
  rowCount: number;
  pageSizeOptions?: readonly number[];
}

export interface DataTableSortingConfig {
  state: SortingState;
  onChange: OnChangeFn<SortingState>;
}

export interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: readonly TData[] | undefined;
  /** Shows <TableSkeleton /> instead of rows. */
  isLoading?: boolean;
  /** Shown when there are no rows. Default: <EmptyState />. */
  empty?: ReactNode;
  /** Server-side pagination. Omit it for an unpaginated table. */
  pagination?: DataTablePaginationConfig;
  /** Server-side sorting. Omit it to make every column non-sortable. */
  sorting?: DataTableSortingConfig;
  getRowId?: (row: TData, index: number) => string;
  /** Accessible caption (visually hidden). */
  caption?: string;
}

const EMPTY_ROWS: never[] = [];
const ARIA_SORT = { asc: 'ascending', desc: 'descending', none: 'none' } as const;

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc') return <ArrowUpIcon aria-hidden="true" />;
  if (direction === 'desc') return <ArrowDownIcon aria-hidden="true" />;
  return <ChevronsUpDownIcon aria-hidden="true" className="text-muted-foreground" />;
}

/**
 * Server-driven table (spec §5.3). Sorting and pagination state belong to the caller (usually the URL);
 * the table renders and reports changes. Define `columns` outside render (or memoise them).
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  isLoading = false,
  empty,
  pagination,
  sorting,
  getRowId,
  caption,
}: DataTableProps<TData>) {
  const rows = useMemo(() => (data ? [...data] : EMPTY_ROWS), [data]);

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: rows,
    getRowId,
    manualPagination: true,
    manualSorting: true,
    enableSorting: sorting !== undefined,
    rowCount: pagination?.rowCount,
    state: {
      ...(pagination ? { pagination: pagination.state } : {}),
      ...(sorting ? { sorting: sorting.state } : {}),
    },
    onPaginationChange: pagination?.onChange,
    onSortingChange: sorting?.onChange,
  });

  if (isLoading) {
    return <TableSkeleton rows={pagination?.state.pageSize ?? 5} columns={columns.length} />;
  }

  const visibleRows = table.getRowModel().rows;

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-md border">
        <Table>
          {caption ? <TableCaption className="sr-only">{caption}</TableCaption> : null}
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const direction = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      aria-sort={canSort ? ARIA_SORT[direction || 'none'] : undefined}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <table.FlexRender header={header} />
                          <SortIcon direction={direction} />
                        </Button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {visibleRows.length > 0 ? (
              visibleRows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  {empty ?? <EmptyState className="border-0" />}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pagination ? (
        <DataTablePagination table={table} pageSizeOptions={pagination.pageSizeOptions} />
      ) : null}
    </div>
  );
}

function DataTablePagination<TData extends RowData>({
  table,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: {
  table: ReactTable<DataTableFeatures, TData>;
  pageSizeOptions?: readonly number[] | undefined;
}) {
  const { t } = useTranslation();
  const labelId = useId();
  const { pageIndex, pageSize } = table.state.pagination;
  const pageCount = Math.max(table.getPageCount(), 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">{t('pagination.total', { count: table.getRowCount() })}</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span id={labelId} className="text-muted-foreground">
            {t('pagination.rowsPerPage')}
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger size="sm" aria-labelledby={labelId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span aria-live="polite">{t('pagination.pageOf', { page: pageIndex + 1, pageCount })}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label={t('pagination.firstPage')}
            disabled={!table.getCanPreviousPage()}
            onClick={() => {
              table.firstPage();
            }}
          >
            <ChevronsLeftIcon aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t('pagination.previousPage')}
            disabled={!table.getCanPreviousPage()}
            onClick={() => {
              table.previousPage();
            }}
          >
            <ChevronLeftIcon aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t('pagination.nextPage')}
            disabled={!table.getCanNextPage()}
            onClick={() => {
              table.nextPage();
            }}
          >
            <ChevronRightIcon aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t('pagination.lastPage')}
            disabled={!table.getCanNextPage()}
            onClick={() => {
              table.lastPage();
            }}
          >
            <ChevronsRightIcon aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

Run: `pnpm exec vitest run src/components/ui/data-table.test.tsx`
Expected: PASS (5 tests).

If a v9 name differs from what this plan uses (for example `table.state` vs `table.getState()`, or `firstPage`), check `node_modules/@tanstack/table-core/dist/index.d.ts`, keep the component's props unchanged, and record the change.

- [ ] **Step 6: Create `src/components/ui/data-table.stories.tsx`**

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { createDataTableColumnHelper, DataTable } from './data-table';

interface Row {
  id: string;
  name: string;
  quantity: number;
}

const ALL_ROWS: Row[] = Array.from({ length: 23 }, (_, index) => ({
  id: String(index + 1),
  name: `Sample row ${String(index + 1).padStart(2, '0')}`,
  quantity: (index * 7) % 50,
}));

const column = createDataTableColumnHelper<Row>();
const columns = column.columns([
  column.accessor('name', { header: 'Name' }),
  column.accessor('quantity', { header: 'Quantity' }),
]);

/** Simulates a server: sorts and slices the rows the way an API would. */
function ServerDrivenDemo() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 5 });
  const [sorting, setSorting] = useState<SortingState>([]);

  const page = useMemo(() => {
    const [sort] = sorting;
    const sorted = sort
      ? [...ALL_ROWS].sort((a, b) => {
          const key = sort.id as keyof Row;
          const order = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
          return sort.desc ? -order : order;
        })
      : ALL_ROWS;
    const start = pagination.pageIndex * pagination.pageSize;
    return sorted.slice(start, start + pagination.pageSize);
  }, [pagination, sorting]);

  return (
    <DataTable
      caption="Sample rows"
      columns={columns}
      data={page}
      sorting={{ state: sorting, onChange: setSorting }}
      pagination={{ state: pagination, onChange: setPagination, rowCount: ALL_ROWS.length }}
    />
  );
}

const meta = { title: 'UI/DataTable', parameters: { layout: 'padded' } } satisfies Meta;

export default meta;
type Story = StoryObj;

export const ServerDriven: Story = { render: () => <ServerDrivenDemo /> };
export const Loading: Story = {
  render: () => <DataTable columns={columns} data={undefined} isLoading />,
};
export const Empty: Story = { render: () => <DataTable columns={columns} data={[]} /> };
```

- [ ] **Step 7: Append "Async state components and DataTable" to `docs/design-system.md`**

````markdown
## Async state components (`@/components/feedback`)

| Component | Use it for |
|---|---|
| `Spinner` | Inline loading (buttons, small areas) |
| `PageLoader` | Full-page (`variant="page"`) or section loading; the lazy-route fallback |
| `Skeleton` | A base shimmer block |
| `TableSkeleton`, `CardSkeleton`, `ListSkeleton`, `FormSkeleton`, `DetailSkeleton` | Ready-made skeletons |
| `EmptyState` | Icon, title, description and an optional action |
| `ErrorState` | Friendly message and **Try again**. Technical details show in development only. |
| `QueryState`, `AsyncBoundary` | Pick the right state automatically (docs/data-fetching.md) |

Loading UI waits 200 ms (`SKELETON_DELAY_MS`) before appearing, so fast responses never flash a skeleton.

## DataTable

`DataTable` (`@/components/ui/data-table`) wraps TanStack Table v9 with sorting, pagination, and loading and empty states. It is **server-driven**: the caller owns `sorting` and `pagination` state (usually synced to the URL) and fetches the matching page.

```tsx
const column = createDataTableColumnHelper<Item>();
const columns = column.columns([
  column.accessor('name', { header: () => t('items:fields.name') }),
  column.accessor('price', { header: () => t('items:fields.price'), cell: (c) => formatCurrency(c.getValue()) }),
]); // define outside render or wrap in useMemo

<DataTable
  columns={columns}
  data={query.data?.items}
  isLoading={query.isPending}
  sorting={{ state: sorting, onChange: setSorting }}
  pagination={{ state: pagination, onChange: setPagination, rowCount: query.data?.total ?? 0 }}
/>
```

Omit `sorting` to disable sorting, or `pagination` to hide the pager. For small static tables, use the plain `Table` primitive.
````

- [ ] **Step 8: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm storybook:build`
Expected: all green.

```bash
git add -A
git commit -m "feat(ui): add server-driven data table" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Phase 3 gate

- [ ] Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Expected: all green.
- [ ] Run `pnpm storybook` and check:
  - every `Feedback/*` story, plus `UI/DataTable`, renders in light and dark, and in `en` and `es`
  - DataTable sorting and paging work in the `ServerDriven` story
  - the Accessibility panel shows no violations
- [ ] Post the **Phase 3 report**, noting that `ErrorBoundary` was pulled forward from Phase 4 and `DataTable` was deferred from Phase 2. Then **STOP** until the owner approves.

---

# Phase 4 — Core services

Scope (spec §12): the logger, `notify` + `useConfirm`, the storage wrappers (already delivered in Task 2.1, so only reported here), and the root error boundary with global handlers.

### Task 4.1: Logger with redaction and transports (spec §7.4)

**Files:**
- Create:
  - `src/core/logger/types.ts`, `redact.ts`, `logger.ts`, `transports/console.ts`, `transports/sentry.ts`, `index.ts`
  - tests: `src/core/logger/redact.test.ts`, `logger.test.ts`, `transports/console.test.ts`, `transports/sentry.test.ts`
- Modify: `docs/error-handling-and-logging.md`, `docs/security.md`

**Interfaces:**
- Consumes: `env.VITE_LOG_LEVEL`, `env.VITE_SENTRY_DSN`, `env.VITE_APP_ENV`, `env.isDev`, `env.isTest`, and `APP_VERSION` / `GIT_SHA`.
- Produces (all from `@/core/logger`):
  - `logger.debug|info|warn|error(message: string, context?: LogContext): void`
  - `logger.setUser(userId: string | null)`: an id only, never personal data
  - `logger.addTransport(transport): () => void`
  - `createLogger(options)`, `createRedactor(keys?)`, `DEFAULT_REDACT_KEYS`
  - types `LogEntry`, `LogTransport`, `LogContext`, `Logger`
  - **Context conventions:**
    - `context.error` carries the thrown value. It becomes `entry.error`, and the same error object is logged only once.
    - `context.requestId` becomes `entry.meta.requestId`.

- [ ] **Step 1: Install**

Run: `pnpm add @sentry/react`

It is only imported dynamically when `VITE_SENTRY_DSN` is set.

- [ ] **Step 2: Create `src/core/logger/types.ts`**

```ts
import type { AppEnvironment, LogLevel } from '@/config/env';

export type { LogLevel } from '@/config/env';

/** Extra structured data for a log entry. Sensitive keys are redacted automatically. */
export type LogContext = Record<string, unknown>;

export interface LogEntry {
  level: LogLevel;
  message: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** The caller's context, with sensitive keys redacted and errors serialised. */
  context: LogContext;
  /** The raw thrown value from `context.error`, for transports that capture exceptions. */
  error?: unknown;
  /** Attached automatically (spec §7.4). `userId` is an id only, never personal data. */
  meta: {
    appVersion: string;
    gitSha: string;
    environment: AppEnvironment;
    route: string;
    userId?: string;
    requestId?: string;
  };
}

export interface LogTransport {
  readonly name: string;
  /** The minimum level this transport receives. Defaults to every level the logger lets through. */
  readonly minLevel?: LogLevel;
  log(entry: LogEntry): void;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  /** Adds a transport; returns a function that removes it. */
  addTransport(transport: LogTransport): () => void;
  /** Sets the user id attached to later entries (`null` after logout). */
  setUser(userId: string | null): void;
}
```

- [ ] **Step 3: Write the failing tests**

`src/core/logger/redact.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createRedactor } from './redact';

describe('createRedactor', () => {
  const redact = createRedactor();

  it('redacts sensitive keys at any depth, case- and separator-insensitively', () => {
    expect(
      redact({
        user: { id: 'u1', password: 'hunter2' },
        headers: { Authorization: 'Bearer x', 'x-api-key': 'k', 'Set-Cookie': 'a=b' },
        accessToken: 't',
        items: [{ secret: 's', name: 'ok' }],
      }),
    ).toEqual({
      user: { id: 'u1', password: '[REDACTED]' },
      headers: { Authorization: '[REDACTED]', 'x-api-key': '[REDACTED]', 'Set-Cookie': '[REDACTED]' },
      accessToken: '[REDACTED]',
      items: [{ secret: '[REDACTED]', name: 'ok' }],
    });
  });

  it('serialises errors and dates, and survives circular references', () => {
    const circular: Record<string, unknown> = { name: 'loop' };
    circular.self = circular;

    const result = redact({ error: new Error('Boom'), at: new Date(0), circular }) as Record<string, Record<string, unknown>>;

    expect(result.error).toMatchObject({ name: 'Error', message: 'Boom' });
    expect(result.at).toBe('1970-01-01T00:00:00.000Z');
    expect(result.circular).toEqual({ name: 'loop', self: '[Circular]' });
  });

  it('accepts a custom key list', () => {
    expect(createRedactor(['ssn'])({ ssn: '1', password: 'kept' })).toEqual({ ssn: '[REDACTED]', password: 'kept' });
  });
});
```

`src/core/logger/logger.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { createLogger } from './logger';
import type { LogEntry, LogTransport } from './types';

function memoryTransport(minLevel?: LogTransport['minLevel']) {
  const entries: LogEntry[] = [];
  const transport: LogTransport = { name: 'memory', minLevel, log: (entry) => entries.push(entry) };
  return { entries, transport };
}

describe('createLogger', () => {
  it('drops entries below the level threshold', () => {
    const { entries, transport } = memoryTransport();
    const logger = createLogger({ level: 'warn', transports: [transport] });

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(entries.map((entry) => entry.level)).toEqual(['warn', 'error']);
  });

  it('attaches app metadata, route, user and request ids', () => {
    const { entries, transport } = memoryTransport();
    const logger = createLogger({ level: 'debug', transports: [transport], getRoute: () => '/items' });

    logger.setUser('user-1');
    logger.info('Loaded', { requestId: 'req-9', count: 3 });

    expect(entries[0]).toMatchObject({
      level: 'info',
      message: 'Loaded',
      context: { count: 3 },
      meta: { route: '/items', userId: 'user-1', requestId: 'req-9', environment: 'development' },
    });
    expect(entries[0]?.meta.appVersion).toEqual(expect.any(String));
  });

  it('redacts sensitive context', () => {
    const { entries, transport } = memoryTransport();
    createLogger({ level: 'debug', transports: [transport] }).info('Login', { password: 'x' });
    expect(entries[0]?.context).toEqual({ password: '[REDACTED]' });
  });

  it('keeps the raw error and logs the same error object only once', () => {
    const { entries, transport } = memoryTransport();
    const logger = createLogger({ level: 'debug', transports: [transport] });
    const error = new Error('Boom');

    logger.error('First report', { error });
    logger.error('Duplicate report', { error });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.error).toBe(error);
  });

  it('respects a transport minimum level and isolates failing transports', () => {
    const { entries, transport } = memoryTransport('error');
    const broken: LogTransport = {
      name: 'broken',
      log: () => {
        throw new Error('transport down');
      },
    };
    const logger = createLogger({ level: 'debug', transports: [broken, transport] });

    logger.warn('ignored by memory transport');
    expect(() => {
      logger.error('still delivered');
    }).not.toThrow();
    expect(entries.map((entry) => entry.message)).toEqual(['still delivered']);
  });

  it('adds and removes transports at runtime', () => {
    const { entries, transport } = memoryTransport();
    const logger = createLogger({ level: 'debug' });
    const remove = logger.addTransport(transport);

    logger.info('one');
    remove();
    logger.info('two');

    expect(entries.map((entry) => entry.message)).toEqual(['one']);
  });

  it('uses the injected clock', () => {
    const { entries, transport } = memoryTransport();
    const now = vi.fn(() => new Date('2026-01-02T03:04:05.000Z'));
    createLogger({ level: 'debug', transports: [transport], now }).info('tick');
    expect(entries[0]?.timestamp).toBe('2026-01-02T03:04:05.000Z');
  });
});
```

Run: `pnpm exec vitest run src/core/logger`
Expected: FAIL, because the modules are missing.

- [ ] **Step 4: Create `src/core/logger/redact.ts`**

```ts
/** Keys whose values are never logged (spec §7.4). Matching ignores case, `-` and `_`, and substrings count. */
export const DEFAULT_REDACT_KEYS = [
  'password',
  'token',
  'authorization',
  'cookie',
  'secret',
  'apiKey',
] as const;

const MAX_DEPTH = 8;
const REDACTED = '[REDACTED]';

const normalise = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Returns a function that deep-copies a value with sensitive keys replaced by "[REDACTED]". */
export function createRedactor(keys: readonly string[] = DEFAULT_REDACT_KEYS) {
  const needles = keys.map(normalise);
  const isSensitive = (key: string) => {
    const normalised = normalise(key);
    return needles.some((needle) => normalised.includes(needle));
  };

  function redactEntries(source: object, depth: number, ancestors: WeakSet<object>) {
    return Object.fromEntries(
      Object.entries(source).map(([key, child]) => [
        key,
        isSensitive(key) ? REDACTED : redact(child, depth + 1, ancestors),
      ]),
    );
  }

  function redact(value: unknown, depth = 0, ancestors = new WeakSet<object>()): unknown {
    if (typeof value !== 'object' || value === null) return value;
    if (value instanceof Date) return value.toISOString();
    if (ancestors.has(value)) return '[Circular]';
    if (depth >= MAX_DEPTH) return '[Truncated]';

    ancestors.add(value);
    try {
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
          ...redactEntries(value, depth, ancestors),
        };
      }
      if (Array.isArray(value)) return value.map((item: unknown) => redact(item, depth + 1, ancestors));
      return redactEntries(value, depth, ancestors);
    } finally {
      ancestors.delete(value);
    }
  }

  return (value: unknown) => redact(value);
}
```

- [ ] **Step 5: Create `src/core/logger/logger.ts`**

```ts
import { APP_VERSION, GIT_SHA } from '@/config/constants';
import { env, type LogLevel } from '@/config/env';

import { createRedactor } from './redact';
import type { LogContext, LogEntry, Logger, LogTransport } from './types';

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface LoggerOptions {
  /** Entries below this level are dropped. */
  level: LogLevel;
  transports?: LogTransport[];
  redactKeys?: readonly string[];
  /** The current route (default: `window.location.pathname`). */
  getRoute?: () => string;
  now?: () => Date;
}

export function createLogger(options: LoggerOptions): Logger {
  const transports = new Set<LogTransport>(options.transports ?? []);
  const redact = createRedactor(options.redactKeys);
  const getRoute = options.getRoute ?? (() => window.location.pathname);
  const now = options.now ?? (() => new Date());
  const reportedErrors = new WeakSet<object>();
  let userId: string | undefined;

  function emit(level: LogLevel, message: string, context: LogContext = {}): void {
    if (LEVEL_RANK[level] < LEVEL_RANK[options.level]) return;

    const { requestId, ...rest } = context;
    const error = rest.error;
    if (typeof error === 'object' && error !== null) {
      // The same error can reach several reporters (boundary, root callbacks, global handlers).
      if (reportedErrors.has(error)) return;
      reportedErrors.add(error);
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: now().toISOString(),
      context: redact(rest) as LogContext,
      error,
      meta: {
        appVersion: APP_VERSION,
        gitSha: GIT_SHA,
        environment: env.VITE_APP_ENV,
        route: getRoute(),
        userId,
        requestId: typeof requestId === 'string' ? requestId : undefined,
      },
    };

    for (const transport of transports) {
      if (transport.minLevel && LEVEL_RANK[level] < LEVEL_RANK[transport.minLevel]) continue;
      try {
        transport.log(entry);
      } catch {
        // A failing transport must never break the app or the other transports.
      }
    }
  }

  return {
    debug: (message, context) => {
      emit('debug', message, context);
    },
    info: (message, context) => {
      emit('info', message, context);
    },
    warn: (message, context) => {
      emit('warn', message, context);
    },
    error: (message, context) => {
      emit('error', message, context);
    },
    addTransport(transport) {
      transports.add(transport);
      return () => {
        transports.delete(transport);
      };
    },
    setUser(id) {
      userId = id ?? undefined;
    },
  };
}
```

Run: `pnpm exec vitest run src/core/logger`
Expected: the redact and logger tests PASS.

- [ ] **Step 6: Write the failing transport tests**

`src/core/logger/transports/console.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import type { LogEntry } from '../types';

import { createConsoleTransport } from './console';

const entry = (level: LogEntry['level']): LogEntry => ({
  level,
  message: 'Saved',
  timestamp: '2026-01-01T00:00:00.000Z',
  context: { id: 1 },
  meta: { appVersion: '1.0.0', gitSha: 'abc', environment: 'development', route: '/items' },
});

describe('console transport', () => {
  it('writes each level to the matching console method', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const transport = createConsoleTransport();

    transport.log(entry('warn'));
    transport.log(entry('error'));

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Saved'), expect.any(String), expect.any(String), expect.objectContaining({ id: 1, route: '/items' }));
    expect(error).toHaveBeenCalledTimes(1);
  });
});
```

`src/core/logger/transports/sentry.test.ts`:

```ts
import * as Sentry from '@sentry/react';
import { describe, expect, it, vi } from 'vitest';

import type { LogEntry } from '../types';

import { createSentryTransport } from './sentry';

vi.mock('@sentry/react', () => {
  const scope = { setTag: vi.fn(), setUser: vi.fn(), setExtras: vi.fn() };
  return {
    init: vi.fn(),
    withScope: vi.fn((callback: (s: typeof scope) => void) => {
      callback(scope);
    }),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    addBreadcrumb: vi.fn(),
  };
});

const base: Omit<LogEntry, 'level' | 'message'> = {
  timestamp: '2026-01-01T00:00:00.000Z',
  context: {},
  meta: { appVersion: '1.0.0', gitSha: 'abc', environment: 'production', route: '/items', requestId: 'req-1' },
};

describe('sentry transport', () => {
  it('initialises lazily with privacy-safe options and captures errors', async () => {
    const transport = createSentryTransport({ dsn: 'https://key@example.com/1', environment: 'production', release: '1.0.0+abc' });
    const error = new Error('Boom');

    transport.log({ ...base, level: 'error', message: 'Request failed', error });
    await vi.dynamicImportSettled();

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://key@example.com/1', dataCollection: expect.objectContaining({ userInfo: false, cookies: false }) as unknown }),
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it('turns warnings into breadcrumbs', async () => {
    const transport = createSentryTransport({ dsn: 'https://key@example.com/1', environment: 'production', release: '1' });
    transport.log({ ...base, level: 'warn', message: 'Slow response' });
    await vi.dynamicImportSettled();

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ level: 'warning', message: 'Slow response' }));
  });
});
```

Run: `pnpm exec vitest run src/core/logger/transports`
Expected: FAIL, because the modules are missing.

- [ ] **Step 7: Create `src/core/logger/transports/console.ts`**

```ts
import type { LogEntry, LogLevel, LogTransport } from '../types';

const LABEL_STYLE: Record<LogLevel, string> = {
  debug: 'color: gray',
  info: 'color: dodgerblue',
  warn: 'color: darkorange',
  error: 'color: crimson; font-weight: bold',
};

/** Pretty console output (spec §7.4). In production it is registered for errors only. */
export function createConsoleTransport(options: { minLevel?: LogLevel } = {}): LogTransport {
  return {
    name: 'console',
    minLevel: options.minLevel,
    log(entry: LogEntry) {
      const args = [
        `%c[${entry.level}]%c ${entry.message}`,
        LABEL_STYLE[entry.level],
        'color: inherit',
        { ...entry.context, route: entry.meta.route, requestId: entry.meta.requestId, userId: entry.meta.userId },
      ] as const;
      switch (entry.level) {
        case 'debug':
          console.debug(...args);
          break;
        case 'info':
          console.info(...args);
          break;
        case 'warn':
          console.warn(...args);
          break;
        case 'error':
          console.error(...args);
          break;
      }
    },
  };
}
```

- [ ] **Step 8: Create `src/core/logger/transports/sentry.ts`**

```ts
import type * as SentrySdk from '@sentry/react';

import type { LogEntry, LogTransport } from '../types';

export interface SentryTransportOptions {
  dsn: string;
  environment: string;
  release: string;
}

type Sdk = typeof SentrySdk;

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
 * The SDK is loaded on demand, so it stays out of the main bundle; entries logged before it loads are queued.
 */
export function createSentryTransport({ dsn, environment, release }: SentryTransportOptions): LogTransport {
  let sdk: Sdk | undefined;
  const queue: LogEntry[] = [];

  void import('@sentry/react')
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
```

- [ ] **Step 9: Create `src/core/logger/index.ts`**

```ts
import { APP_VERSION, GIT_SHA } from '@/config/constants';
import { env } from '@/config/env';

import { createLogger } from './logger';
import { createConsoleTransport } from './transports/console';
import { createSentryTransport } from './transports/sentry';
import type { LogTransport } from './types';

export { createLogger, type LoggerOptions } from './logger';
export { createRedactor, DEFAULT_REDACT_KEYS } from './redact';
export type { LogContext, LogEntry, Logger, LogLevel, LogTransport } from './types';

function defaultTransports(): LogTransport[] {
  if (env.isTest) return []; // tests attach their own transports
  const transports: LogTransport[] = [
    createConsoleTransport({ minLevel: env.isDev ? undefined : 'error' }),
  ];
  if (env.VITE_SENTRY_DSN) {
    transports.push(
      createSentryTransport({
        dsn: env.VITE_SENTRY_DSN,
        environment: env.VITE_APP_ENV,
        release: `${APP_VERSION}+${GIT_SHA}`,
      }),
    );
  }
  return transports;
}

/** The app logger (spec §7.4). Use it instead of console.* (ESLint enforces this). */
export const logger = createLogger({ level: env.VITE_LOG_LEVEL, transports: defaultTransports() });
```

Run: `pnpm exec vitest run src/core/logger`
Expected: PASS, all logger tests.

- [ ] **Step 10: Append "Logging" to `docs/error-handling-and-logging.md`**

````markdown
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
- **Redaction:** keys containing `password`, `token`, `authorization`, `cookie`, `secret` or `apiKey` (in any case, with or without `-`/`_`) are replaced with `[REDACTED]` at any depth. Change the list with `createLogger({ redactKeys })`.
- **De-duplication:** the same error object is logged once, even if a boundary, a React root callback and a global handler all see it.

### Transports

| Transport | When | What |
|---|---|---|
| Console | Development: all levels. Production: errors only. | Pretty, coloured output |
| Sentry | Only when `VITE_SENTRY_DSN` is set | Errors are captured and warnings become breadcrumbs. The SDK is lazy-loaded, and cookies, headers, bodies, query params and user info are **not** collected. |

Add your own, for example a backend log endpoint:

```ts
logger.addTransport({
  name: 'http',
  minLevel: 'error',
  log: (entry) => navigator.sendBeacon('/api/logs', JSON.stringify(entry)),
});
```

### Web Vitals (optional, not wired)

To report Core Web Vitals, add the `web-vitals` package (flag it first: it isn't in the approved list) and log each metric with `logger.info('web-vital', { name, value, rating })` behind a production check.
````

- [ ] **Step 11: Append "Logging and privacy" to `docs/security.md`**

```markdown
## Logging and privacy

- Log user **ids** only, never names, emails or other personal data. `logger.setUser()` accepts an id.
- The logger redacts sensitive keys automatically (docs/error-handling-and-logging.md), but don't log secrets on purpose.
- The Sentry transport turns off Sentry's collection of cookies, headers, request bodies, query parameters and user info.
```

- [ ] **Step 12: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(logger): add redacting logger with console and lazy sentry transports" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4.2: Notifications and `useConfirm()` (spec §7.5)

**Files:**
- Create:
  - `src/core/notify/notify.ts`, `toaster.tsx`, `confirm-context.ts`, `confirm-provider.tsx`, `use-confirm.ts`, `index.ts`
  - tests: `src/core/notify/notify.test.ts`, `toaster.test.tsx`, `confirm-provider.test.tsx`
- Modify: `src/config/constants.ts`, `src/locales/{en,es}/common.json`, `src/app/providers.tsx`, `src/test/render.tsx`, `docs/error-handling-and-logging.md`

**Interfaces:**
- Produces (all from `@/core/notify`):
  - `notify.success|error|info|warning(message: string, options?: NotifyOptions): string | number`. An identical toast fired again within 2 s is ignored, and an identical message updates the visible toast instead of stacking.
  - `notify.promise<T>(promise, { loading, success, error }): Promise<T>` (it returns the same promise)
  - `notify.dismiss(id?)`
  - `<Toaster />`: mount it once
  - `<ConfirmProvider>`
  - `useConfirm(): (options: ConfirmOptions) => Promise<boolean>`, where `ConfirmOptions = { title; description?; confirmLabel?; cancelLabel?; destructive? }`
  - constant `TOAST_DEDUPE_WINDOW_MS = 2000`

- [ ] **Step 1: Install and add the constant**

Run: `pnpm add sonner`

Append to `src/config/constants.ts`:

```ts
/** Identical toasts fired within this window are shown once (e.g. many parallel requests failing). */
export const TOAST_DEDUPE_WINDOW_MS = 2_000;
```

- [ ] **Step 2: Add the translations**

Deep-merge into `src/locales/en/common.json`:

```json
{
  "actions": { "cancel": "Cancel", "confirm": "Confirm" },
  "notifications": { "label": "Notifications" }
}
```

Deep-merge into `src/locales/es/common.json`:

```json
{
  "actions": { "cancel": "Cancelar", "confirm": "Confirmar" },
  "notifications": { "label": "Notificaciones" }
}
```

- [ ] **Step 3: Write the failing tests**

`src/core/notify/notify.test.ts`:

```ts
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { notify } from './notify';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(() => 'toast-id'),
    error: vi.fn(() => 'toast-id'),
    info: vi.fn(() => 'toast-id'),
    warning: vi.fn(() => 'toast-id'),
    promise: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('notify', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows each kind of toast with a stable id derived from its content', () => {
    notify.success('Saved');
    notify.info('Heads up', { description: 'Details' });

    expect(toast.success).toHaveBeenCalledWith('Saved', { id: 'success:Saved' });
    expect(toast.info).toHaveBeenCalledWith('Heads up', { description: 'Details', id: 'info:Heads up' });
  });

  it('ignores an identical toast fired again within the dedupe window', () => {
    notify.error('Network down');
    notify.error('Network down');
    expect(toast.error).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2_000);
    notify.error('Network down');
    expect(toast.error).toHaveBeenCalledTimes(2);
  });

  it('does not dedupe different messages or kinds', () => {
    notify.warning('A');
    notify.warning('B');
    notify.error('A');
    expect(toast.warning).toHaveBeenCalledTimes(2);
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('wraps promises and returns the same promise', async () => {
    const work = Promise.resolve(42);
    const messages = { loading: 'Saving…', success: 'Saved', error: 'Failed' };

    await expect(notify.promise(work, messages)).resolves.toBe(42);
    expect(toast.promise).toHaveBeenCalledWith(work, messages);
  });

  it('dismisses toasts', () => {
    notify.dismiss('toast-id');
    expect(toast.dismiss).toHaveBeenCalledWith('toast-id');
  });
});
```

`src/core/notify/toaster.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { notify } from './notify';
import { Toaster } from './toaster';

describe('Toaster', () => {
  it('renders toasts raised through notify', async () => {
    render(<Toaster />);
    notify.success('Item created');
    expect(await screen.findByText('Item created')).toBeInTheDocument();
  });
});
```

`src/core/notify/confirm-provider.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmProvider } from './confirm-provider';
import { useConfirm } from './use-confirm';

function DeleteButton() {
  const confirm = useConfirm();
  const [result, setResult] = useState('pending');
  return (
    <>
      <button
        type="button"
        onClick={() => {
          void confirm({ title: 'Delete item?', description: 'This cannot be undone.', destructive: true }).then(
            (ok) => {
              setResult(ok ? 'confirmed' : 'cancelled');
            },
          );
        }}
      >
        Delete
      </button>
      <output>{result}</output>
    </>
  );
}

const renderWithProvider = () =>
  render(
    <ConfirmProvider>
      <DeleteButton />
    </ConfirmProvider>,
  );

describe('useConfirm', () => {
  it('resolves true when the user confirms', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alertdialog', { name: 'Delete item?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('confirmed')).toBeInTheDocument();
  });

  it('resolves false when the user cancels or presses Escape', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('cancelled')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await screen.findByRole('alertdialog');
    await user.keyboard('{Escape}');
    expect(await screen.findByText('cancelled')).toBeInTheDocument();
  });

  it('fails loudly outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // React logs the thrown error
    expect(() => render(<DeleteButton />)).toThrow(/ConfirmProvider/);
  });
});
```

Run: `pnpm exec vitest run src/core/notify`
Expected: FAIL, because the modules are missing.

- [ ] **Step 4: Create `src/core/notify/notify.ts`**

```ts
import { type ExternalToast, toast } from 'sonner';

import { TOAST_DEDUPE_WINDOW_MS } from '@/config/constants';

export type NotifyOptions = Pick<ExternalToast, 'action' | 'description' | 'duration' | 'id'>;
type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface NotifyPromiseMessages<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: unknown) => string);
}

const lastShownAt = new Map<string, number>();

function show(kind: ToastKind, message: string, options: NotifyOptions = {}): string | number {
  const key = `${kind}:${message}`;
  const id = options.id ?? key; // same content → same id → Sonner updates the visible toast instead of stacking
  const now = Date.now();
  const last = lastShownAt.get(key);
  if (last !== undefined && now - last < TOAST_DEDUPE_WINDOW_MS) return id;
  lastShownAt.set(key, now);
  return toast[kind](message, { ...options, id });
}

/** App notifications (spec §7.5). Use this instead of importing Sonner (ESLint enforces it). */
export const notify = {
  success: (message: string, options?: NotifyOptions) => show('success', message, options),
  error: (message: string, options?: NotifyOptions) => show('error', message, options),
  info: (message: string, options?: NotifyOptions) => show('info', message, options),
  warning: (message: string, options?: NotifyOptions) => show('warning', message, options),
  /** Shows loading → success/error for a promise and returns the same promise. */
  promise<T>(promise: Promise<T>, messages: NotifyPromiseMessages<T>): Promise<T> {
    toast.promise(promise, messages);
    return promise;
  },
  dismiss(id?: string | number): void {
    toast.dismiss(id);
  },
};
```

- [ ] **Step 5: Create `src/core/notify/toaster.tsx`**

```tsx
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster as Sonner } from 'sonner';

import { useThemeMode } from '@/stores/theme-store';

const TOKEN_STYLE = {
  '--normal-bg': 'var(--popover)',
  '--normal-text': 'var(--popover-foreground)',
  '--normal-border': 'var(--border)',
  '--border-radius': 'var(--radius)',
  zIndex: 'var(--z-toast)',
} as CSSProperties;

/** The single toast outlet (spec §7.5): mounted once in AppProviders and styled with design tokens. */
export function Toaster() {
  const mode = useThemeMode();
  const { t } = useTranslation();

  return (
    <Sonner
      theme={mode}
      className="toaster group"
      containerAriaLabel={t('notifications.label')}
      style={TOKEN_STYLE}
      icons={{
        success: <CircleCheckIcon className="text-success size-4" />,
        info: <InfoIcon className="text-info size-4" />,
        warning: <TriangleAlertIcon className="text-warning size-4" />,
        error: <OctagonXIcon className="text-destructive size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
    />
  );
}
```

If the installed Sonner has no `containerAriaLabel` prop (a TypeScript error), remove that line and record it.

- [ ] **Step 6: Create the confirm files**

`src/core/notify/confirm-context.ts`:

```ts
import { createContext } from 'react';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  destructive?: boolean;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);
```

`src/core/notify/use-confirm.ts`:

```ts
import { useContext } from 'react';

import { ConfirmContext, type ConfirmFn } from './confirm-context';

/** Promise-based "Are you sure?" dialog: `if (await confirm({ title })) …` (spec §7.5). */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used inside <ConfirmProvider> (see src/app/providers.tsx)');
  }
  return confirm;
}
```

`src/core/notify/confirm-provider.tsx`:

```tsx
import { type ReactNode, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';

import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from './confirm-context';

/** Hosts the single confirmation dialog that `useConfirm()` opens. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' });
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    resolverRef.current?.(false); // a newer request cancels any pending one
    setOptions(next);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  return (
    <ConfirmContext value={confirm}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) settle(false);
        }}
      >
        {/* With no description, an explicit aria-describedby={undefined} tells Radix that is intentional. */}
        <AlertDialogContent {...(options.description ? {} : { 'aria-describedby': undefined })}>
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title}</AlertDialogTitle>
            {options.description ? (
              <AlertDialogDescription>{options.description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                settle(false);
              }}
            >
              {options.cancelLabel ?? t('actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className={options.destructive ? buttonVariants({ variant: 'destructive' }) : undefined}
              onClick={() => {
                settle(true);
              }}
            >
              {options.confirmLabel ?? t('actions.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext>
  );
}
```

`src/core/notify/index.ts`:

```ts
export type { ConfirmFn, ConfirmOptions } from './confirm-context';
export { ConfirmProvider } from './confirm-provider';
export { notify, type NotifyOptions, type NotifyPromiseMessages } from './notify';
export { Toaster } from './toaster';
export { useConfirm } from './use-confirm';
```

Run: `pnpm exec vitest run src/core/notify`
Expected: PASS (9 tests).

- [ ] **Step 7: Mount the providers (replace `src/app/providers.tsx`)**

```tsx
import type { ReactNode } from 'react';

import { ConfirmProvider, Toaster } from '@/core/notify';
import { useThemeSync } from '@/stores/theme-store';

function ThemeSync() {
  useThemeSync();
  return null;
}

/** Every app-wide provider, composed in one place (spec §3). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConfirmProvider>
      <ThemeSync />
      {children}
      <Toaster />
    </ConfirmProvider>
  );
}
```

- [ ] **Step 8: Let tests use `useConfirm` (in `src/test/render.tsx`)**

1. Add `import { ConfirmProvider } from '@/core/notify';` in the internal import group.
2. Change the `Providers` body to:

```tsx
return (
  <QueryClientProvider client={queryClient}>
    <ConfirmProvider>{children}</ConfirmProvider>
  </QueryClientProvider>
);
```

- [ ] **Step 9: Append "User feedback: toasts and confirmations" to `docs/error-handling-and-logging.md`**

````markdown
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
````

- [ ] **Step 10: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(notify): add deduplicating toasts and promise-based confirm dialog" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4.3: Root error boundary, React root callbacks and global handlers (spec §7.3)

**Files:**
- Create:
  - `src/core/errors/app-error-boundary.tsx`, `app-error-boundary.test.tsx`
  - `src/core/errors/react-root-error-handlers.ts`, `react-root-error-handlers.test.ts`
  - `src/core/errors/global-handlers.ts`, `global-handlers.test.ts`
- Modify: `src/core/errors/index.ts`, `src/main.tsx`, `src/app/App.tsx`, `docs/error-handling-and-logging.md`

**Interfaces:**
- Consumes: `ErrorBoundary` (Task 3.4), `ErrorState` (Task 3.2), `logger` (Task 4.1).
- Produces (all from `@/core/errors`):
  - `<AppErrorBoundary>`
  - `reactRootErrorHandlers`, passed to `createRoot(container, reactRootErrorHandlers)`
  - `installGlobalErrorHandlers(target?: Window): () => void`

- [ ] **Step 1: Write the failing tests**

`src/core/errors/app-error-boundary.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@/core/logger';

import { AppErrorBoundary } from './app-error-boundary';

function Explodes(): never {
  throw new Error('Render failed');
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('renders children when nothing throws', () => {
    render(
      <AppErrorBoundary>
        <p>App</p>
      </AppErrorBoundary>,
    );
    expect(screen.getByText('App')).toBeInTheDocument();
  });

  it('logs the error with its component stack and offers retry and reload', () => {
    const logError = vi.spyOn(logger, 'error');
    render(
      <AppErrorBoundary>
        <Explodes />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(logError).toHaveBeenCalledWith(
      'Unhandled render error',
      expect.objectContaining({ error: expect.any(Error) as unknown, componentStack: expect.stringContaining('Explodes') as unknown }),
    );
  });
});
```

`src/core/errors/react-root-error-handlers.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { logger } from '@/core/logger';

import { reactRootErrorHandlers } from './react-root-error-handlers';

describe('reactRootErrorHandlers', () => {
  it('forwards uncaught, caught and recoverable React errors to the logger', () => {
    const logError = vi.spyOn(logger, 'error');
    const logWarn = vi.spyOn(logger, 'warn');
    const info = { componentStack: '\n    at Widget' };

    reactRootErrorHandlers.onUncaughtError?.(new Error('a'), info);
    reactRootErrorHandlers.onCaughtError?.(new Error('b'), info);
    reactRootErrorHandlers.onRecoverableError?.(new Error('c'), info);

    expect(logError).toHaveBeenCalledWith('Uncaught React error', expect.objectContaining({ componentStack: info.componentStack }));
    expect(logError).toHaveBeenCalledWith('React error caught by a boundary', expect.anything());
    expect(logWarn).toHaveBeenCalledWith('React recovered from an error', expect.anything());
  });
});
```

`src/core/errors/global-handlers.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { logger } from '@/core/logger';

import { installGlobalErrorHandlers } from './global-handlers';

describe('installGlobalErrorHandlers', () => {
  it('forwards uncaught errors and unhandled rejections to the logger until uninstalled', () => {
    const logError = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const uninstall = installGlobalErrorHandlers();
    const boom = new Error('Boom');

    window.dispatchEvent(new ErrorEvent('error', { error: boom, message: 'Boom', filename: 'app.js', lineno: 1, colno: 2 }));
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: new Error('Nope') }));

    expect(logError).toHaveBeenCalledWith('Boom', expect.objectContaining({ error: boom, source: 'app.js', line: 1 }));
    expect(logError).toHaveBeenCalledWith('Unhandled promise rejection', expect.objectContaining({ error: expect.any(Error) as unknown }));

    uninstall();
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('After'), message: 'After' }));
    expect(logError).toHaveBeenCalledTimes(2);
  });
});
```

Run: `pnpm exec vitest run src/core/errors`
Expected: FAIL, because the modules are missing.

- [ ] **Step 2: Create `src/core/errors/app-error-boundary.tsx`**

```tsx
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

// Deep import on purpose: the feedback index re-exports AsyncBoundary, which imports @/core/errors (cycle).
import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';
import { logger } from '@/core/logger';

import { ErrorBoundary, type ErrorBoundaryFallbackProps } from './error-boundary';

function RootErrorFallback({ error, reset }: ErrorBoundaryFallbackProps) {
  const { t } = useTranslation();

  return (
    <main className="bg-background flex min-h-svh items-center justify-center p-6">
      <div className="grid w-full max-w-xl justify-items-center gap-2">
        <ErrorState error={error} onRetry={reset} className="w-full" />
        <Button
          variant="link"
          onClick={() => {
            window.location.reload();
          }}
        >
          {t('actions.reload')}
        </Button>
      </div>
    </main>
  );
}

/** App-root boundary (spec §7.3): logs render errors with their component stack and offers retry or reload. */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={(props) => <RootErrorFallback {...props} />}
      onError={(error, info) => {
        logger.error('Unhandled render error', { error, componentStack: info.componentStack });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

- [ ] **Step 3: Create `src/core/errors/react-root-error-handlers.ts`**

```ts
import type { RootOptions } from 'react-dom/client';

import { logger } from '@/core/logger';

/**
 * React 19 root error callbacks, passed to createRoot().
 * They cover boundaries we don't own (e.g. the router's). The logger drops duplicate reports of the same error.
 */
export const reactRootErrorHandlers: Pick<
  RootOptions,
  'onCaughtError' | 'onRecoverableError' | 'onUncaughtError'
> = {
  onUncaughtError: (error, info) => {
    logger.error('Uncaught React error', { error, componentStack: info.componentStack });
  },
  onCaughtError: (error, info) => {
    logger.error('React error caught by a boundary', { error, componentStack: info.componentStack });
  },
  onRecoverableError: (error, info) => {
    logger.warn('React recovered from an error', { error, componentStack: info.componentStack });
  },
};
```

- [ ] **Step 4: Create `src/core/errors/global-handlers.ts`**

```ts
import { logger } from '@/core/logger';

/**
 * Forwards errors that escape React (event handlers, timers, promises) to the logger (spec §7.3).
 * Returns a function that removes the listeners.
 */
export function installGlobalErrorHandlers(target: Window = window): () => void {
  const onError = (event: ErrorEvent) => {
    logger.error(event.message || 'Uncaught error', {
      error: event.error ?? event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    logger.error('Unhandled promise rejection', { error: event.reason });
  };

  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection);
  return () => {
    target.removeEventListener('error', onError);
    target.removeEventListener('unhandledrejection', onRejection);
  };
}
```

- [ ] **Step 5: Export them (replace `src/core/errors/index.ts`)**

```ts
export { AppErrorBoundary } from './app-error-boundary';
export {
  ErrorBoundary,
  type ErrorBoundaryFallbackProps,
  type ErrorBoundaryProps,
} from './error-boundary';
export { installGlobalErrorHandlers } from './global-handlers';
export { reactRootErrorHandlers } from './react-root-error-handlers';
```

Run: `pnpm exec vitest run src/core/errors`
Expected: PASS.

- [ ] **Step 6: Wire them into the entry point (replace `src/main.tsx`)**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles/globals.css';
import '@/core/i18n';
import { App } from '@/app/App';
import { ConfigErrorScreen } from '@/app/config-error-screen';
import { envIssues } from '@/config/env';
import { installGlobalErrorHandlers, reactRootErrorHandlers } from '@/core/errors';

installGlobalErrorHandlers();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container, reactRootErrorHandlers).render(
  <StrictMode>
    {envIssues.length > 0 ? <ConfigErrorScreen issues={envIssues} /> : <App />}
  </StrictMode>,
);
```

- [ ] **Step 7: Put the root boundary outermost (replace `src/app/App.tsx`)**

```tsx
import { AppErrorBoundary } from '@/core/errors';

import { AppProviders } from './providers';

export function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <main id="main-content" />
      </AppProviders>
    </AppErrorBoundary>
  );
}
```

- [ ] **Step 8: Append "Error flow" to `docs/error-handling-and-logging.md`**

```markdown
## Error flow

| Where the error happens | Who catches it | What the user sees | Logged by |
|---|---|---|---|
| Rendering inside a route | The route's `errorElement` (Phase 7) | Route error page, with the app shell still usable | root `onCaughtError` |
| Rendering in a suspense subtree | `AsyncBoundary` | `ErrorState` with **Try again** (resets failed queries) | root `onCaughtError` |
| Rendering anywhere else | `AppErrorBoundary` (outermost, in `App.tsx`) | Full-page `ErrorState` with **Try again** and **Reload page** | the boundary's `onError` |
| Event handlers, timers, promises | `installGlobalErrorHandlers()` (`main.tsx`) | Nothing; the flow continues | `window` `error` / `unhandledrejection` listeners |
| API calls | the HTTP interceptors → `AppError` (Phase 5) | `QueryState` / toasts | query and mutation caches |

**Fail loudly in dev, gracefully in prod** (spec Principle 7): in development, `ErrorState` shows the stack and the error's properties under **Technical details**. In production it shows only the translated, friendly message.
```

- [ ] **Step 9: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(errors): add root error boundary, react root callbacks and global handlers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Phase 4 gate

- [ ] Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Expected: all green.
- [ ] Manual check:
  1. In `src/app/App.tsx`, temporarily render `<Explodes />` (from the test) inside `AppProviders`.
  2. Run `pnpm dev` and confirm the full-page error with **Technical details** appears, and the console shows one styled `[error] Unhandled render error` entry.
  3. Revert the change.
- [ ] Post the **Phase 4 report**. State that the storage wrappers (a Phase 4 item) were delivered in Task 2.1. Then **STOP** until the owner approves.

---

# Phase 5 — Data layer

Scope (spec §12, §6): `AppError`, the MSW setup, the Axios instance and interceptors, the query client, and the Zustand stores.

The tasks are ordered so that each one's tests can use the previous task: errors → MSW → HTTP → query client → stores.

### Task 5.1: `AppError`, error normalisation and server-error mapping (spec §6.1, §7.7)

**Files:**
- Create:
  - `src/core/api/errors.ts`, `src/core/api/errors.test.ts`
  - `src/core/api/form-errors.ts`, `src/core/api/form-errors.test.ts`
  - `src/core/api/index.ts`
  - `src/core/i18n/translate-key.ts`, `src/core/i18n/translate-key.test.ts`
- Modify:
  - `src/core/i18n/index.ts`
  - `src/locales/{en,es}/errors.json`
  - `src/components/feedback/error-state.tsx`, `error-state.test.tsx`

**Interfaces:**
- Produces (from `@/core/api`):
  - `class AppError extends Error { code: string; status: number; details?: Record<string, unknown>; requestId?: string; userMessage?: string }`. `status` is `0` when there was no response.
  - `ERROR_CODES`, `type KnownErrorCode`
  - `isAppError(value): value is AppError`
  - `toAppError(error: unknown): AppError`, which normalises Axios errors, cancellation, timeouts and network failures
  - `getErrorMessage(error: unknown): string`, a translated, user-friendly message
  - `getFieldErrors(error): Record<string, string>`
  - `applyServerErrors(form, error): boolean`, which sets RHF field errors and returns whether any field errors were applied
- Produces (from `@/core/i18n`): `translateKey(key: string, options?): string | undefined`, for runtime-built keys only

**Assumed backend contract** (decision 2; adapt only in `errors.ts`):
- The body is `{ code?: string, message?: string, details?: object }`.
- Validation errors carry `details.fields: { [field]: string | string[] }`.
- A response header `x-request-id` is echoed back when the server supports it.

- [ ] **Step 1: Install**

Run: `pnpm add axios`

- [ ] **Step 2: Add the error-code messages**

Deep-merge into `src/locales/en/errors.json`:

```json
{
  "codes": {
    "NETWORK_ERROR": "You appear to be offline. Check your connection and try again.",
    "TIMEOUT": "The server took too long to respond. Please try again.",
    "CANCELLED": "The request was cancelled.",
    "UNAUTHORIZED": "Your session has expired. Please sign in again.",
    "FORBIDDEN": "You don't have permission to do that.",
    "NOT_FOUND": "We couldn't find what you were looking for.",
    "VALIDATION_ERROR": "Some fields need your attention.",
    "CONFLICT": "This was changed elsewhere. Refresh and try again.",
    "RATE_LIMITED": "Too many requests. Please wait a moment and try again.",
    "SERVER_ERROR": "The server ran into a problem. Please try again later.",
    "UNKNOWN": "Something went wrong. Please try again."
  }
}
```

Deep-merge into `src/locales/es/errors.json`:

```json
{
  "codes": {
    "NETWORK_ERROR": "Parece que no tienes conexión. Compruébala e inténtalo de nuevo.",
    "TIMEOUT": "El servidor tardó demasiado en responder. Inténtalo de nuevo.",
    "CANCELLED": "La solicitud se canceló.",
    "UNAUTHORIZED": "Tu sesión ha caducado. Vuelve a iniciar sesión.",
    "FORBIDDEN": "No tienes permiso para hacer eso.",
    "NOT_FOUND": "No encontramos lo que buscabas.",
    "VALIDATION_ERROR": "Algunos campos necesitan tu atención.",
    "CONFLICT": "Esto se modificó en otro lugar. Actualiza e inténtalo de nuevo.",
    "RATE_LIMITED": "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
    "SERVER_ERROR": "El servidor tuvo un problema. Inténtalo más tarde.",
    "UNKNOWN": "Algo salió mal. Inténtalo de nuevo."
  }
}
```

- [ ] **Step 3: Write the failing tests**

`src/core/i18n/translate-key.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { i18n } from './i18n';
import { translateKey } from './translate-key';

describe('translateKey', () => {
  it('translates keys that exist and returns undefined for keys that do not', async () => {
    expect(translateKey('errors:codes.NOT_FOUND')).toBe("We couldn't find what you were looking for.");
    expect(translateKey('errors:codes.NOT_A_CODE')).toBeUndefined();

    await i18n.changeLanguage('es');
    expect(translateKey('errors:codes.NOT_FOUND')).toBe('No encontramos lo que buscabas.');
  });
});
```

`src/core/api/errors.test.ts`:

```ts
import { AxiosError, AxiosHeaders, CanceledError, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';

import { i18n } from '@/core/i18n';

import { AppError, getErrorMessage, getFieldErrors, isAppError, toAppError } from './errors';

const config = (): InternalAxiosRequestConfig => ({
  headers: new AxiosHeaders({ 'X-Request-Id': 'req-1' }),
});

function responseError(status: number, data: unknown) {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config(), undefined, {
    status,
    statusText: '',
    data,
    headers: {},
    config: config(),
  });
}

describe('toAppError', () => {
  it('keeps AppErrors as they are', () => {
    const error = new AppError({ code: 'X', message: 'x', status: 400 });
    expect(toAppError(error)).toBe(error);
  });

  it('reads the backend error body', () => {
    const error = toAppError(
      responseError(422, { code: 'VALIDATION_ERROR', message: 'Check the form', details: { fields: { name: 'Taken' } } }),
    );
    expect(error).toMatchObject({
      name: 'AppError',
      code: 'VALIDATION_ERROR',
      status: 422,
      userMessage: 'Check the form',
      details: { fields: { name: 'Taken' } },
      requestId: 'req-1',
    });
  });

  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [400, 'VALIDATION_ERROR'],
    [429, 'RATE_LIMITED'],
    [503, 'SERVER_ERROR'],
    [418, 'UNKNOWN'],
  ])('derives a code from status %i when the body has none', (status, code) => {
    expect(toAppError(responseError(status, 'Oops')).code).toBe(code);
  });

  it('recognises network errors, timeouts and cancellation', () => {
    expect(toAppError(new AxiosError('Network Error', 'ERR_NETWORK', config())).code).toBe('NETWORK_ERROR');
    expect(toAppError(new AxiosError('timeout', 'ETIMEDOUT', config())).code).toBe('TIMEOUT');
    expect(toAppError(new CanceledError()).code).toBe('CANCELLED');
  });

  it('wraps anything else as UNKNOWN', () => {
    expect(toAppError(new Error('Parse failed'))).toMatchObject({ code: 'UNKNOWN', status: 0 });
    expect(isAppError(toAppError('weird'))).toBe(true);
  });
});

describe('getErrorMessage', () => {
  it('translates known codes', async () => {
    expect(getErrorMessage(responseError(403, {}))).toBe("You don't have permission to do that.");
    await i18n.changeLanguage('es');
    expect(getErrorMessage(responseError(403, {}))).toBe('No tienes permiso para hacer eso.');
  });

  it('prefers a translation for backend-specific codes, then the server message for 4xx', () => {
    expect(getErrorMessage(responseError(409, { code: 'ITEM_LOCKED', message: 'Item is locked' }))).toBe('Item is locked');
  });

  it('never shows raw server messages for 5xx', () => {
    expect(getErrorMessage(responseError(500, { code: 'DB_DOWN', message: 'pg: connection refused' }))).toBe(
      'The server ran into a problem. Please try again later.',
    );
  });
});

describe('getFieldErrors', () => {
  it('flattens details.fields, taking the first message of arrays', () => {
    const error = toAppError(responseError(422, { details: { fields: { name: ['Taken', 'Too short'], email: 'Invalid', age: 3 } } }));
    expect(getFieldErrors(error)).toEqual({ name: 'Taken', email: 'Invalid' });
    expect(getFieldErrors(new Error('x'))).toEqual({});
  });
});
```

`src/core/api/form-errors.test.ts`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { AppError } from './errors';
import { applyServerErrors } from './form-errors';

describe('applyServerErrors', () => {
  it('maps server field errors onto the form and reports whether any applied', () => {
    const { result } = renderHook(() => useForm<{ name: string; email: string }>());
    const error = new AppError({
      code: 'VALIDATION_ERROR',
      message: 'Invalid',
      status: 422,
      details: { fields: { name: 'Already taken' } },
    });

    let applied = false;
    act(() => {
      applied = applyServerErrors(result.current, error);
    });

    expect(applied).toBe(true);
    expect(result.current.getFieldState('name').error).toMatchObject({ type: 'server', message: 'Already taken' });
    expect(applyServerErrors(result.current, new Error('boom'))).toBe(false);
  });
});
```

Run: `pnpm exec vitest run src/core/api src/core/i18n/translate-key.test.ts`
Expected: FAIL, because the modules are missing.

- [ ] **Step 4: Create `src/core/i18n/translate-key.ts`**

Then add `export { translateKey } from './translate-key';` to `src/core/i18n/index.ts`.

```ts
import { i18n } from './i18n';

type UntypedT = (key: string, options?: Record<string, unknown>) => string;

/**
 * Translates a key built at runtime (e.g. `errors:codes.${code}` from a backend), or returns
 * undefined when no translation exists. Use typed `t('…')` for every key you write in code.
 */
export function translateKey(key: string, options?: Record<string, unknown>): string | undefined {
  if (!i18n.exists(key, options)) return undefined;
  const t = i18n.t.bind(i18n) as unknown as UntypedT;
  return t(key, options);
}
```

- [ ] **Step 5: Create `src/core/api/errors.ts`**

```ts
import { type AxiosError, isAxiosError, isCancel } from 'axios';
import { z } from 'zod';

import { i18n, translateKey } from '@/core/i18n';

export const ERROR_CODES = [
  'NETWORK_ERROR',
  'TIMEOUT',
  'CANCELLED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'CONFLICT',
  'RATE_LIMITED',
  'SERVER_ERROR',
  'UNKNOWN',
] as const;
export type KnownErrorCode = (typeof ERROR_CODES)[number];

export interface AppErrorInit {
  code: string;
  /** Technical message, for logs. Show users `getErrorMessage(error)` instead. */
  message: string;
  /** HTTP status, or 0 when there was no response (network error, timeout, cancellation). */
  status: number;
  details?: Record<string, unknown>;
  requestId?: string;
  /** A message from the server, assumed user-facing and localised via Accept-Language. */
  userMessage?: string;
  cause?: unknown;
}

/** The single error type every API failure is normalised into (spec §6.1). */
export class AppError extends Error {
  override readonly name = 'AppError';
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;
  readonly userMessage?: string;

  constructor({ code, message, status, details, requestId, userMessage, cause }: AppErrorInit) {
    super(message, { cause });
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
    this.userMessage = userMessage;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/** Assumed backend error body (owner decision 2). Adapt HERE if your backend differs. */
const errorBodySchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

function codeForStatus(status: number): KnownErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 400 || status === 422) return 'VALIDATION_ERROR';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN';
}

const asString = (value: unknown) => (typeof value === 'string' && value !== '' ? value : undefined);

function requestIdOf(error: AxiosError): string | undefined {
  return (
    asString(error.response?.headers['x-request-id']) ??
    asString(error.config?.headers.get('X-Request-Id'))
  );
}

/** Normalises anything thrown by an API call into an AppError. */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  if (isCancel(error)) {
    return new AppError({ code: 'CANCELLED', message: 'Request cancelled', status: 0, cause: error });
  }
  if (isAxiosError(error)) {
    const requestId = requestIdOf(error);
    if (!error.response) {
      const code = error.code === 'ETIMEDOUT' ? 'TIMEOUT' : error.code === 'ECONNABORTED' ? 'CANCELLED' : 'NETWORK_ERROR';
      return new AppError({ code, message: error.message, status: 0, requestId, cause: error });
    }
    const { status, data } = error.response;
    const parsed = errorBodySchema.safeParse(data);
    const body = parsed.success ? parsed.data : {};
    return new AppError({
      code: body.code ?? codeForStatus(status),
      message: body.message ?? error.message,
      status,
      details: body.details,
      requestId,
      userMessage: body.message,
      cause: error,
    });
  }
  const message = error instanceof Error ? error.message : String(error);
  return new AppError({ code: 'UNKNOWN', message, status: 0, cause: error });
}

/**
 * A translated, user-friendly message for any error (spec §6.1):
 * 1. a translation for the error code (`errors:codes.<CODE>`; add keys for backend-specific codes),
 * 2. otherwise the server's own message for 4xx responses,
 * 3. otherwise a generic translated message. 5xx server messages are never shown.
 */
export function getErrorMessage(error: unknown): string {
  const appError = toAppError(error);
  const forCode = translateKey(`errors:codes.${appError.code}`);
  if (forCode) return forCode;
  const isClientError = appError.status >= 400 && appError.status < 500;
  if (isClientError && appError.userMessage) return appError.userMessage;
  return i18n.t(appError.status >= 500 ? 'errors:codes.SERVER_ERROR' : 'errors:codes.UNKNOWN');
}

/** Field-level validation messages, from `details.fields` (adapt here for other backend shapes). */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!isAppError(error)) return {};
  const fields = error.details?.fields;
  if (typeof fields !== 'object' || fields === null) return {};
  return Object.fromEntries(
    Object.entries(fields).flatMap(([name, value]: [string, unknown]) => {
      const message: unknown = Array.isArray(value) ? value[0] : value;
      return typeof message === 'string' && message !== '' ? [[name, message] as const] : [];
    }),
  );
}
```

- [ ] **Step 6: Create `src/core/api/form-errors.ts`**

```ts
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';

import { translateKey } from '@/core/i18n';

import { getFieldErrors } from './errors';

/**
 * Maps server-side validation errors onto form fields (spec §7.7) and focuses the first one.
 * A field message that is a known key under `validation:server.*` (e.g. "ALREADY_EXISTS") is translated;
 * anything else is shown as sent. Returns false when the error carried no field errors,
 * so the caller can fall back to a toast.
 */
export function applyServerErrors<TValues extends FieldValues>(
  form: Pick<UseFormReturn<TValues>, 'setError'>,
  error: unknown,
): boolean {
  const entries = Object.entries(getFieldErrors(error));
  entries.forEach(([name, message], index) => {
    form.setError(
      name as Path<TValues>,
      { type: 'server', message: translateKey(`validation:server.${message}`) ?? message },
      { shouldFocus: index === 0 },
    );
  });
  return entries.length > 0;
}
```

- [ ] **Step 7: Create `src/core/api/index.ts`**

Tasks 5.3 and 5.4 extend it.

```ts
export {
  AppError,
  ERROR_CODES,
  getErrorMessage,
  getFieldErrors,
  isAppError,
  toAppError,
  type AppErrorInit,
  type KnownErrorCode,
} from './errors';
export { applyServerErrors } from './form-errors';
```

Run: `pnpm exec vitest run src/core/api src/core/i18n`
Expected: PASS.

- [ ] **Step 8: Show errors in plain language in `ErrorState`**

In `src/components/feedback/error-state.tsx`:
1. Add `import { getErrorMessage } from '@/core/api';` to the internal imports.
2. Replace `{description ?? t('errors:generic.description')}` with:

```tsx
{description ?? (error === undefined ? t('errors:generic.description') : getErrorMessage(error))}
```

Then add this case to `src/components/feedback/error-state.test.tsx`, adding `import { AppError } from '@/core/api';` alongside the other internal imports:

```tsx
it('explains API errors in plain language', () => {
  render(<ErrorState error={new AppError({ code: 'NOT_FOUND', message: 'GET /items/9 404', status: 404 })} />);
  expect(screen.getByRole('alert')).toHaveTextContent("We couldn't find what you were looking for.");
});
```

- [ ] **Step 9: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(api): add AppError normalisation, translated messages and server error mapping" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5.2: Mock Service Worker for development, the Docker demo and tests

**Files:**
- Create:
  - `public/mockServiceWorker.js` (generated)
  - `src/mocks/api-url.ts`, `src/mocks/api-url.test.ts`, `src/mocks/handlers.ts`, `src/mocks/server.ts`, `src/mocks/browser.ts`
- Modify: `package.json` (gets the `msw.workerDirectory` key), `src/test/setup.ts`, `src/main.tsx`, `docs/testing.md`

**Interfaces:**
- Produces:
  - `apiUrl(path: string): string`, the absolute URL the shared client will call (`/items` → `http://localhost:3000/api/items` in tests)
  - `handlers: HttpHandler[]`, the registry every feature appends to. The `// plop:handlers` anchor is used by generators.
  - `server` (msw/node), started for every test with `onUnhandledFrame: 'error'`
  - `startMockWorker()` (msw/browser)
  - `main.tsx` starts the worker before the first render when `env.VITE_ENABLE_MOCKS` is true. MSW code is a lazy chunk, so it ships in every build and one image can switch it on or off at runtime.

- [ ] **Step 1: Install and generate the worker**

```bash
pnpm add -D msw
pnpm exec msw init public --save
```

Expected: `public/mockServiceWorker.js` exists and `package.json` contains `"msw": { "workerDirectory": ["public"] }`.

- [ ] **Step 2: Write the failing test `src/mocks/api-url.test.ts`**

```ts
import { describe, expect, it } from 'vitest';

import { apiUrl } from './api-url';

describe('apiUrl', () => {
  it('resolves API paths against VITE_API_BASE_URL and the page origin', () => {
    expect(apiUrl('/items')).toBe('http://localhost:3000/api/items');
    expect(apiUrl('items/:id')).toBe('http://localhost:3000/api/items/:id');
  });
});
```

Run: `pnpm exec vitest run src/mocks`
Expected: FAIL, because `./api-url` is missing.

- [ ] **Step 3: Create the mock modules**

`src/mocks/api-url.ts`:

```ts
import { env } from '@/config/env';

/** The absolute URL the shared HTTP client calls for `path`, so handlers match whatever the base URL is. */
export function apiUrl(path: string): string {
  const base = env.VITE_API_BASE_URL.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return new URL(`${base}${suffix}`, window.location.origin).toString();
}
```

`src/mocks/handlers.ts`:

```ts
import type { HttpHandler } from 'msw';

/**
 * Every mock API handler, shared by the browser worker (dev and the Docker demo) and the test server.
 * Features append theirs here; `pnpm gen feature` does it automatically.
 */
export const handlers: HttpHandler[] = [
  // plop:handlers
];
```

`src/mocks/server.ts`:

```ts
import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/** The MSW server for Vitest (started in src/test/setup.ts). Override per test with `server.use(...)`. */
export const server = setupServer(...handlers);
```

`src/mocks/browser.ts`:

```ts
import { setupWorker } from 'msw/browser';

import { env } from '@/config/env';

import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

/** Starts the in-browser mock API (VITE_ENABLE_MOCKS=true). Requests without a handler go to the network. */
export async function startMockWorker(): Promise<void> {
  await worker.start({
    onUnhandledFrame: 'bypass',
    quiet: !env.isDev,
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
}
```

Run: `pnpm exec vitest run src/mocks`
Expected: PASS.

- [ ] **Step 4: Run the mock server for every test (replace `src/test/setup.ts`)**

```ts
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { i18n } from '@/core/i18n';
import { server } from '@/mocks/server';

// jsdom gaps that Radix primitives and the theme code rely on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'ResizeObserver', {
  configurable: true,
  writable: true,
  value: ResizeObserverStub,
});
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }),
});
for (const method of [
  'hasPointerCapture',
  'setPointerCapture',
  'releasePointerCapture',
  'scrollIntoView',
] as const) {
  Object.defineProperty(Element.prototype, method, {
    configurable: true,
    writable: true,
    value: () => false,
  });
}

// Every request in a test must be mocked: an unhandled one fails the test.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(async () => {
  // Vitest globals are off, so Testing Library's auto-cleanup is not registered: do it here.
  cleanup();
  server.resetHandlers();
  window.localStorage.clear();
  window.sessionStorage.clear();
  if (i18n.language !== 'en') await i18n.changeLanguage('en');
});

afterAll(() => {
  server.close();
});
```

- [ ] **Step 5: Start the worker before the first render (replace `src/main.tsx`)**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles/globals.css';
import '@/core/i18n';
import { App } from '@/app/App';
import { ConfigErrorScreen } from '@/app/config-error-screen';
import { env, envIssues } from '@/config/env';
import { installGlobalErrorHandlers, reactRootErrorHandlers } from '@/core/errors';
import { logger } from '@/core/logger';

installGlobalErrorHandlers();

/** Starts Mock Service Worker when VITE_ENABLE_MOCKS is on (the default), before any request is made. */
async function enableMocking(): Promise<void> {
  if (!env.VITE_ENABLE_MOCKS) return;
  if (env.VITE_APP_ENV === 'production') {
    logger.warn('The mock API is enabled in production. Set VITE_ENABLE_MOCKS=false for real deployments.');
  }
  try {
    const { startMockWorker } = await import('@/mocks/browser');
    await startMockWorker();
  } catch (error) {
    // e.g. service workers are unavailable over plain http on a non-localhost address
    logger.error('Mock Service Worker failed to start; API calls will go to the network', { error });
  }
}

await enableMocking();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container, reactRootErrorHandlers).render(
  <StrictMode>
    {envIssues.length > 0 ? <ConfigErrorScreen issues={envIssues} /> : <App />}
  </StrictMode>,
);
```

- [ ] **Step 6: Append "Mocking the API with MSW" to `docs/testing.md`**

````markdown
## Mocking the API with MSW

The same handlers (`src/mocks/handlers.ts`) power three things:

| Where | How |
|---|---|
| `pnpm dev`, and the Docker demo when `VITE_ENABLE_MOCKS=true` | `src/mocks/browser.ts` (service worker, started in `main.tsx`) |
| Vitest | `src/mocks/server.ts`, started in `src/test/setup.ts`. **Any unmocked request fails the test.** |
| Playwright E2E | the preview build runs with mocks on |

Override a handler for one test (it is reset after each test):

```ts
import { http, HttpResponse } from 'msw';
import { apiUrl } from '@/mocks/api-url';
import { server } from '@/mocks/server';

server.use(http.get(apiUrl('/items'), () => HttpResponse.json({ code: 'SERVER_ERROR' }, { status: 500 })));
```

Always build handler URLs with `apiUrl()`: it resolves paths the same way the shared HTTP client does, whatever `VITE_API_BASE_URL` is. After upgrading `msw`, run `pnpm exec msw init public` to refresh `public/mockServiceWorker.js`.
````

- [ ] **Step 7: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all green, and `dist/mockServiceWorker.js` exists.

```bash
git add -A
git commit -m "feat(mocks): add msw worker and test server" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5.3: Shared Axios instance and interceptors (spec §6.1)

**Files:**
- Create:
  - `src/lib/id.ts`, `src/lib/id.test.ts`
  - `src/core/api/axios-config.d.ts`, `auth-bridge.ts`, `interceptors.ts`, `http.ts`, `http.test.ts`
- Modify: `src/config/constants.ts`, `src/core/api/index.ts`, `docs/data-fetching.md`

**Interfaces:**
- Produces:
  - `createRequestId(): string` (UUID v4, which also works outside secure contexts)
  - `http`, the single Axios instance (from `@/core/api`)
  - **Request interceptor:**
    - sets `Accept-Language` from `i18n.language`
    - sets `X-Request-Id`
    - applies `HttpAuthAdapter.prepareRequest`
    - logs at debug level
  - **Response interceptor:**
    - normalises every failure to `AppError`
    - on 401, runs one shared refresh and retries (or calls `onSessionExpired`)
    - toasts on 403, network errors and timeouts (unless `silent`)
    - logs failures together with the request id
  - `registerHttpAuth(adapter: HttpAuthAdapter): () => void`, where `HttpAuthAdapter = { prepareRequest(config); refresh(): Promise<void>; onSessionExpired(): void }`. The auth layer (Phase 7) registers it, which avoids an import cycle.
  - per-request flags `skipAuthRefresh?: boolean` and `silent?: boolean` (`_retried` is internal)
  - constant `HTTP_TIMEOUT_MS = 30_000`

- [ ] **Step 1: Add the constant (in `src/config/constants.ts`)**

```ts
/** Default timeout for API requests. */
export const HTTP_TIMEOUT_MS = 30_000;
```

- [ ] **Step 2: Write the failing tests**

`src/lib/id.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createRequestId } from './id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('createRequestId', () => {
  it('creates unique RFC 4122 v4 ids', () => {
    const id = createRequestId();
    expect(id).toMatch(UUID_V4);
    expect(createRequestId()).not.toBe(id);
  });

  it('falls back to getRandomValues where randomUUID is unavailable (plain http)', () => {
    Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined });
    try {
      expect(createRequestId()).toMatch(UUID_V4);
    } finally {
      Reflect.deleteProperty(crypto, 'randomUUID');
    }
  });
});
```

`src/core/api/http.test.ts`:

```ts
import { delay, http as mock, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { notify } from '@/core/notify';
import { apiUrl } from '@/mocks/api-url';
import { server } from '@/mocks/server';

import { registerHttpAuth } from './auth-bridge';
import { http } from './http';

const UUID = /^[0-9a-f-]{36}$/;

describe('http', () => {
  it('sends Accept-Language and a request id', async () => {
    let seen: Headers | undefined;
    server.use(
      mock.get(apiUrl('/echo'), ({ request }) => {
        seen = request.headers;
        return HttpResponse.json({ ok: true });
      }),
    );

    await http.get('/echo');

    expect(seen?.get('accept-language')).toBe('en');
    expect(seen?.get('x-request-id')).toMatch(UUID);
  });

  it('rejects with a normalised AppError', async () => {
    server.use(
      mock.get(apiUrl('/missing'), () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'No such item' }, { status: 404 }),
      ),
    );

    await expect(http.get('/missing')).rejects.toMatchObject({
      name: 'AppError',
      code: 'NOT_FOUND',
      status: 404,
      userMessage: 'No such item',
      requestId: expect.stringMatching(UUID) as unknown,
    });
  });

  it('toasts connectivity problems once, unless the request is silent', async () => {
    const toast = vi.spyOn(notify, 'error');
    server.use(mock.get(apiUrl('/offline'), () => HttpResponse.error()));

    await expect(http.get('/offline')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
    await expect(http.get('/offline', { silent: true })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith('You appear to be offline. Check your connection and try again.');
  });

  it('toasts a permission error on 403', async () => {
    const toast = vi.spyOn(notify, 'error');
    server.use(mock.get(apiUrl('/admin'), () => new HttpResponse(null, { status: 403 })));

    await expect(http.get('/admin')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(toast).toHaveBeenCalledWith("You don't have permission to do that.");
  });

  it('refreshes once for concurrent 401s, then retries every request', async () => {
    let authorised = false;
    server.use(
      mock.get(apiUrl('/secure'), () =>
        authorised ? HttpResponse.json({ ok: true }) : new HttpResponse(null, { status: 401 }),
      ),
    );
    const refresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            authorised = true;
            resolve();
          }, 20);
        }),
    );
    const unregister = registerHttpAuth({ prepareRequest: (config) => config, refresh, onSessionExpired: vi.fn() });

    try {
      const responses = await Promise.all([http.get('/secure'), http.get('/secure'), http.get('/secure')]);
      expect(responses.map((response) => response.data as unknown)).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
      expect(refresh).toHaveBeenCalledTimes(1);
    } finally {
      unregister();
    }
  });

  it('expires the session when the refresh fails', async () => {
    const onSessionExpired = vi.fn();
    server.use(mock.get(apiUrl('/secure'), () => new HttpResponse(null, { status: 401 })));
    const unregister = registerHttpAuth({
      prepareRequest: (config) => config,
      refresh: () => Promise.reject(new Error('refresh token expired')),
      onSessionExpired,
    });

    try {
      await expect(http.get('/secure')).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
      expect(onSessionExpired).toHaveBeenCalledTimes(1);
    } finally {
      unregister();
    }
  });

  it('never refreshes for requests marked skipAuthRefresh', async () => {
    const refresh = vi.fn(() => Promise.resolve());
    server.use(mock.post(apiUrl('/auth/login'), () => new HttpResponse(null, { status: 401 })));
    const unregister = registerHttpAuth({ prepareRequest: (config) => config, refresh, onSessionExpired: vi.fn() });

    try {
      await expect(http.post('/auth/login', {}, { skipAuthRefresh: true })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
      expect(refresh).not.toHaveBeenCalled();
    } finally {
      unregister();
    }
  });

  it('lets the auth adapter prepare every request', async () => {
    let seen: string | null = null;
    server.use(
      mock.get(apiUrl('/whoami'), ({ request }) => {
        seen = request.headers.get('x-demo-auth');
        return HttpResponse.json({});
      }),
    );
    const unregister = registerHttpAuth({
      prepareRequest: (config) => {
        config.headers.set('X-Demo-Auth', 'yes');
        return config;
      },
      refresh: () => Promise.resolve(),
      onSessionExpired: vi.fn(),
    });

    try {
      await http.get('/whoami');
      expect(seen).toBe('yes');
    } finally {
      unregister();
    }
  });

  it('supports cancellation through AbortSignal', async () => {
    server.use(
      mock.get(apiUrl('/slow'), async () => {
        await delay(1_000);
        return HttpResponse.json({});
      }),
    );
    const controller = new AbortController();

    const request = http.get('/slow', { signal: controller.signal });
    controller.abort();

    await expect(request).rejects.toMatchObject({ code: 'CANCELLED' });
  });
});
```

Run: `pnpm exec vitest run src/lib/id.test.ts src/core/api/http.test.ts`
Expected: FAIL, because the modules are missing.

- [ ] **Step 3: Create `src/lib/id.ts`**

```ts
/**
 * RFC 4122 version-4 id for request tracing.
 * `crypto.randomUUID` only exists in secure contexts (https or localhost); `getRandomValues` exists everywhere.
 */
export function createRequestId(): string {
  const randomUUID = (crypto as Partial<Crypto>).randomUUID;
  if (randomUUID) return randomUUID.call(crypto);

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // version 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
```

- [ ] **Step 4: Create `src/core/api/axios-config.d.ts`**

```ts
import type {} from 'axios';

declare module 'axios' {
  // Both generics must match axios' own declaration (axios >= 1.19). If ESLint also reports
  // no-unused-vars on D/P here, add it to this directive; an unused directive is itself a lint warning.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface AxiosRequestConfig<D = any, P = any> {
    /** Skip the 401 → refresh → retry flow (login, logout and the refresh call itself). */
    skipAuthRefresh?: boolean;
    /** Don't show the global 403 / offline / timeout toasts for this request. */
    silent?: boolean;
    /** Internal: marks the single retry after a successful refresh. */
    _retried?: boolean;
  }
}
```

- [ ] **Step 5: Create `src/core/api/auth-bridge.ts`**

```ts
import type { InternalAxiosRequestConfig } from 'axios';

/**
 * How the HTTP layer talks to the auth layer without importing it (core/auth imports core/api).
 * The active AuthStrategy registers an adapter when the AuthProvider mounts (Phase 7).
 */
export interface HttpAuthAdapter {
  /** Adds credentials to an outgoing request (cookie strategy: `withCredentials`; token strategy: a header). */
  prepareRequest: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
  /** Renews the session; rejects when it cannot be renewed. */
  refresh: () => Promise<void>;
  /** Called when a request is still unauthorised after refreshing, or refreshing failed. */
  onSessionExpired: () => void;
}

let adapter: HttpAuthAdapter | null = null;

/** Registers the auth adapter; returns a function that unregisters it. */
export function registerHttpAuth(next: HttpAuthAdapter): () => void {
  adapter = next;
  return () => {
    if (adapter === next) adapter = null;
  };
}

export function getHttpAuth(): HttpAuthAdapter | null {
  return adapter;
}
```

- [ ] **Step 6: Create `src/core/api/interceptors.ts`**

```ts
import { type AxiosInstance, type InternalAxiosRequestConfig, isAxiosError } from 'axios';

import type { Logger } from '@/core/logger';

import type { HttpAuthAdapter } from './auth-bridge';
import { type AppError, toAppError } from './errors';

export interface InterceptorDeps {
  getLocale: () => string;
  createRequestId: () => string;
  getHttpAuth: () => HttpAuthAdapter | null;
  logger: Pick<Logger, 'debug' | 'error' | 'warn'>;
  /** A toast for errors every screen would otherwise have to handle itself (403, offline, timeout). */
  notifyError: (error: AppError) => void;
}

const GLOBALLY_NOTIFIED = new Set(['FORBIDDEN', 'NETWORK_ERROR', 'TIMEOUT']);

/** Installs the request/response interceptors (spec §6.1) on an Axios instance. */
export function installInterceptors(instance: AxiosInstance, deps: InterceptorDeps): void {
  instance.interceptors.request.use((config) => {
    config.headers.set('Accept-Language', deps.getLocale());
    if (!config.headers.has('X-Request-Id')) config.headers.set('X-Request-Id', deps.createRequestId());
    const prepared = deps.getHttpAuth()?.prepareRequest(config) ?? config;
    deps.logger.debug(`HTTP ${(prepared.method ?? 'get').toUpperCase()} ${prepared.url ?? ''}`, {
      requestId: prepared.headers.get('X-Request-Id'),
    });
    return prepared;
  });

  // One refresh in flight at a time, shared by every request that got a 401 meanwhile.
  let refreshing: Promise<void> | null = null;

  instance.interceptors.response.use(undefined, async (error: unknown) => {
    const appError = toAppError(error);
    const config: InternalAxiosRequestConfig | undefined = isAxiosError(error) ? error.config : undefined;
    const auth = deps.getHttpAuth();

    if (appError.status === 401 && config && auth && !config.skipAuthRefresh) {
      if (config._retried) {
        auth.onSessionExpired(); // still unauthorised after a successful refresh
        throw appError;
      }
      try {
        refreshing ??= auth.refresh().finally(() => {
          refreshing = null;
        });
        await refreshing;
      } catch {
        auth.onSessionExpired();
        throw appError;
      }
      return instance({ ...config, _retried: true });
    }

    if (appError.code !== 'CANCELLED') {
      const level = appError.status === 0 || appError.status >= 500 ? 'error' : 'warn';
      deps.logger[level]('HTTP request failed', {
        error: appError,
        requestId: appError.requestId,
        status: appError.status,
        code: appError.code,
        method: config?.method,
        url: config?.url,
      });
    }
    if (!config?.silent && GLOBALLY_NOTIFIED.has(appError.code)) deps.notifyError(appError);
    throw appError;
  });
}
```

- [ ] **Step 7: Create `src/core/api/http.ts`**

```ts
import axios from 'axios';

import { HTTP_TIMEOUT_MS } from '@/config/constants';
import { env } from '@/config/env';
import { i18n } from '@/core/i18n';
import { logger } from '@/core/logger';
import { notify } from '@/core/notify';
import { createRequestId } from '@/lib/id';

import { getHttpAuth } from './auth-bridge';
import { getErrorMessage } from './errors';
import { installInterceptors } from './interceptors';

/** The single Axios instance (spec §6.1). Hand-written services and Orval-generated hooks both use it. */
export const http = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  timeout: HTTP_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
  transitional: { clarifyTimeoutError: true }, // timeouts report ETIMEDOUT instead of ECONNABORTED
});

installInterceptors(http, {
  getLocale: () => i18n.language,
  createRequestId,
  getHttpAuth,
  logger,
  notifyError: (error) => {
    notify.error(getErrorMessage(error));
  },
});
```

- [ ] **Step 8: Export them (append to `src/core/api/index.ts`)**

```ts
export { registerHttpAuth, type HttpAuthAdapter } from './auth-bridge';
export { http } from './http';
```

Run: `pnpm exec vitest run src/lib/id.test.ts src/core/api`
Expected: PASS.

- [ ] **Step 9: Put an "HTTP client" section at the top of `docs/data-fetching.md`, directly under the title**

````markdown
## HTTP client (`@/core/api`)

There is **one** Axios instance: `http`. Hand-written services and Orval-generated hooks both use it, so every call gets the same behaviour. Never import `axios` directly (ESLint enforces this).

```ts
import { http } from '@/core/api';

export async function getItem(id: string, signal?: AbortSignal) {
  const { data } = await http.get<Item>(`/items/${id}`, { signal }); // TanStack Query passes `signal` for cancellation
  return data;
}
```

| Interceptor | What it does |
|---|---|
| Request | Sets `Accept-Language` (current locale) and `X-Request-Id` (a UUID for tracing), lets the auth strategy add credentials, and logs at debug level |
| 401 | Calls `POST /auth/refresh` **once**, even for concurrent requests, then retries each request once. If that fails, the session is cleared and the guards redirect to login. |
| 403 | Shows a "no permission" toast |
| Offline / timeout | Shows a connectivity toast (de-duplicated) |
| Every failure | Rejects with an `AppError` `{ code, message, status, details?, requestId?, userMessage? }` and logs it with the request id |

Per-request flags: `{ skipAuthRefresh: true }` (used by login, logout and refresh) and `{ silent: true }` (no global toast).

**Errors for users:** `getErrorMessage(error)` returns a translated message. Add `errors:codes.<YOUR_CODE>` to the locale files to translate backend-specific error codes.

**Cross-origin APIs:** `X-Request-Id` is a custom header, so browsers send a CORS preflight. The backend must allow it (`Access-Control-Allow-Headers: X-Request-Id, Accept-Language, Content-Type`) and may expose `X-Request-Id` in its responses. The same-origin `/api` proxy avoids all of this (docs/docker.md).
````

- [ ] **Step 10: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(api): add shared axios instance with auth refresh, tracing and error interceptors" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5.4: TanStack Query client (spec §6.2)

**Files:**
- Create: `src/core/api/query-client.ts`, `src/core/api/query-client.test.tsx`
- Modify: `src/config/constants.ts`, `src/core/api/index.ts`, `src/app/providers.tsx`, `src/test/render.tsx`, `docs/data-fetching.md`

**Interfaces:**
- Produces:
  - `createQueryClient({ refetchOnWindowFocus? }): QueryClient` and the app's `queryClient` (from `@/core/api`)
  - **Defaults:** `staleTime` 30 s; queries retry once but never on 4xx; mutations never retry; `refetchOnWindowFocus` false
  - **Global handlers:** failed queries are logged (skip with `meta: { silent: true }`); failed mutations are logged and toasted (skip the toast with `meta: { silent: true }`)
  - **`Register` augmentation:** `defaultError: AppError`, `queryMeta: { silent?: boolean }`, `mutationMeta: { silent?: boolean }`
  - from `@/test/render`: provider-wrapped `render` and `renderHook`. `createTestQueryClient()` now builds on `createQueryClient()`, with retries off.

- [ ] **Step 1: Install and add the constant**

Run: `pnpm add @tanstack/react-query-devtools`

Append to `src/config/constants.ts`:

```ts
/** Default TanStack Query stale time: data younger than this is served without refetching. */
export const QUERY_STALE_TIME_MS = 30_000;
```

- [ ] **Step 2: Make the test helpers mirror the app (replace `src/test/render.tsx`)**

```tsx
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  render as rtlRender,
  renderHook as rtlRenderHook,
  type RenderHookOptions,
  type RenderOptions,
} from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

import { createQueryClient } from '@/core/api';
import { ConfirmProvider } from '@/core/notify';

export { act, fireEvent, screen, waitFor, waitForElementToBeRemoval, within } from '@testing-library/react';

/** The app's QueryClient configuration, with retries off and no garbage collection during a test. */
export function createTestQueryClient(): QueryClient {
  const client = createQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    queries: { ...defaults.queries, retry: false, gcTime: Infinity },
    mutations: { ...defaults.mutations, retry: false },
  });
  return client;
}

function createWrapper(queryClient: QueryClient) {
  return function Providers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>{children}</ConfirmProvider>
      </QueryClientProvider>
    );
  };
}

export interface ProviderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

/** Renders `ui` inside the app providers (spec §10.2). Routing and auth options come in Phase 7. */
export function render(
  ui: ReactElement,
  { queryClient = createTestQueryClient(), ...options }: ProviderOptions = {},
) {
  return { queryClient, ...rtlRender(ui, { wrapper: createWrapper(queryClient), ...options }) };
}

export function renderHook<Result, Props>(
  callback: (props: Props) => Result,
  {
    queryClient = createTestQueryClient(),
    ...options
  }: Omit<RenderHookOptions<Props>, 'wrapper'> & { queryClient?: QueryClient } = {},
) {
  return { queryClient, ...rtlRenderHook(callback, { wrapper: createWrapper(queryClient), ...options }) };
}
```

- [ ] **Step 3: Write the failing test `src/core/api/query-client.test.tsx`**

```tsx
import { useMutation, useQuery } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { logger } from '@/core/logger';
import { notify } from '@/core/notify';
import { renderHook, waitFor } from '@/test/render';

import { AppError } from './errors';
import { createQueryClient } from './query-client';

const serverError = () => new AppError({ code: 'SERVER_ERROR', message: 'boom', status: 500 });
const notFound = () => new AppError({ code: 'NOT_FOUND', message: 'missing', status: 404 });

describe('createQueryClient', () => {
  it('uses the documented defaults', () => {
    const defaults = createQueryClient().getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(30_000);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaults.mutations?.retry).toBe(0);
  });

  it('retries a failed query once, but never on 4xx', () => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry;
    if (typeof retry !== 'function') throw new Error('retry should be a function');

    expect(retry(0, serverError())).toBe(true);
    expect(retry(1, serverError())).toBe(false);
    expect(retry(0, notFound())).toBe(false);
  });

  it('toasts failed mutations unless they opt out with meta.silent', async () => {
    const toast = vi.spyOn(notify, 'error');
    const { result } = renderHook(
      () => ({
        loud: useMutation({ mutationFn: () => Promise.reject(notFound()) }),
        quiet: useMutation({ mutationFn: () => Promise.reject(notFound()), meta: { silent: true } }),
      }),
      { queryClient: createQueryClient() },
    );

    await expect(result.current.loud.mutateAsync()).rejects.toBeInstanceOf(AppError);
    await expect(result.current.quiet.mutateAsync()).rejects.toBeInstanceOf(AppError);

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith("We couldn't find what you were looking for.");
  });

  it('logs failed queries unless meta.silent is set', async () => {
    const warn = vi.spyOn(logger, 'warn');
    const queryClient = createQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false } });

    renderHook(() => useQuery({ queryKey: ['fails'], queryFn: () => Promise.reject(serverError()) }), { queryClient });

    await waitFor(() => {
      expect(warn).toHaveBeenCalledWith('Query failed', expect.objectContaining({ queryKey: ['fails'] }));
    });
  });
});
```

Run: `pnpm exec vitest run src/core/api/query-client.test.tsx`
Expected: FAIL, because `./query-client` is missing.

- [ ] **Step 4: Create `src/core/api/query-client.ts`**

```ts
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { logger } from '@/core/logger';
import { notify } from '@/core/notify';

import { type AppError, getErrorMessage, isAppError } from './errors';

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: AppError;
    queryMeta: {
      /** Don't log this query's failures (they are expected, e.g. an existence check). */
      silent?: boolean;
    };
    mutationMeta: {
      /** Don't show the global error toast; the caller handles it (e.g. by mapping field errors). */
      silent?: boolean;
    };
  }
}

const isClientError = (error: unknown) =>
  isAppError(error) && error.status >= 400 && error.status < 500;

export interface QueryClientOptions {
  refetchOnWindowFocus?: boolean;
}

/** The app's TanStack Query setup (spec §6.2). */
export function createQueryClient({ refetchOnWindowFocus = false }: QueryClientOptions = {}): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.silent) return;
        logger.warn('Query failed', { error, queryKey: query.queryKey, requestId: error.requestId });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) => {
        logger.warn('Mutation failed', {
          error,
          mutationKey: mutation.options.mutationKey,
          requestId: error.requestId,
        });
        if (!mutation.meta?.silent) notify.error(getErrorMessage(error));
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        refetchOnWindowFocus,
        // One retry for network or server trouble; a 4xx will not change by asking again.
        retry: (failureCount, error) => !isClientError(error) && failureCount < 1,
      },
      mutations: { retry: 0 },
    },
  });
}

/** The single QueryClient the app uses (mounted in src/app/providers.tsx). */
export const queryClient = createQueryClient();
```

Append to `src/core/api/index.ts`:

```ts
export { createQueryClient, queryClient, type QueryClientOptions } from './query-client';
```

Run: `pnpm exec vitest run src/core/api`
Expected: PASS.

- [ ] **Step 5: Provide the client and devtools (replace `src/app/providers.tsx`)**

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';

import { queryClient } from '@/core/api';
import { ConfirmProvider, Toaster } from '@/core/notify';
import { useThemeSync } from '@/stores/theme-store';

function ThemeSync() {
  useThemeSync();
  return null;
}

/** Every app-wide provider, composed in one place (spec §3). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <ThemeSync />
        {children}
        <Toaster />
      </ConfirmProvider>
      {/* Renders nothing outside development builds. */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 6: Append "Server state with TanStack Query" to `docs/data-fetching.md`**

Put it after the HTTP client section.

````markdown
## Server state with TanStack Query

All API data goes through TanStack Query (spec Principle 3). The client (`src/core/api/query-client.ts`) sets:

| Setting | Value |
|---|---|
| `staleTime` | 30 s |
| Query retries | 1, but none for 4xx responses |
| Mutation retries | 0 |
| `refetchOnWindowFocus` | off (turn it on per query, or with `createQueryClient({ refetchOnWindowFocus: true })`) |
| Failed query | logged; add `meta: { silent: true }` to skip |
| Failed mutation | logged **and toasted**. Add `meta: { silent: true }` when you handle it yourself, e.g. when mapping field errors with `applyServerErrors`. |
| Errors | typed as `AppError` everywhere (`Register.defaultError`) |

React Query Devtools appear in development only (bottom-left button).

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

Invalidate broadly (`itemKeys.lists()`) after mutations. The reference feature (`src/features/example`) shows the full pattern, including optimistic updates.
````

- [ ] **Step 7: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(api): add query client with global error handling and devtools" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5.5: UI and session stores, and the permissions registry (spec §6.4)

**Files:**
- Create:
  - `src/config/permissions.ts`
  - `src/stores/ui-store.ts`, `src/stores/ui-store.test.ts`
  - `src/stores/session-store.ts`, `src/stores/session-store.test.ts`
  - `docs/state-management.md`
- Modify: `src/test/setup.ts`

**Interfaces:**
- Produces:
  - `PERMISSIONS = ['items.read', 'items.create', 'items.update', 'items.delete'] as const` and `type Permission`. The `// plop:permissions` anchor is used by generators.
  - `useUiStore` with state `{ sidebarCollapsed, mobileNavOpen, toggleSidebar, setMobileNavOpen }`. Only `sidebarCollapsed` is persisted.
  - selector hooks `useSidebarCollapsed`, `useToggleSidebar`, `useMobileNavOpen`, `useSetMobileNavOpen`
  - `interface SessionUser { id; name; email; permissions: readonly Permission[] }` and `type SessionStatus = 'unknown' | 'authenticated' | 'anonymous'`
  - `useSessionStore` with state `{ status, user, setUser(user), clear() }`. It lives in memory only and is never persisted.
  - selector hooks `useSessionUser`, `useSessionStatus`, `usePermissions`
  - every store is reset after each test

- [ ] **Step 1: Create `src/config/permissions.ts`**

```ts
/**
 * Every permission the frontend checks (spec §7.9). The server is the real authority: these only
 * decide what the UI shows. Name them `<resource>.<action>`; features add theirs here.
 */
export const PERMISSIONS = [
  'items.read',
  'items.create',
  'items.update',
  'items.delete',
  // plop:permissions
] as const;

export type Permission = (typeof PERMISSIONS)[number];
```

- [ ] **Step 2: Write the failing tests**

`src/stores/ui-store.test.ts`:

```ts
import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { localStore, STORAGE_KEYS } from '@/core/storage';

import { useUiStore } from './ui-store';

describe('ui store', () => {
  it('toggles the sidebar and persists only that preference', () => {
    act(() => {
      useUiStore.getState().toggleSidebar();
      useUiStore.getState().setMobileNavOpen(true);
    });

    expect(useUiStore.getState()).toMatchObject({ sidebarCollapsed: true, mobileNavOpen: true });
    expect(localStore.get(STORAGE_KEYS.ui)).toEqual({ state: { sidebarCollapsed: true }, version: 0 });
  });
});
```

`src/stores/session-store.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePermissions, useSessionStore } from './session-store';

const user = { id: 'u1', name: 'Demo User', email: 'demo@example.com', permissions: ['items.read'] as const };

describe('session store', () => {
  it('starts unknown, becomes authenticated, then anonymous', () => {
    expect(useSessionStore.getState().status).toBe('unknown');

    act(() => {
      useSessionStore.getState().setUser(user);
    });
    expect(useSessionStore.getState()).toMatchObject({ status: 'authenticated', user });

    act(() => {
      useSessionStore.getState().clear();
    });
    expect(useSessionStore.getState()).toMatchObject({ status: 'anonymous', user: null });
  });

  it('never writes the user to browser storage', () => {
    act(() => {
      useSessionStore.getState().setUser(user);
    });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('exposes permissions through a stable selector', () => {
    const { result, rerender } = renderHook(() => usePermissions());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    expect(result.current).toEqual([]);
  });
});
```

Run: `pnpm exec vitest run src/stores`
Expected: FAIL, because the modules are missing.

- [ ] **Step 3: Create `src/stores/ui-store.ts`**

```ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { env } from '@/config/env';
import { createZustandStorage, localStore, STORAGE_KEYS } from '@/core/storage';

interface UiState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
}

type PersistedUi = Pick<UiState, 'sidebarCollapsed'>;

/** Layout UI state (spec §6.4). Only the sidebar preference survives reloads. */
export const useUiStore = create<UiState>()(
  devtools(
    persist(
      (set) => ({
        sidebarCollapsed: false,
        mobileNavOpen: false,
        toggleSidebar: () => {
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }), undefined, 'ui/toggleSidebar');
        },
        setMobileNavOpen: (open) => {
          set({ mobileNavOpen: open }, undefined, 'ui/setMobileNavOpen');
        },
      }),
      {
        name: STORAGE_KEYS.ui,
        storage: createZustandStorage<PersistedUi>(localStore),
        partialize: (state): PersistedUi => ({ sidebarCollapsed: state.sidebarCollapsed }),
      },
    ),
    { name: 'ui-store', enabled: env.isDev && !env.isTest },
  ),
);

export const useSidebarCollapsed = () => useUiStore((state) => state.sidebarCollapsed);
export const useToggleSidebar = () => useUiStore((state) => state.toggleSidebar);
export const useMobileNavOpen = () => useUiStore((state) => state.mobileNavOpen);
export const useSetMobileNavOpen = () => useUiStore((state) => state.setMobileNavOpen);
```

- [ ] **Step 4: Create `src/stores/session-store.ts`**

```ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { env } from '@/config/env';
import type { Permission } from '@/config/permissions';

/** The signed-in user as the auth layer knows it. Never persisted (it contains personal data). */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  permissions: readonly Permission[];
}

/** `unknown` until the bootstrap `/auth/me` call settles. */
export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
  setUser: (user: SessionUser) => void;
  clear: () => void;
}

/**
 * Session identity (spec §6.4): who is signed in and what they may do. The auth layer sets it after
 * `/auth/me` or login and clears it on logout or expiry. It lives in memory only; on reload the
 * httpOnly session cookie restores it through `/auth/me`. This is session state, not cached query data.
 */
export const useSessionStore = create<SessionState>()(
  devtools(
    (set) => ({
      status: 'unknown',
      user: null,
      setUser: (user) => {
        set({ status: 'authenticated', user }, undefined, 'session/setUser');
      },
      clear: () => {
        set({ status: 'anonymous', user: null }, undefined, 'session/clear');
      },
    }),
    { name: 'session-store', enabled: env.isDev && !env.isTest },
  ),
);

const NO_PERMISSIONS: readonly Permission[] = [];

export const useSessionUser = () => useSessionStore((state) => state.user);
export const useSessionStatus = () => useSessionStore((state) => state.status);
export const usePermissions = () =>
  useSessionStore((state) => state.user?.permissions ?? NO_PERMISSIONS);
```

Run: `pnpm exec vitest run src/stores`
Expected: PASS.

- [ ] **Step 5: Reset every store after each test (edit `src/test/setup.ts`)**

1. Add these imports in the internal group:

   ```ts
   import { useSessionStore } from '@/stores/session-store';
   import { useThemeStore } from '@/stores/theme-store';
   import { useUiStore } from '@/stores/ui-store';
   ```

2. Add this as the first statement inside `afterEach`, before `cleanup()`:

   ```ts
   for (const store of [useSessionStore, useThemeStore, useUiStore]) {
     store.setState(store.getInitialState(), true);
   }
   ```

- [ ] **Step 6: Write `docs/state-management.md`**

````markdown
# State management

Pick the home for a piece of state with this table (spec Principle 3):

| Kind of state | Where it lives | Examples |
|---|---|---|
| Server data | **TanStack Query** (docs/data-fetching.md) | lists, details, anything from the API |
| View state someone might bookmark or share | **The URL**: `useUrlState`, `usePagination` (docs/routing.md) | filters, search, page, sort, active tab |
| App-wide UI and session state | **Zustand**, in `src/stores/` | theme, sidebar collapsed, the signed-in user |
| Form state | **React Hook Form** (docs/forms.md) | field values, dirty and touched state, errors |
| Everything else | `useState` / `useReducer` in the component | open/closed, hover, a local draft |

## Rules

- **Never copy query data into a store.** Read it with `useQuery` where you need it; the cache is the store.
- **Subscribe through selector hooks** (`useThemeMode()`, `useSidebarCollapsed()`), never to a whole store. Each store file exports its selectors.
- **Persist only what must survive a reload**, through the storage wrapper: `persist(..., { storage: createZustandStorage(localStore), partialize })`. Never persist tokens or personal data (docs/security.md).
- Stores use the Redux DevTools extension in development (the `devtools` middleware).

## The stores

| Store | Holds | Persisted |
|---|---|---|
| `theme-store` | light / dark / system | yes (`theme`) |
| `ui-store` | sidebar collapsed, mobile nav open | only `sidebarCollapsed` (`ui`) |
| `session-store` | status (`unknown` / `authenticated` / `anonymous`) and the signed-in user with permissions | **no** |

**Why the user lives in a store:** it is the identity of the current session, set by the auth layer after `/auth/me` or login, not cached server data. Guards and `hasPermission()` read it synchronously. On reload, the httpOnly cookie plus `/auth/me` rebuild it, so it never touches browser storage.

## Adding a store

Run `pnpm gen store` (docs/generators.md). It creates the store with selectors and a test.
````

- [ ] **Step 7: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(stores): add ui and session stores and permissions registry" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Phase 5 gate

- [ ] Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Expected: all green.
- [ ] Manual check:
  1. Run `pnpm dev` and open the browser console. It shows `[MSW] Mocking enabled.`
  2. In DevTools → Application → Service Workers, `mockServiceWorker.js` is active.
  3. Run `localStorage.getItem('react-bedrock:ui')` after toggling nothing: it returns `null` (nothing persisted until changed).
- [ ] Post the **Phase 5 report**. Note the in-memory session store rationale (Deviation 8) and that the `theme-store` was delivered in Task 2.5. Then **STOP** until the owner approves.

---

# Phase 6 — i18n & formatting

Scope (spec §12, §7.6): this phase completes i18next on top of the core from Task 2.2. It adds:
- language detection (saved → browser → default) with persistence
- the language switcher
- typed keys (already done) and missing-key warnings
- the format helpers
- the translated Zod error map
- the `DatePicker` (Deviation 15)

### Task 6.1: Locale-aware format helpers (`src/lib/format.ts`)

**Files:**
- Create: `src/lib/format.ts`, `src/lib/format.test.ts`
- Modify: `vite.config.ts` (the test time zone)

**Interfaces:**
- Produces (all from `@/lib/format`; each takes an optional `{ locale }` and defaults to the current UI locale):
  - `formatDate(value)`
  - `formatDateTime(value)`
  - `formatRelative(value, { base? })`
  - `formatCurrency(amount, { currency? })`, where the currency defaults to `env.VITE_DEFAULT_CURRENCY`
  - `formatNumber(value, Intl.NumberFormatOptions)`
  - `formatPercent(ratio, { maximumFractionDigits? })`
  - `type DateInput = Date | string | number`, where strings are ISO-8601
  - invalid dates format as `''`
  - `setFormatLocale(locale: string)` and `getFormatLocale()`, wired to i18n in Task 6.2
  - `getDateFnsLocale(locale?)`, for the calendar
  - this is the only file allowed to import `date-fns`

- [ ] **Step 1: Pin the test time zone**

In the `test` block of `vite.config.ts`, add `env: { TZ: 'UTC' },` directly after `restoreMocks: true,`.

- [ ] **Step 2: Install**

Run: `pnpm add date-fns`

- [ ] **Step 3: Write the failing test `src/lib/format.test.ts`**

```ts
import { afterEach, describe, expect, it } from 'vitest';

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRelative,
  getDateFnsLocale,
  getFormatLocale,
  setFormatLocale,
} from './format';

const ISO = '2026-01-05T10:00:00Z';

describe('format helpers', () => {
  afterEach(() => {
    setFormatLocale('en');
  });

  it('formats dates and date-times for the requested locale', () => {
    expect(formatDate(ISO, { locale: 'en' })).toBe('Jan 5, 2026');
    expect(formatDate(ISO, { locale: 'es' })).toBe('5 ene 2026');
    expect(formatDateTime(ISO, { locale: 'en' })).toBe('Jan 5, 2026, 10:00 AM');
  });

  it('formats relative time', () => {
    const base = new Date('2026-01-08T10:00:00Z');
    expect(formatRelative(ISO, { base, locale: 'en' })).toBe('3 days ago');
    expect(formatRelative(ISO, { base, locale: 'es' })).toBe('hace 3 días');
  });

  it('returns an empty string for invalid dates', () => {
    expect(formatDate('not a date')).toBe('');
    expect(formatRelative(Number.NaN)).toBe('');
  });

  it('formats currency with the configured default currency', () => {
    expect(formatCurrency(1234.5, { locale: 'en' })).toBe('$1,234.50');
    expect(formatCurrency(1234.5, { locale: 'es' })).toMatch(/1234,50/);
    expect(formatCurrency(10, { locale: 'en', currency: 'EUR' })).toBe('€10.00');
  });

  it('formats numbers and percentages', () => {
    expect(formatNumber(1234567.891, { locale: 'en', maximumFractionDigits: 1 })).toBe('1,234,567.9');
    expect(formatPercent(0.256, { locale: 'en' })).toBe('25.6%');
  });

  it('follows the current UI locale when none is given', () => {
    setFormatLocale('es');
    expect(getFormatLocale()).toBe('es');
    expect(formatDate(ISO)).toBe('5 ene 2026');
    expect(getDateFnsLocale().code).toBe('es');

    setFormatLocale('xx-unsupported');
    expect(getFormatLocale()).toBe('en');
  });
});
```

Run: `pnpm exec vitest run src/lib/format.test.ts`
Expected: FAIL, because `./format` is missing.

- [ ] **Step 4: Create `src/lib/format.ts`**

```ts
import {
  type Locale as DateFnsLocale,
  format as formatPattern,
  formatDistance,
  isValid,
  parseISO,
} from 'date-fns';
import { enUS, es } from 'date-fns/locale';

import { type Locale, SUPPORTED_LOCALES } from '@/config/constants';
import { env } from '@/config/env';

/** One entry per bundled locale. Add the matching date-fns locale when you add a language. */
const DATE_FNS_LOCALES = { en: enUS, es } satisfies Record<Locale, DateFnsLocale>;

const isLocale = (value: string): value is Locale =>
  (SUPPORTED_LOCALES as readonly string[]).includes(value);

let currentLocale: Locale = env.VITE_DEFAULT_LOCALE;

/** Called by core/i18n whenever the UI language changes. */
export function setFormatLocale(locale: string): void {
  const base = locale.toLowerCase().split('-')[0] ?? '';
  currentLocale = isLocale(base) ? base : env.VITE_DEFAULT_LOCALE;
}

export function getFormatLocale(): Locale {
  return currentLocale;
}

/** The date-fns locale for the current UI language (e.g. for the Calendar component). */
export function getDateFnsLocale(locale: Locale = currentLocale): DateFnsLocale {
  return DATE_FNS_LOCALES[locale];
}

/** A Date, a timestamp in ms, or an ISO-8601 string (the usual API format). */
export type DateInput = Date | number | string;

export interface FormatOptions {
  locale?: Locale;
}

const toDate = (value: DateInput): Date => (typeof value === 'string' ? parseISO(value) : new Date(value));

/** Localised medium date: "Jan 5, 2026" / "5 ene 2026". Returns '' for invalid input. */
export function formatDate(value: DateInput, { locale = currentLocale }: FormatOptions = {}): string {
  const date = toDate(value);
  return isValid(date) ? formatPattern(date, 'PP', { locale: DATE_FNS_LOCALES[locale] }) : '';
}

/** Localised date and time: "Jan 5, 2026, 10:00 AM". Returns '' for invalid input. */
export function formatDateTime(value: DateInput, { locale = currentLocale }: FormatOptions = {}): string {
  const date = toDate(value);
  return isValid(date) ? formatPattern(date, 'PPp', { locale: DATE_FNS_LOCALES[locale] }) : '';
}

/** "3 days ago" / "in 2 hours", relative to `base` (default: now). Returns '' for invalid input. */
export function formatRelative(
  value: DateInput,
  { locale = currentLocale, base = new Date() }: FormatOptions & { base?: Date } = {},
): string {
  const date = toDate(value);
  return isValid(date)
    ? formatDistance(date, base, { addSuffix: true, locale: DATE_FNS_LOCALES[locale] })
    : '';
}

/** "$1,234.50" in the UI locale; the currency defaults to VITE_DEFAULT_CURRENCY. */
export function formatCurrency(
  amount: number,
  { locale = currentLocale, currency = env.VITE_DEFAULT_CURRENCY }: FormatOptions & { currency?: string } = {},
): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

/** Locale-aware number formatting; accepts any Intl.NumberFormat option. */
export function formatNumber(
  value: number,
  { locale = currentLocale, ...options }: FormatOptions & Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/** A ratio as a percentage: 0.256 → "25.6%". */
export function formatPercent(
  ratio: number,
  { locale = currentLocale, maximumFractionDigits = 1 }: FormatOptions & { maximumFractionDigits?: number } = {},
): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits }).format(ratio);
}
```

Run: `pnpm exec vitest run src/lib/format.test.ts`
Expected: PASS.

If a date-fns output differs in the installed version (for example the `es` month abbreviation), update the expected string to the library's current output, keep the test, and note it in the report.

- [ ] **Step 5: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(format): add locale-aware date, currency and number formatters" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6.2: Language detection, persistence, document sync and missing-key warnings

**Files:**
- Create: `src/core/i18n/detect.ts`, `src/core/i18n/detect.test.ts`
- Modify: `src/core/i18n/i18n.ts`, `src/core/i18n/i18n.test.ts`, `src/core/i18n/index.ts`

**Interfaces:**
- Consumes: `localStore` and `STORAGE_KEYS.locale`; `logger`; `setFormatLocale`.
- Produces:
  - `matchLocale(tag): Locale | undefined`, e.g. `'es-MX'` → `'es'`
  - `detectLocale({ saved, browser, fallback }): Locale`
  - `changeLocale(locale: Locale): Promise<void>`, which switches the language and persists the choice
  - on every language change:
    - `<html lang>` and `<html dir>` are updated
    - the formatters follow
    - Accept-Language follows, because the HTTP interceptor reads `i18n.language`
  - in development, missing keys log `logger.warn('Missing translation: <ns>:<key>')`

- [ ] **Step 1: Write the failing tests**

`src/core/i18n/detect.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { detectLocale, matchLocale } from './detect';

describe('matchLocale', () => {
  it.each([
    ['es', 'es'],
    ['es-MX', 'es'],
    ['EN-gb', 'en'],
    ['fr-FR', undefined],
    [null, undefined],
  ])('maps %j to %j', (tag, expected) => {
    expect(matchLocale(tag)).toBe(expected);
  });
});

describe('detectLocale', () => {
  it('prefers the saved choice, then the browser languages, then the default', () => {
    expect(detectLocale({ saved: 'es', browser: ['en-US'], fallback: 'en' })).toBe('es');
    expect(detectLocale({ saved: null, browser: ['fr-FR', 'es-ES'], fallback: 'en' })).toBe('es');
    expect(detectLocale({ saved: 'de', browser: ['fr'], fallback: 'en' })).toBe('en');
  });
});
```

Append these cases to `src/core/i18n/i18n.test.ts`. Add `import { localStore, STORAGE_KEYS } from '@/core/storage';` and `import { getFormatLocale } from '@/lib/format';` to its imports, and import `changeLocale` from `./i18n`.

```ts
describe('changeLocale', () => {
  it('switches language, persists the choice and syncs the document and formatters', async () => {
    await changeLocale('es');

    expect(i18n.language).toBe('es');
    expect(localStore.get(STORAGE_KEYS.locale)).toBe('es');
    expect(document.documentElement.lang).toBe('es');
    expect(document.documentElement.dir).toBe('ltr');
    expect(getFormatLocale()).toBe('es');
  });
});
```

Run: `pnpm exec vitest run src/core/i18n`
Expected: FAIL, because `./detect` and `changeLocale` are missing.

- [ ] **Step 2: Create `src/core/i18n/detect.ts`**

```ts
import { type Locale, SUPPORTED_LOCALES } from '@/config/constants';

/** Maps a BCP 47 language tag ('es-MX') to a bundled locale ('es'), or undefined. */
export function matchLocale(tag: string | null | undefined): Locale | undefined {
  if (!tag) return undefined;
  const lower = tag.toLowerCase();
  return SUPPORTED_LOCALES.find((locale) => lower === locale || lower.startsWith(`${locale}-`));
}

export interface DetectLocaleInput {
  /** The user's saved choice (from storage). */
  saved: string | null;
  /** `navigator.languages`. */
  browser: readonly string[];
  /** `env.VITE_DEFAULT_LOCALE`. */
  fallback: Locale;
}

/** Detection order (spec §7.6): saved preference → browser languages → VITE_DEFAULT_LOCALE. */
export function detectLocale({ saved, browser, fallback }: DetectLocaleInput): Locale {
  return matchLocale(saved) ?? browser.map(matchLocale).find(Boolean) ?? fallback;
}
```

- [ ] **Step 3: Replace `src/core/i18n/i18n.ts`**

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { type Locale, SUPPORTED_LOCALES } from '@/config/constants';
import { env } from '@/config/env';
import { logger } from '@/core/logger';
import { localStore, STORAGE_KEYS } from '@/core/storage';
import { setFormatLocale } from '@/lib/format';

import { detectLocale } from './detect';
import { defaultNS, namespaces, resources } from './resources';

const initialLocale = detectLocale({
  saved: localStore.get<string>(STORAGE_KEYS.locale),
  browser: navigator.languages,
  fallback: env.VITE_DEFAULT_LOCALE,
});

// Resources are bundled, so init completes synchronously (initAsync: false makes that explicit).
void i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LOCALES],
  nonExplicitSupportedLngs: true,
  ns: namespaces,
  defaultNS,
  initAsync: false,
  interpolation: { escapeValue: false }, // React already escapes output
  // Fail loudly in development (spec §7.6): report keys that have no translation.
  saveMissing: env.isDev,
  missingKeyHandler: (_languages, namespace, key) => {
    logger.warn(`Missing translation: ${namespace}:${key}`);
  },
});

/** Keeps <html lang/dir> and the formatters in step with the UI language. */
function syncLocale(locale: string): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = i18n.dir(locale);
  setFormatLocale(locale);
}

syncLocale(i18n.language);
i18n.on('languageChanged', syncLocale);

/** Switches the UI language and remembers the choice (spec §7.6). */
export async function changeLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
  localStore.set(STORAGE_KEYS.locale, locale);
}

export { i18n };
```

- [ ] **Step 4: Export them (replace `src/core/i18n/index.ts`)**

```ts
export { detectLocale, matchLocale } from './detect';
export { changeLocale, i18n } from './i18n';
export { defaultNS, namespaces, resources, type Namespace } from './resources';
export { translateKey } from './translate-key';
```

Run: `pnpm exec vitest run src/core/i18n src/lib`
Expected: PASS.

- [ ] **Step 5: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(i18n): detect and persist the language and sync document and formatters" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6.3: Language switcher

**Files:**
- Create: `src/components/layout/language-switcher.tsx`, `language-switcher.test.tsx`, `language-switcher.stories.tsx`
- Modify: `src/locales/{en,es}/common.json`

**Interfaces:**
- Consumes: `changeLocale`, `SUPPORTED_LOCALES`.
- Produces: `<LanguageSwitcher />`, a dropdown listing every bundled locale by its own name. The Header uses it in Phase 7.

- [ ] **Step 1: Add the translations**

Language names are endonyms, so they are identical in every locale file.

Deep-merge into `src/locales/en/common.json`:

```json
{ "language": { "change": "Change language", "names": { "en": "English", "es": "Español" } } }
```

Deep-merge into `src/locales/es/common.json`:

```json
{ "language": { "change": "Cambiar idioma", "names": { "en": "English", "es": "Español" } } }
```

- [ ] **Step 2: Write the failing test `src/components/layout/language-switcher.test.tsx`**

```tsx
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { i18n } from '@/core/i18n';
import { localStore, STORAGE_KEYS } from '@/core/storage';
import { render, screen } from '@/test/render';

import { LanguageSwitcher } from './language-switcher';

describe('LanguageSwitcher', () => {
  it('switches and remembers the language', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole('button', { name: 'Change language' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Español' }));

    expect(i18n.language).toBe('es');
    expect(localStore.get(STORAGE_KEYS.locale)).toBe('es');
    expect(screen.getByRole('button', { name: 'Cambiar idioma' })).toBeInTheDocument();
  });
});
```

Run: `pnpm exec vitest run src/components/layout`
Expected: FAIL, because the module is missing.

- [ ] **Step 3: Create `src/components/layout/language-switcher.tsx`**

```tsx
import { LanguagesIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type Locale, SUPPORTED_LOCALES } from '@/config/constants';
import { changeLocale } from '@/core/i18n';

const isLocale = (value: string): value is Locale =>
  (SUPPORTED_LOCALES as readonly string[]).includes(value);

/** Header language menu (spec §7.6). The choice persists via the storage wrapper. */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('language.change')}>
          <LanguagesIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={i18n.resolvedLanguage ?? i18n.language}
          onValueChange={(value) => {
            if (isLocale(value)) void changeLocale(value);
          }}
        >
          {SUPPORTED_LOCALES.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale} lang={locale}>
              {t(`language.names.${locale}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Create `src/components/layout/language-switcher.stories.tsx`**

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { LanguageSwitcher } from './language-switcher';

const meta = { title: 'Layout/LanguageSwitcher', component: LanguageSwitcher } satisfies Meta<typeof LanguageSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Changes the real app language (and the Storybook locale toolbar follows on the next story). */
export const Default: Story = {};
```

Run: `pnpm exec vitest run src/components/layout`
Expected: PASS.

- [ ] **Step 5: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(i18n): add language switcher" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6.4: Translated Zod validation messages (spec §7.6)

**Files:**
- Create:
  - `src/locales/en/validation.json`, `src/locales/es/validation.json`
  - `src/core/i18n/zod-error-map.ts`, `src/core/i18n/zod-error-map.test.ts`
  - `docs/forms.md`
- Modify: `src/core/i18n/resources.ts`, `src/core/i18n/i18n.ts`

**Interfaces:**
- Produces:
  - the `validation` namespace, including `validation:server.<CODE>`, which `applyServerErrors` uses to translate server field codes
  - `zodErrorMap(issue)`, installed globally with `z.config({ customError })` at i18n start-up
  - **Precedence:** messages written in a schema (`{ error: … }`) still win. Everything else is translated at parse time, in the current language.

- [ ] **Step 1: Create `src/locales/en/validation.json`**

```json
{
  "required": "This field is required",
  "invalidType": "Enter a valid value",
  "tooShort": "Use at least {{count}} characters",
  "tooLong": "Use at most {{count}} characters",
  "tooSmall": "Must be at least {{minimum}}",
  "tooBig": "Must be at most {{maximum}}",
  "tooFewItems": "Select at least {{count}} items",
  "tooManyItems": "Select at most {{count}} items",
  "email": "Enter a valid email address",
  "url": "Enter a valid URL",
  "invalidFormat": "The format is not valid",
  "invalidOption": "Choose one of the available options",
  "server": {
    "ALREADY_EXISTS": "This value is already in use",
    "INVALID": "This value is not valid"
  }
}
```

- [ ] **Step 2: Create `src/locales/es/validation.json`**

```json
{
  "required": "Este campo es obligatorio",
  "invalidType": "Introduce un valor válido",
  "tooShort": "Usa al menos {{count}} caracteres",
  "tooLong": "Usa como máximo {{count}} caracteres",
  "tooSmall": "Debe ser como mínimo {{minimum}}",
  "tooBig": "Debe ser como máximo {{maximum}}",
  "tooFewItems": "Selecciona al menos {{count}} elementos",
  "tooManyItems": "Selecciona como máximo {{count}} elementos",
  "email": "Introduce una dirección de correo válida",
  "url": "Introduce una URL válida",
  "invalidFormat": "El formato no es válido",
  "invalidOption": "Elige una de las opciones disponibles",
  "server": {
    "ALREADY_EXISTS": "Este valor ya está en uso",
    "INVALID": "Este valor no es válido"
  }
}
```

- [ ] **Step 3: Register the namespace (in `src/core/i18n/resources.ts`)**

Add the `enValidation` / `esValidation` imports alphabetically, then set:

```ts
const en = { common: enCommon, errors: enErrors, validation: enValidation };
const es: typeof en = { common: esCommon, errors: esErrors, validation: esValidation };
```

- [ ] **Step 4: Write the failing test `src/core/i18n/zod-error-map.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { i18n } from './i18n';

const schema = z.object({
  name: z.string().min(1),
  bio: z.string().min(10).max(20),
  email: z.email(),
  kind: z.enum(['a', 'b']),
  tags: z.array(z.string()).min(2),
});

const fieldErrors = (input: unknown) => {
  const result = schema.safeParse(input);
  if (result.success) throw new Error('expected validation to fail');
  return z.flattenError(result.error).fieldErrors;
};

describe('zod error map', () => {
  it('translates the common issues', () => {
    expect(fieldErrors({ name: '', bio: 'short', email: 'nope', kind: 'c', tags: [] })).toEqual({
      name: ['This field is required'],
      bio: ['Use at least 10 characters'],
      email: ['Enter a valid email address'],
      kind: ['Choose one of the available options'],
      tags: ['Select at least 2 items'],
    });
  });

  it('reports missing fields as required', () => {
    expect(fieldErrors({}).name).toEqual(['This field is required']);
  });

  it('follows the current language', async () => {
    await i18n.changeLanguage('es');
    expect(fieldErrors({}).name).toEqual(['Este campo es obligatorio']);
  });

  it('lets messages written in the schema win', () => {
    const result = z.string().min(1, { error: 'Give it a name' }).safeParse('');
    expect(result.error?.issues[0]?.message).toBe('Give it a name');
  });
});
```

Run: `pnpm exec vitest run src/core/i18n/zod-error-map.test.ts`
Expected: FAIL, because Zod still returns its default English messages.

- [ ] **Step 5: Create `src/core/i18n/zod-error-map.ts`**

```ts
// The i18next singleton itself (not ./i18n), so this module and i18n.ts don't import each other.
import i18n from 'i18next';
import type { z } from 'zod';

/**
 * Translates Zod's validation messages through i18next (spec §7.6). Evaluated at parse time, so it
 * follows the current language. Returning undefined falls back to Zod's own message.
 */
export function zodErrorMap(issue: z.core.$ZodRawIssue): string | undefined {
  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined || issue.input === null
        ? i18n.t('validation:required')
        : i18n.t('validation:invalidType');
    case 'too_small': {
      const count = Number(issue.minimum);
      if (issue.origin === 'string') {
        return count <= 1 ? i18n.t('validation:required') : i18n.t('validation:tooShort', { count });
      }
      if (issue.origin === 'array' || issue.origin === 'set') {
        return i18n.t('validation:tooFewItems', { count });
      }
      return i18n.t('validation:tooSmall', { minimum: String(issue.minimum) });
    }
    case 'too_big': {
      const count = Number(issue.maximum);
      if (issue.origin === 'string') return i18n.t('validation:tooLong', { count });
      if (issue.origin === 'array' || issue.origin === 'set') {
        return i18n.t('validation:tooManyItems', { count });
      }
      return i18n.t('validation:tooBig', { maximum: String(issue.maximum) });
    }
    case 'invalid_format':
      if (issue.format === 'email') return i18n.t('validation:email');
      if (issue.format === 'url') return i18n.t('validation:url');
      return i18n.t('validation:invalidFormat');
    case 'invalid_value':
      return i18n.t('validation:invalidOption');
    default:
      return undefined;
  }
}
```

- [ ] **Step 6: Install it at start-up (edit `src/core/i18n/i18n.ts`)**

1. Add `import { z } from 'zod';` to the external imports, after `react-i18next`.
2. Add `import { zodErrorMap } from './zod-error-map';` to the relative imports.
3. Append after `i18n.on('languageChanged', syncLocale);`:

```ts
// Every Zod schema in the app gets translated messages (schema-level messages still win).
z.config({ customError: zodErrorMap });
```

Run: `pnpm exec vitest run src/core/i18n`
Expected: PASS.

- [ ] **Step 7: Write `docs/forms.md`**

This is the first version; Task 8.4 completes it.

````markdown
# Forms

Pattern (spec §7.7): a Zod schema in the feature's `schemas/` folder → `useForm` with `zodResolver` → the shadcn `Form` components.

```tsx
const schema = z.object({ name: z.string().min(1).max(80), email: z.email() });
type Values = z.infer<typeof schema>;

const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
  resolver: zodResolver(schema),
  defaultValues: { name: '', email: '' },
});
```

## Validation messages are translated automatically

A global Zod error map (`src/core/i18n/zod-error-map.ts`) translates the common issues (required, too short or long, email, URL, enum, …) into the current language. So schemas usually need no messages at all.

When you do need a specific message, pass a function so it is translated at parse time:

```ts
z.string().refine(isSlug, { error: () => i18n.t('items:form.slugInvalid') });
```

Field errors appear under each input via `<FormMessage />`.
````

- [ ] **Step 8: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(i18n): translate zod validation messages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6.5: Calendar and DatePicker (moved here from Phase 2)

**Files:**
- Create: `src/components/ui/calendar.tsx` (generated), `src/components/ui/date-picker.tsx`, `date-picker.test.tsx`, `date-picker.stories.tsx`
- Modify: `src/locales/{en,es}/common.json`, `docs/design-system.md`

**Interfaces:**
- Consumes: `Popover`, `Button`, `formatDate`, `getDateFnsLocale`.
- Produces: `<DatePicker value: Date | undefined onChange: (date?: Date) => void placeholder? … />`. It accepts every `Button` prop except `value` / `onChange`, so it works inside `<FormControl>` (which injects `id`, `aria-invalid` and `aria-describedby`).

- [ ] **Step 1: Add the Calendar primitive**

Run: `pnpm ui:add calendar`
Expected: `src/components/ui/calendar.tsx` is created and `react-day-picker` is installed.

Run `pnpm lint`. If it reports a `date-fns` import in `calendar.tsx`, replace that usage with a helper exported from `@/lib/format`, and record it.

- [ ] **Step 2: Add the translations**

Deep-merge into `src/locales/en/common.json`:

```json
{
  "datePicker": {
    "placeholder": "Pick a date",
    "previousMonth": "Go to previous month",
    "nextMonth": "Go to next month",
    "navigation": "Month navigation"
  }
}
```

Deep-merge into `src/locales/es/common.json`:

```json
{
  "datePicker": {
    "placeholder": "Elige una fecha",
    "previousMonth": "Ir al mes anterior",
    "nextMonth": "Ir al mes siguiente",
    "navigation": "Navegación por meses"
  }
}
```

- [ ] **Step 3: Write the failing test `src/components/ui/date-picker.test.tsx`**

```tsx
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { render, screen, within } from '@/test/render';

import { DatePicker } from './date-picker';

describe('DatePicker', () => {
  it('shows the placeholder, then the formatted value', () => {
    const { rerender } = render(<DatePicker value={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Pick a date/ })).toBeInTheDocument();

    rerender(<DatePicker value={new Date(2026, 0, 5)} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Jan 5, 2026/ })).toBeInTheDocument();
  });

  it('picks a day from the calendar and closes', async () => {
    const onChange = vi.fn<(date?: Date) => void>();
    const user = userEvent.setup();
    render(<DatePicker value={new Date(2026, 0, 5)} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Jan 5, 2026/ }));
    const grid = await screen.findByRole('grid');
    await user.click(within(grid).getByText('15'));

    expect(onChange.mock.calls[0]?.[0]?.getDate()).toBe(15);
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('labels the month navigation in the current language', async () => {
    const user = userEvent.setup();
    render(<DatePicker value={new Date(2026, 0, 5)} onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Jan 5, 2026/ }));

    expect(await screen.findByRole('button', { name: 'Go to next month' })).toBeInTheDocument();
  });
});
```

Run: `pnpm exec vitest run src/components/ui/date-picker.test.tsx`
Expected: FAIL, because `./date-picker` is missing.

- [ ] **Step 4: Create `src/components/ui/date-picker.tsx`**

```tsx
import { CalendarIcon } from 'lucide-react';
import { type ComponentProps, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { formatDate, getDateFnsLocale } from '@/lib/format';

import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export type DatePickerProps = Omit<ComponentProps<typeof Button>, 'onChange' | 'value'> & {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
};

/** Popover + Calendar composition (spec §5.3), localised through the UI language. */
export function DatePicker({ value, onChange, placeholder, className, ...buttonProps }: DatePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={value === undefined}
          className={cn(
            'data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal',
            className,
          )}
          {...buttonProps}
        >
          <CalendarIcon aria-hidden="true" />
          {value ? formatDate(value) : <span>{placeholder ?? t('datePicker.placeholder')}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          autoFocus
          locale={getDateFnsLocale()}
          labels={{
            labelNav: () => t('datePicker.navigation'),
            labelPrevious: () => t('datePicker.previousMonth'),
            labelNext: () => t('datePicker.nextMonth'),
          }}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
```

Run: `pnpm exec vitest run src/components/ui/date-picker.test.tsx`
Expected: PASS. If the installed react-day-picker names its `labels` keys differently, check `node_modules/react-day-picker/dist/**/types` and record the change.

- [ ] **Step 5: Create `src/components/ui/date-picker.stories.tsx`**

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { DatePicker } from './date-picker';
import { Label } from './label';

function Demo({ initial }: { initial?: Date }) {
  const [date, setDate] = useState<Date | undefined>(initial);
  return (
    <div className="grid w-72 gap-2">
      <Label htmlFor="due-date">Due date</Label>
      <DatePicker id="due-date" value={date} onChange={setDate} />
    </div>
  );
}

const meta = { title: 'UI/DatePicker', component: Demo } satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithValue: Story = { args: { initial: new Date(2026, 0, 5) } };
```

- [ ] **Step 6: Append to the "UI primitives" section of `docs/design-system.md`**

```markdown
**DatePicker** (`@/components/ui/date-picker`) composes Popover and Calendar (react-day-picker).
- It formats with `formatDate` and localises the calendar through the current UI language.
- Inside a form: wrap it in `<FormControl>` and pass `field.value` / `field.onChange`.
```

- [ ] **Step 7: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm storybook:build`
Expected: all green.

```bash
git add -A
git commit -m "feat(ui): add localised calendar and date picker" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6.6: Complete `docs/i18n.md`

**Files:**
- Modify: `docs/i18n.md`

- [ ] **Step 1: Append these sections to `docs/i18n.md`**

````markdown
## Language detection and switching

Order (spec §7.6):
1. the saved choice (`react-bedrock:locale`)
2. the browser's `navigator.languages`
3. `VITE_DEFAULT_LOCALE`

`<LanguageSwitcher />` in the header calls `changeLocale(locale)`, which switches and persists the language.

On every change:
- `<html lang>` / `dir` update
- the formatters follow
- the HTTP client sends the new `Accept-Language`

## Formatting (`@/lib/format`)

| Helper | Example (en) |
|---|---|
| `formatDate(iso)` | Jan 5, 2026 |
| `formatDateTime(iso)` | Jan 5, 2026, 10:00 AM |
| `formatRelative(iso)` | 3 days ago |
| `formatCurrency(1234.5)` | $1,234.50 (currency from `VITE_DEFAULT_CURRENCY`) |
| `formatNumber(1234567.8)` | 1,234,567.8 |
| `formatPercent(0.256)` | 25.6% |

- All helpers follow the UI language, or take `{ locale }`. Invalid dates format as an empty string.
- Never import `date-fns` directly (ESLint enforces this).
- Call the formatters in components that use `useTranslation()`, so they re-render when the language changes.

## Validation messages

Zod messages are translated through the `validation` namespace (docs/forms.md). For server field errors, `applyServerErrors` translates known codes from `validation:server.<CODE>`.

## Keys built at runtime

Typed `t('…')` covers every key you write in code. For keys that come from data, such as backend error codes, use `translateKey(key)`, which returns `undefined` when no translation exists.

## Missing keys

In development every missing key logs `Missing translation: <ns>:<key>`. The resource test fails when locales have different keys or empty values.

## Adding a language

1. Add the code to `SUPPORTED_LOCALES` in `src/config/constants.ts`.
2. Create `src/locales/<code>/` with a copy of every `en/*.json` file, then translate it.
3. Register it in `src/core/i18n/resources.ts` (`const xx: typeof en = { … }`, then add it to `resources`).
4. Add its date-fns locale to `DATE_FNS_LOCALES` in `src/lib/format.ts`.
5. Add its endonym to `language.names` in every locale's `common.json`.
6. Run `pnpm typecheck && pnpm test`. Missing keys fail both.

Right-to-left languages work automatically: `<html dir>` follows `i18n.dir()`.
````

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "docs(i18n): document detection, formatting, validation and adding languages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Phase 6 gate

- [ ] Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Expected: all green.
- [ ] Manual check:
  1. Run `pnpm storybook`.
  2. With the Locale toolbar set to `es`, the DatePicker, Pagination and Form stories are Spanish.
  3. Submitting the empty Form story shows the Spanish Zod messages (the story's own `error` strings still win for its two fields; that is expected).
- [ ] Post the **Phase 6 report**. Mention that the i18n core came in Task 2.2 and the DatePicker moved here from Phase 2. Then **STOP** until the owner approves.

---

# Phase 7 — Routing & auth

Scope (spec §12, §5.5, §7.1–7.2, §7.7–7.9):
- the router with lazy routes, guards and the paths helper
- `AuthProvider`, the login page, and the 403 / 404 / error pages
- the layouts
- the shared hooks, permissions and feature flags (spec §7.8–7.9 are not assigned to any phase, so they live here)

### Task 7.1: Typed paths, route handles and feature flags

**Files:**
- Create:
  - `src/config/paths.ts`, `src/config/paths.test.ts`
  - `src/config/features.ts`, `src/config/features.test.ts`
  - `src/app/route-handle.ts`
  - `src/hooks/use-feature.ts`, `src/hooks/use-feature.test.tsx`

**Interfaces:**
- Produces:
  - **`paths`.** Each entry is a builder function with a `.pattern` property:
    - `paths.home()`, `paths.login(returnTo?)`, `paths.dashboard()`, `paths.forbidden()`
    - `paths.items.list()`, `.create()`, `.detail(itemId)`, `.edit(itemId)`
    - Patterns are e.g. `paths.items.detail.pattern === '/items/:itemId'`, and they are used only by the router.
  - **`interface RouteHandle { title?: (i18n: i18n) => string }`**, a translated document title per route.
  - **Feature flags:**
    - `FEATURE_FLAGS` (defaults) and `type FeatureFlag`
    - `interface FeatureFlagSource { isEnabled: (flag) => boolean; subscribe: (listener) => () => void }`
    - `createEnvFlagSource(enabled?)`, `setFeatureFlagSource(source)`, `getFeatureFlagSource()`, `isFeatureEnabled(flag)`
    - `useFeature(flag): boolean`

- [ ] **Step 1: Install the router and write the failing tests**

Run: `pnpm add react-router`

`src/config/paths.test.ts`:

```ts
import { matchPath } from 'react-router';
import { describe, expect, it } from 'vitest';

import { paths } from './paths';

describe('paths', () => {
  it('builds links', () => {
    expect(paths.dashboard()).toBe('/dashboard');
    expect(paths.items.detail('a b')).toBe('/items/a%20b');
    expect(paths.items.edit('42')).toBe('/items/42/edit');
    expect(paths.login('/items?page=2')).toBe('/login?returnTo=%2Fitems%3Fpage%3D2');
    expect(paths.login()).toBe('/login');
  });

  it('keeps every builder in sync with its route pattern', () => {
    const cases = [
      [paths.home, paths.home()],
      [paths.login, paths.login()],
      [paths.dashboard, paths.dashboard()],
      [paths.forbidden, paths.forbidden()],
      [paths.items.list, paths.items.list()],
      [paths.items.create, paths.items.create()],
      [paths.items.detail, paths.items.detail('42')],
      [paths.items.edit, paths.items.edit('42')],
    ] as const;
    for (const [builder, built] of cases) {
      expect(matchPath(builder.pattern, built.split('?')[0] ?? built), builder.pattern).not.toBeNull();
    }
  });
});
```

`src/config/features.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';

import {
  createEnvFlagSource,
  getFeatureFlagSource,
  isFeatureEnabled,
  setFeatureFlagSource,
  type FeatureFlagSource,
} from './features';

describe('feature flags', () => {
  const original = getFeatureFlagSource();
  afterEach(() => {
    setFeatureFlagSource(original);
  });

  it('uses the defaults unless VITE_FEATURE_FLAGS enables a flag', () => {
    expect(createEnvFlagSource([]).isEnabled('itemsExport')).toBe(false);
    expect(createEnvFlagSource(['itemsExport']).isEnabled('itemsExport')).toBe(true);
  });

  it('can be backed by another source (e.g. a remote service)', () => {
    const remote: FeatureFlagSource = { isEnabled: () => true, subscribe: () => () => undefined };
    setFeatureFlagSource(remote);
    expect(isFeatureEnabled('itemsExport')).toBe(true);
  });
});
```

`src/hooks/use-feature.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { getFeatureFlagSource, setFeatureFlagSource, type FeatureFlagSource } from '@/config/features';

import { useFeature } from './use-feature';

describe('useFeature', () => {
  const original = getFeatureFlagSource();
  afterEach(() => {
    setFeatureFlagSource(original);
  });

  it('re-renders when a subscribable source changes', () => {
    let enabled = false;
    const listeners = new Set<() => void>();
    const source: FeatureFlagSource = {
      isEnabled: () => enabled,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    setFeatureFlagSource(source);

    const { result } = renderHook(() => useFeature('itemsExport'));
    expect(result.current).toBe(false);

    act(() => {
      enabled = true;
      listeners.forEach((listener) => {
        listener();
      });
    });
    expect(result.current).toBe(true);
  });
});
```

Run: `pnpm exec vitest run src/config src/hooks`
Expected: FAIL, because the modules are missing.

- [ ] **Step 2: Create `src/config/paths.ts`**

```ts
/** A path builder that also carries its route pattern (for the router only). */
function route<const Pattern extends string, Args extends unknown[]>(
  pattern: Pattern,
  build: (...args: Args) => string,
) {
  return Object.assign(build, { pattern });
}

const segment = (value: string) => encodeURIComponent(value);

/**
 * Every route in one place (spec §7.1). Links use the builders, never raw strings:
 *   <Link to={paths.items.detail(id)}>
 * `.pattern` (with :params) is for src/app/router.tsx.
 */
export const paths = {
  home: route('/', () => '/'),
  login: route('/login', (returnTo?: string) =>
    returnTo ? `/login?${new URLSearchParams({ returnTo }).toString()}` : '/login',
  ),
  dashboard: route('/dashboard', () => '/dashboard'),
  forbidden: route('/403', () => '/403'),
  items: {
    list: route('/items', () => '/items'),
    create: route('/items/new', () => '/items/new'),
    detail: route('/items/:itemId', (itemId: string) => `/items/${segment(itemId)}`),
    edit: route('/items/:itemId/edit', (itemId: string) => `/items/${segment(itemId)}/edit`),
  },
  // plop:paths
};
```

- [ ] **Step 3: Create `src/config/features.ts`**

```ts
import { env } from './env';

/**
 * Every feature flag and its default (spec §7.9).
 * Turn flags on with VITE_FEATURE_FLAGS="itemsExport,otherFlag", at build time or at container start.
 */
export const FEATURE_FLAGS = {
  /** Shows "Export CSV" on the items list. */
  itemsExport: false,
} satisfies Record<string, boolean>;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/** Where flag values come from. Swap the env source for a remote one without touching callers. */
export interface FeatureFlagSource {
  isEnabled: (flag: FeatureFlag) => boolean;
  /** For live sources: call `listener` whenever any flag changes; returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
}

export function createEnvFlagSource(enabled: readonly string[] = env.VITE_FEATURE_FLAGS): FeatureFlagSource {
  const on = new Set(enabled);
  return {
    isEnabled: (flag) => on.has(flag) || FEATURE_FLAGS[flag],
    subscribe: () => () => undefined, // env flags never change at runtime
  };
}

let source: FeatureFlagSource = createEnvFlagSource();

export function setFeatureFlagSource(next: FeatureFlagSource): void {
  source = next;
}

export function getFeatureFlagSource(): FeatureFlagSource {
  return source;
}

/** Non-React access (e.g. in route definitions). In components, use `useFeature(flag)`. */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return source.isEnabled(flag);
}
```

- [ ] **Step 4: Create `src/hooks/use-feature.ts`**

```ts
import { useSyncExternalStore } from 'react';

import { type FeatureFlag, getFeatureFlagSource } from '@/config/features';

/** Whether a feature flag is on; re-renders if a live flag source changes (spec §7.9). */
export function useFeature(flag: FeatureFlag): boolean {
  const source = getFeatureFlagSource();
  return useSyncExternalStore(source.subscribe, () => source.isEnabled(flag));
}
```

- [ ] **Step 5: Create `src/app/route-handle.ts`**

```ts
import type { i18n as I18n } from 'i18next';

/**
 * Static data attached to a route (`handle` in src/app/router.tsx).
 * `title` receives the i18next instance, so it can use any namespace:
 *   handle: { title: (i18n) => i18n.t('items:list.title') } satisfies RouteHandle
 */
export interface RouteHandle {
  title?: (i18n: I18n) => string;
}
```

- [ ] **Step 6: Run the tests to confirm they pass, then commit**

Run: `pnpm exec vitest run src/config src/hooks`
Expected: PASS.

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(config): add typed path builders and feature flags" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7.2: Shared hooks (not router-bound) and OfflineBanner (spec §7.8)

**Files:**
- Create:
  - `src/hooks/use-debounce.ts`, `use-disclosure.ts`, `use-media-query.ts`, `use-copy-to-clipboard.ts`, `use-online-status.ts`, `use-document-title.ts`
  - a `.test.ts(x)` beside each hook
  - `src/components/feedback/offline-banner.tsx`, `offline-banner.test.tsx`
- Modify: `src/components/feedback/index.ts`, `src/locales/{en,es}/common.json`

**Interfaces:**
- Produces:
  - `useDebounce<T>(value: T, delayMs = 300): T`
  - `useDisclosure(initial = false): { isOpen, open, close, toggle, setOpen }`
  - `useMediaQuery(query: string): boolean`
  - `useCopyToClipboard(resetMs = 2000): { copied: boolean; copy: (text: string) => Promise<boolean> }`
  - `useOnlineStatus(): boolean`
  - `useDocumentTitle(title?: string)`, which sets `"<title> · <VITE_APP_NAME>"`
  - `<OfflineBanner />`

- [ ] **Step 1: Add the translations**

Deep-merge into `src/locales/en/common.json`:

```json
{ "status": { "offline": "You are offline. Changes can't be saved until your connection is back." } }
```

Deep-merge into `src/locales/es/common.json`:

```json
{ "status": { "offline": "No tienes conexión. Los cambios no se podrán guardar hasta que vuelva." } }
```

- [ ] **Step 2: Write the failing tests**

`src/hooks/use-debounce.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebounce } from './use-debounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('only updates after the value has been stable for the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('ab');
  });
});
```

`src/hooks/use-disclosure.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDisclosure } from './use-disclosure';

describe('useDisclosure', () => {
  it('opens, closes and toggles', () => {
    const { result } = renderHook(() => useDisclosure());
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.setOpen(true);
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });
});
```

`src/hooks/use-media-query.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMediaQuery } from './use-media-query';

describe('useMediaQuery', () => {
  it('reflects the query and follows changes', () => {
    let matches = false;
    const listeners = new Set<() => void>();
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          media: query,
          get matches() {
            return matches;
          },
          addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
          removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
        }) as unknown as MediaQueryList,
    );

    const { result } = renderHook(() => useMediaQuery('(min-width: 48rem)'));
    expect(result.current).toBe(false);

    act(() => {
      matches = true;
      listeners.forEach((listener) => {
        listener();
      });
    });
    expect(result.current).toBe(true);
  });
});
```

`src/hooks/use-copy-to-clipboard.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCopyToClipboard } from './use-copy-to-clipboard';

describe('useCopyToClipboard', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('copies text and resets the copied flag after a while', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { result } = renderHook(() => useCopyToClipboard(1_000));

    await act(async () => {
      expect(await result.current.copy('item-42')).toBe(true);
    });
    expect(writeText).toHaveBeenCalledWith('item-42');
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.copied).toBe(false);
  });

  it('reports failure when the clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      expect(await result.current.copy('x')).toBe(false);
    });
    expect(result.current.copied).toBe(false);
  });
});
```

`src/hooks/use-online-status.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useOnlineStatus } from './use-online-status';

describe('useOnlineStatus', () => {
  it('follows the browser online and offline events', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      onLine.mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);
  });
});
```

`src/hooks/use-document-title.test.ts`:

```ts
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDocumentTitle } from './use-document-title';

describe('useDocumentTitle', () => {
  it('sets "<title> · <app name>", or just the app name', () => {
    const { rerender } = renderHook(({ title }: { title?: string }) => {
      useDocumentTitle(title);
    }, { initialProps: { title: 'Items' } });
    expect(document.title).toBe('Items · React Bedrock');

    rerender({ title: undefined });
    expect(document.title).toBe('React Bedrock');
  });
});
```

`src/components/feedback/offline-banner.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OfflineBanner } from './offline-banner';

describe('OfflineBanner', () => {
  it('appears only while offline', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => {
      onLine.mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent('You are offline');
  });
});
```

Run: `pnpm exec vitest run src/hooks src/components/feedback/offline-banner.test.tsx`
Expected: FAIL, because the modules are missing.

- [ ] **Step 3: Create the hooks**

`src/hooks/use-debounce.ts`:

```ts
import { useEffect, useState } from 'react';

/** The latest `value` once it has stopped changing for `delayMs` (e.g. search-as-you-type). */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}
```

`src/hooks/use-disclosure.ts`:

```ts
import { useCallback, useState } from 'react';

/** Open/closed state for dialogs, sheets, popovers and menus. */
export function useDisclosure(initial = false) {
  const [isOpen, setOpen] = useState(initial);
  const open = useCallback(() => {
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
  }, []);
  const toggle = useCallback(() => {
    setOpen((value) => !value);
  }, []);
  return { isOpen, open, close, toggle, setOpen };
}
```

`src/hooks/use-media-query.ts`:

```ts
import { useCallback, useSyncExternalStore } from 'react';

/** Whether a CSS media query matches, e.g. `useMediaQuery('(min-width: 48rem)')`. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => {
        media.removeEventListener('change', onChange);
      };
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
```

`src/hooks/use-copy-to-clipboard.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

/** Copies text to the clipboard; `copied` stays true for `resetMs` (for a "Copied" hint). */
export function useCopyToClipboard(resetMs = 2_000) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      const clipboard = (navigator as Partial<Navigator>).clipboard;
      if (!clipboard) return false;
      try {
        await clipboard.writeText(text);
      } catch {
        return false;
      }
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        setCopied(false);
      }, resetMs);
      return true;
    },
    [resetMs],
  );

  return { copied, copy };
}
```

`src/hooks/use-online-status.ts`:

```ts
import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** Whether the browser believes it is online. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine);
}
```

`src/hooks/use-document-title.ts`:

```ts
import { useEffect } from 'react';

import { env } from '@/config/env';

/** Sets the tab title to "<title> · <app name>" (spec §7.1). The root layout calls it with the route's title. */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} · ${env.VITE_APP_NAME}` : env.VITE_APP_NAME;
  }, [title]);
}
```

- [ ] **Step 4: Create `src/components/feedback/offline-banner.tsx`**

```tsx
import { WifiOffIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useOnlineStatus } from '@/hooks/use-online-status';

/** Shown under the header while the browser is offline (spec §7.8). */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const { t } = useTranslation();
  if (online) return null;

  return (
    <div
      role="status"
      className="bg-warning text-warning-foreground flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium"
    >
      <WifiOffIcon aria-hidden="true" className="size-4" />
      {t('status.offline')}
    </div>
  );
}
```

Append to `src/components/feedback/index.ts`:

```ts
export { OfflineBanner } from './offline-banner';
```

Run: `pnpm exec vitest run src/hooks src/components/feedback`
Expected: PASS.

- [ ] **Step 5: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(hooks): add debounce, disclosure, media query, clipboard, online status and document title hooks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7.3: Mock auth API and the cookie-session `AuthStrategy` (spec §7.2)

**Files:**
- Create:
  - `src/mocks/db.ts`, `src/mocks/fixtures/users.ts`, `src/mocks/handlers/auth.ts`
  - `src/core/auth/types.ts`, `cookie-strategy.ts`, `cookie-strategy.test.ts`, `strategy.ts`
- Modify: `src/mocks/handlers.ts`, `src/test/setup.ts`, `src/locales/{en,es}/errors.json`

**Interfaces:**
- Produces:
  - **Mock API:**
    - `POST /auth/login` returns 200 with the user and sets the `mock_session` cookie. Wrong credentials get 401 `{ code: 'INVALID_CREDENTIALS' }`.
    - `POST /auth/logout` returns 204.
    - `GET /auth/me` returns 200 with the user, or 401.
    - `POST /auth/refresh` returns 204, or 401.
    - The current session comes from the `mock_session` cookie in the browser, or `mockDb.sessionUserId` in jsdom.
  - `MOCK_USERS`, `MOCK_USER_IDS = { admin, viewer }`, `type MockUserKey`, `DEMO_EMAILS`, `DEMO_PASSWORD`, `mockDb`, `resetMockDb()`
  - `interface LoginCredentials { email; password }`
  - `interface AuthStrategy { login; logout; fetchCurrentUser; refresh; prepareRequest }`
  - `cookieSessionStrategy`, and `authStrategy` (in `strategy.ts`: **the one file to change when switching strategies**)

- [ ] **Step 1: Add the error translation**

Deep-merge into `src/locales/en/errors.json`:

```json
{ "codes": { "INVALID_CREDENTIALS": "Incorrect email or password." } }
```

Deep-merge into `src/locales/es/errors.json`:

```json
{ "codes": { "INVALID_CREDENTIALS": "Correo electrónico o contraseña incorrectos." } }
```

- [ ] **Step 2: Create the mock backend state and fixtures**

`src/mocks/db.ts`:

```ts
/**
 * In-memory state of the mock backend. It resets on page reload (the browser keeps the session through
 * the mock cookie) and after every test (src/test/setup.ts calls resetMockDb).
 */
export const mockDb: { sessionUserId: string | null } = { sessionUserId: null };

export function resetMockDb(): void {
  mockDb.sessionUserId = null;
}
```

`src/mocks/fixtures/users.ts`:

```ts
import type { SessionUser } from '@/stores/session-store';

export interface MockUser extends SessionUser {
  password: string;
}

/** Password of every demo account. Mock API only; the login page shows it when mocks are on. */
export const DEMO_PASSWORD = 'demo1234';

export const MOCK_USER_IDS = { admin: 'user-admin', viewer: 'user-viewer' } as const;
export type MockUserKey = keyof typeof MOCK_USER_IDS;

/** Demo sign-in emails (the login page shows them when mocks are on). */
export const DEMO_EMAILS = { admin: 'admin@example.com', viewer: 'viewer@example.com' } as const;

/** Demo accounts: one with every permission, one read-only (to show permission checks). */
export const MOCK_USERS: readonly MockUser[] = [
  {
    id: MOCK_USER_IDS.admin,
    name: 'Alex Admin',
    email: DEMO_EMAILS.admin,
    password: DEMO_PASSWORD,
    permissions: ['items.read', 'items.create', 'items.update', 'items.delete'],
  },
  {
    id: MOCK_USER_IDS.viewer,
    name: 'Vic Viewer',
    email: DEMO_EMAILS.viewer,
    password: DEMO_PASSWORD,
    permissions: ['items.read'],
  },
];
```

- [ ] **Step 3: Create `src/mocks/handlers/auth.ts`**

```ts
import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';

import { apiUrl } from '../api-url';
import { mockDb } from '../db';
import { MOCK_USERS, type MockUser } from '../fixtures/users';

/** The mock session cookie. Real backends use an httpOnly cookie that JavaScript can't read. */
export const MOCK_SESSION_COOKIE = 'mock_session';

const credentialsSchema = z.object({ email: z.string(), password: z.string() });

const publicUser = ({ id, name, email, permissions }: MockUser) => ({ id, name, email, permissions });

function currentUser(cookies: Record<string, string>): MockUser | undefined {
  const id = cookies[MOCK_SESSION_COOKIE] ?? mockDb.sessionUserId;
  return MOCK_USERS.find((user) => user.id === id);
}

export const authHandlers = [
  http.post(apiUrl('/auth/login'), async ({ request }) => {
    await delay();
    const credentials = credentialsSchema.safeParse(await request.json());
    const user = credentials.success
      ? MOCK_USERS.find(
          (candidate) =>
            candidate.email === credentials.data.email.trim().toLowerCase() &&
            candidate.password === credentials.data.password,
        )
      : undefined;
    if (!user) return HttpResponse.json({ code: 'INVALID_CREDENTIALS' }, { status: 401 });

    mockDb.sessionUserId = user.id;
    return HttpResponse.json(publicUser(user), {
      headers: { 'Set-Cookie': `${MOCK_SESSION_COOKIE}=${user.id}; Path=/; SameSite=Lax` },
    });
  }),

  http.post(apiUrl('/auth/logout'), async () => {
    await delay();
    mockDb.sessionUserId = null;
    return new HttpResponse(null, {
      status: 204,
      headers: { 'Set-Cookie': `${MOCK_SESSION_COOKIE}=; Path=/; Max-Age=0` },
    });
  }),

  http.get(apiUrl('/auth/me'), async ({ cookies }) => {
    await delay();
    const user = currentUser(cookies);
    return user
      ? HttpResponse.json(publicUser(user))
      : HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }),

  http.post(apiUrl('/auth/refresh'), async ({ cookies }) => {
    await delay();
    return currentUser(cookies)
      ? new HttpResponse(null, { status: 204 })
      : HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  }),
];
```

- [ ] **Step 4: Register the handlers and reset the mock DB**

Replace `src/mocks/handlers.ts`:

```ts
import type { HttpHandler } from 'msw';

import { authHandlers } from './handlers/auth';

/**
 * Every mock API handler, shared by the browser worker (dev and the Docker demo) and the test server.
 * Features append theirs here; `pnpm gen feature` does it automatically.
 */
export const handlers: HttpHandler[] = [
  ...authHandlers,
  // plop:handlers
];
```

Then in `src/test/setup.ts`, add `import { resetMockDb } from '@/mocks/db';` to the internal imports, and add `resetMockDb();` inside `afterEach`, right after `server.resetHandlers();`.

- [ ] **Step 5: Write the failing test `src/core/auth/cookie-strategy.test.ts`**

```ts
import { http as mock, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiUrl } from '@/mocks/api-url';
import { mockDb } from '@/mocks/db';
import { DEMO_PASSWORD, MOCK_USER_IDS } from '@/mocks/fixtures/users';
import { server } from '@/mocks/server';

import { cookieSessionStrategy } from './cookie-strategy';

describe('cookieSessionStrategy', () => {
  it('logs in and returns the validated user', async () => {
    const user = await cookieSessionStrategy.login({ email: 'admin@example.com', password: DEMO_PASSWORD });
    expect(user).toMatchObject({ id: 'user-admin', permissions: expect.arrayContaining(['items.create']) as unknown });
  });

  it('rejects wrong credentials with a normalised AppError', async () => {
    await expect(
      cookieSessionStrategy.login({ email: 'admin@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
  });

  it('returns null from fetchCurrentUser when nobody is signed in', async () => {
    await expect(cookieSessionStrategy.fetchCurrentUser()).resolves.toBeNull();
  });

  it('returns the signed-in user', async () => {
    mockDb.sessionUserId = MOCK_USER_IDS.viewer;
    await expect(cookieSessionStrategy.fetchCurrentUser()).resolves.toMatchObject({
      id: 'user-viewer',
      permissions: ['items.read'],
    });
  });

  it('drops permissions the frontend does not know about', async () => {
    server.use(
      mock.get(apiUrl('/auth/me'), () =>
        HttpResponse.json({ id: 'x', name: 'X', email: 'x@example.com', permissions: ['items.read', 'reports.export'] }),
      ),
    );
    await expect(cookieSessionStrategy.fetchCurrentUser()).resolves.toMatchObject({ permissions: ['items.read'] });
  });

  it('asks the browser to send the session cookie with every request', () => {
    type Config = Parameters<typeof cookieSessionStrategy.prepareRequest>[0];
    const config = cookieSessionStrategy.prepareRequest({ headers: {} } as unknown as Config);
    expect(config.withCredentials).toBe(true);
  });
});
```

Run: `pnpm exec vitest run src/core/auth`
Expected: FAIL, because `./cookie-strategy` is missing.

- [ ] **Step 6: Create `src/core/auth/types.ts`**

```ts
import type { HttpAuthAdapter } from '@/core/api';
import type { SessionUser } from '@/stores/session-store';

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * How the app authenticates (spec §7.2). Switching (e.g. to bearer tokens) means writing a new
 * implementation and changing the single export in strategy.ts. Nothing else changes.
 */
export interface AuthStrategy {
  /** Signs in and returns the user. Rejects with an AppError (401 = wrong credentials). */
  login: (credentials: LoginCredentials) => Promise<SessionUser>;
  logout: () => Promise<void>;
  /** The current user, or null when nobody is signed in. */
  fetchCurrentUser: () => Promise<SessionUser | null>;
  /** Renews the session after a 401 (called by the HTTP layer, once for concurrent requests). */
  refresh: () => Promise<void>;
  /** Adds credentials to every API request. */
  prepareRequest: HttpAuthAdapter['prepareRequest'];
}
```

- [ ] **Step 7: Create `src/core/auth/cookie-strategy.ts`**

```ts
import { z } from 'zod';

import { type Permission, PERMISSIONS } from '@/config/permissions';
import { http, isAppError } from '@/core/api';
import type { SessionUser } from '@/stores/session-store';

import type { AuthStrategy } from './types';

const isPermission = (value: string): value is Permission =>
  (PERMISSIONS as readonly string[]).includes(value);

/** Validates the user at the boundary (spec Principle 6). Unknown permissions are ignored, not fatal. */
const sessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  permissions: z.array(z.string()).transform((list) => list.filter(isPermission)),
});

const toSessionUser = (data: unknown): SessionUser => sessionUserSchema.parse(data);

/**
 * httpOnly-cookie session (owner decision 1): the server sets the session cookie and the browser
 * attaches it. The frontend never sees a token.
 */
export const cookieSessionStrategy: AuthStrategy = {
  async login(credentials) {
    const { data } = await http.post<unknown>('/auth/login', credentials, {
      skipAuthRefresh: true,
      silent: true,
    });
    return toSessionUser(data);
  },

  async logout() {
    await http.post('/auth/logout', undefined, { skipAuthRefresh: true, silent: true });
  },

  async fetchCurrentUser() {
    try {
      const { data } = await http.get<unknown>('/auth/me', { silent: true });
      return toSessionUser(data);
    } catch (error) {
      if (isAppError(error) && error.status === 401) return null;
      throw error;
    }
  },

  async refresh() {
    await http.post('/auth/refresh', undefined, { skipAuthRefresh: true, silent: true });
  },

  prepareRequest(config) {
    // Needed for a cross-origin API; harmless on the same-origin /api proxy.
    config.withCredentials = true;
    return config;
  },
};
```

- [ ] **Step 8: Create `src/core/auth/strategy.ts`**

```ts
import { cookieSessionStrategy } from './cookie-strategy';
import type { AuthStrategy } from './types';

/**
 * The active authentication strategy: the ONE line to change when switching (docs/auth.md).
 * The template ships the httpOnly-cookie session strategy (owner decision 1).
 */
export const authStrategy: AuthStrategy = cookieSessionStrategy;
```

Run: `pnpm exec vitest run src/core/auth`
Expected: PASS (6 tests).

- [ ] **Step 9: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(auth): add cookie session strategy and mock auth api" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7.4: AuthProvider, guards, `<Can>` and the router-aware test `render` (spec §7.1–7.2, §7.9)

**Files:**
- Create:
  - `src/core/auth/auth-context.ts`, `use-auth.ts`, `auth-provider.tsx`, `guards.tsx`, `can.tsx`, `return-to.ts`, `index.ts`
  - tests: `src/core/auth/auth-provider.test.tsx`, `guards.test.tsx`, `return-to.test.ts`
  - `src/components/feedback/forbidden-state.tsx`, `not-found-state.tsx`
- Modify: `src/components/feedback/index.ts`, `src/test/render.tsx`, `src/locales/{en,es}/common.json`

**Interfaces:**
- Consumes: `authStrategy`, `registerHttpAuth`, the session store, `logger.setUser`, `sessionStore`, `useQueryClient`.
- Produces:
  - `<AuthProvider strategy?>`. It shows a full-page loader until `/auth/me` settles.
  - `useAuth(): { user, isAuthenticated, isLoading, login(credentials), logout(), hasPermission(permission) }`
  - `<RequireAuth>`: redirects to `paths.login(returnTo)`
  - `<RequireGuest>`: redirects signed-in users to a safe `returnTo`, or the dashboard
  - `<RequirePermission permission>`: renders `<ForbiddenState />` without the permission
  - `<Can permission fallback?>`
  - `safeReturnTo(value)`
  - `ForbiddenState`, `NotFoundState`
  - **`@/test/render` options:** `{ route?, path?, routes?, auth?: 'admin' | 'viewer' | 'anonymous', queryClient? }`. It returns `{ router, queryClient, … }`. The UI is mounted inside a memory data router, so `useBlocker`, `useParams` and `Link` all work.

- [ ] **Step 1: Add the translations**

Deep-merge into `src/locales/en/common.json`:

```json
{
  "actions": { "backToDashboard": "Back to dashboard" },
  "states": {
    "forbidden": {
      "title": "You don't have access to this page",
      "description": "Ask an administrator for the permission you need."
    },
    "notFound": {
      "title": "We couldn't find that page",
      "description": "Check the address, or go back to the dashboard."
    }
  }
}
```

Deep-merge into `src/locales/es/common.json`:

```json
{
  "actions": { "backToDashboard": "Volver al panel" },
  "states": {
    "forbidden": {
      "title": "No tienes acceso a esta página",
      "description": "Pide a un administrador el permiso que necesitas."
    },
    "notFound": {
      "title": "No encontramos esa página",
      "description": "Revisa la dirección o vuelve al panel."
    }
  }
}
```

- [ ] **Step 2: Create the 403 and 404 states**

`src/components/feedback/forbidden-state.tsx`:

```tsx
import { ShieldXIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';

import { EmptyState } from './empty-state';

/** "No permission" view, used by <RequirePermission> and the /403 page (spec §7.1). */
export function ForbiddenState() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={ShieldXIcon}
      title={t('states.forbidden.title')}
      description={t('states.forbidden.description')}
      action={
        <Button asChild variant="outline">
          <Link to={paths.dashboard()}>{t('actions.backToDashboard')}</Link>
        </Button>
      }
    />
  );
}
```

`src/components/feedback/not-found-state.tsx`:

```tsx
import { SearchXIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';

import { EmptyState } from './empty-state';

interface NotFoundStateProps {
  title?: string;
  description?: string;
}

/** "Not found" view, used by the 404 page and by detail pages whose record doesn't exist. */
export function NotFoundState({ title, description }: NotFoundStateProps) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={SearchXIcon}
      title={title ?? t('states.notFound.title')}
      description={description ?? t('states.notFound.description')}
      action={
        <Button asChild variant="outline">
          <Link to={paths.dashboard()}>{t('actions.backToDashboard')}</Link>
        </Button>
      }
    />
  );
}
```

Append to `src/components/feedback/index.ts`:

```ts
export { ForbiddenState } from './forbidden-state';
export { NotFoundState } from './not-found-state';
```

- [ ] **Step 3: Create the auth context, hook and return-to helper**

`src/core/auth/auth-context.ts`:

```ts
import { createContext } from 'react';

import type { Permission } from '@/config/permissions';
import type { SessionUser } from '@/stores/session-store';

import type { LoginCredentials } from './types';

export interface AuthContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  /** True until the bootstrap `/auth/me` call settles. */
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<SessionUser>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
```

`src/core/auth/use-auth.ts`:

```ts
import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from './auth-context';

/** Current user, auth status and actions (spec §7.2). */
export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider> (see src/app/providers.tsx)');
  return auth;
}
```

`src/core/auth/return-to.ts`:

```ts
import { paths } from '@/config/paths';

/**
 * Only same-origin, relative paths may be used as post-login destinations (prevents open redirects).
 * "//evil.example" and "/\evil.example" are protocol-relative tricks and are rejected.
 */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return paths.dashboard();
  }
  return value;
}
```

- [ ] **Step 4: Create `src/core/auth/auth-provider.tsx`**

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useMemo } from 'react';

import { PageLoader } from '@/components/feedback';
import type { Permission } from '@/config/permissions';
import { registerHttpAuth } from '@/core/api';
import { logger } from '@/core/logger';
import { sessionStore } from '@/core/storage';
import { useSessionStatus, useSessionStore, useSessionUser } from '@/stores/session-store';

import { AuthContext, type AuthContextValue } from './auth-context';
import { authStrategy } from './strategy';
import type { AuthStrategy, LoginCredentials } from './types';

interface AuthProviderProps {
  children: ReactNode;
  /** Defaults to the app's strategy; tests and stories can pass another. */
  strategy?: AuthStrategy;
}

/** Owns the session (spec §7.2): bootstraps it, wires the HTTP layer, logs in and out. */
export function AuthProvider({ children, strategy = authStrategy }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const user = useSessionUser();
  const status = useSessionStatus();

  // Everything tied to the signed-in user goes when the session ends.
  const endSession = useCallback(() => {
    useSessionStore.getState().clear();
    queryClient.clear();
    sessionStore.clear();
    logger.setUser(null);
  }, [queryClient]);

  useEffect(
    () =>
      registerHttpAuth({
        prepareRequest: strategy.prepareRequest,
        refresh: strategy.refresh,
        onSessionExpired: endSession,
      }),
    [strategy, endSession],
  );

  // Bootstrap: is somebody already signed in (the session cookie survives reloads)?
  useEffect(() => {
    let cancelled = false;
    strategy
      .fetchCurrentUser()
      .then((current) => {
        if (cancelled) return;
        if (current) {
          useSessionStore.getState().setUser(current);
          logger.setUser(current.id);
        } else {
          useSessionStore.getState().clear();
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        logger.error('Could not restore the session', { error });
        useSessionStore.getState().clear();
      });
    return () => {
      cancelled = true;
    };
  }, [strategy]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const signedIn = await strategy.login(credentials);
      queryClient.clear(); // nothing cached from a previous user may leak into this session
      useSessionStore.getState().setUser(signedIn);
      logger.setUser(signedIn.id);
      return signedIn;
    },
    [strategy, queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await strategy.logout();
    } finally {
      endSession();
    }
  }, [strategy, endSession]);

  const hasPermission = useCallback(
    (permission: Permission) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'unknown',
      login,
      logout,
      hasPermission,
    }),
    [user, status, login, logout, hasPermission],
  );

  if (status === 'unknown') return <PageLoader variant="page" />;
  return <AuthContext value={value}>{children}</AuthContext>;
}
```

- [ ] **Step 5: Create the guards and `<Can>`**

`src/core/auth/guards.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';

import { ForbiddenState } from '@/components/feedback';
import type { Permission } from '@/config/permissions';
import { paths } from '@/config/paths';

import { safeReturnTo } from './return-to';
import { useAuth } from './use-auth';

/** Sends signed-out users to login, and back here afterwards (spec §7.1). */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={paths.login(returnTo)} replace />;
  }
  return children ?? <Outlet />;
}

/** Sends signed-in users away from login and similar pages. */
export function RequireGuest({ children }: { children?: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  if (isAuthenticated) return <Navigate to={safeReturnTo(searchParams.get('returnTo'))} replace />;
  return children ?? <Outlet />;
}

/** Renders a 403 view when the user lacks `permission`. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children?: ReactNode;
}) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return <ForbiddenState />;
  return children ?? <Outlet />;
}
```

`src/core/auth/can.tsx`:

```tsx
import type { ReactNode } from 'react';

import type { Permission } from '@/config/permissions';

import { useAuth } from './use-auth';

interface CanProps {
  permission: Permission;
  children: ReactNode;
  /** Rendered when the permission is missing (default: nothing). */
  fallback?: ReactNode;
}

/** Conditional rendering by permission: <Can permission="items.create"><CreateButton /></Can> (spec §7.9). */
export function Can({ permission, children, fallback = null }: CanProps) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? children : fallback;
}
```

`src/core/auth/index.ts`:

```ts
export type { AuthContextValue } from './auth-context';
export { AuthProvider } from './auth-provider';
export { Can } from './can';
export { cookieSessionStrategy } from './cookie-strategy';
export { RequireAuth, RequireGuest, RequirePermission } from './guards';
export { safeReturnTo } from './return-to';
export { authStrategy } from './strategy';
export type { AuthStrategy, LoginCredentials } from './types';
export { useAuth } from './use-auth';
```

- [ ] **Step 6: Mount the UI inside a data router, with optional auth (replace `src/test/render.tsx`)**

```tsx
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  render as rtlRender,
  renderHook as rtlRenderHook,
  type RenderHookOptions,
  type RenderOptions,
} from '@testing-library/react';
import { createContext, type ReactElement, type ReactNode, use } from 'react';
import { createMemoryRouter, type RouteObject, RouterProvider } from 'react-router';

import { createQueryClient } from '@/core/api';
import { AuthProvider } from '@/core/auth';
import { ConfirmProvider } from '@/core/notify';
import { mockDb } from '@/mocks/db';
import { MOCK_USER_IDS, type MockUserKey } from '@/mocks/fixtures/users';

export {
  act,
  fireEvent,
  screen,
  waitFor,
  waitForElementToBeRemoval,
  within,
} from '@testing-library/react';

/** The app's QueryClient configuration, with retries off and no garbage collection during a test. */
export function createTestQueryClient(): QueryClient {
  const client = createQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    queries: { ...defaults.queries, retry: false, gcTime: Infinity },
    mutations: { ...defaults.mutations, retry: false },
  });
  return client;
}

export interface TestOptions {
  queryClient?: QueryClient;
  /** Initial URL (default '/'). */
  route?: string;
  /** Route pattern the UI is mounted at, so `useParams` works (default '*'). */
  path?: string;
  /** Extra routes, e.g. a login page to assert a redirect. */
  routes?: RouteObject[];
  /**
   * Wraps the UI in AuthProvider. 'admin' / 'viewer' sign a mock user in first; 'anonymous' starts
   * signed out. The first frame is then the bootstrap loader, so use `findBy…` queries.
   */
  auth?: MockUserKey | 'anonymous';
}

// The rendered UI travels through context, so RTL's rerender(newUi) keeps the same router.
const UiContext = createContext<ReactNode>(null);
function UiOutlet() {
  return use(UiContext);
}

function setup({ queryClient = createTestQueryClient(), route = '/', path = '*', routes = [], auth }: TestOptions) {
  if (auth && auth !== 'anonymous') mockDb.sessionUserId = MOCK_USER_IDS[auth];
  const router = createMemoryRouter([{ path, element: <UiOutlet /> }, ...routes], {
    initialEntries: [route],
  });

  function Providers({ children }: { children: ReactNode }) {
    const app = (
      <UiContext value={children}>
        <RouterProvider router={router} />
      </UiContext>
    );
    return (
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>{auth ? <AuthProvider>{app}</AuthProvider> : app}</ConfirmProvider>
      </QueryClientProvider>
    );
  }

  return { queryClient, router, Providers };
}

/** Renders `ui` inside the app providers and a memory data router (spec §10.2). */
export function render(
  ui: ReactElement,
  { queryClient, route, path, routes, auth, ...options }: TestOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  const context = setup({ queryClient, route, path, routes, auth });
  return {
    queryClient: context.queryClient,
    router: context.router,
    ...rtlRender(ui, { wrapper: context.Providers, ...options }),
  };
}

export function renderHook<Result, Props>(
  callback: (props: Props) => Result,
  {
    queryClient,
    route,
    path,
    routes,
    auth,
    ...options
  }: TestOptions & Omit<RenderHookOptions<Props>, 'wrapper'> = {},
) {
  const context = setup({ queryClient, route, path, routes, auth });
  return {
    queryClient: context.queryClient,
    router: context.router,
    ...rtlRenderHook(callback, { wrapper: context.Providers, ...options }),
  };
}
```

Run: `pnpm test`
Expected: every existing test still passes, because rendering inside a memory router is synchronous.

- [ ] **Step 7: Write the failing tests**

`src/core/auth/return-to.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { safeReturnTo } from './return-to';

describe('safeReturnTo', () => {
  it.each([
    ['/items?page=2', '/items?page=2'],
    ['//evil.example', '/dashboard'],
    ['/\\evil.example', '/dashboard'],
    ['https://evil.example', '/dashboard'],
    [null, '/dashboard'],
  ])('%j → %j', (input, expected) => {
    expect(safeReturnTo(input)).toBe(expected);
  });
});
```

`src/core/auth/auth-provider.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { http as mock, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { http } from '@/core/api';
import { sessionStore, STORAGE_KEYS } from '@/core/storage';
import { apiUrl } from '@/mocks/api-url';
import { DEMO_PASSWORD } from '@/mocks/fixtures/users';
import { server } from '@/mocks/server';
import { render, screen } from '@/test/render';

import { useAuth } from './use-auth';

function Probe() {
  const { user, isAuthenticated, hasPermission, login, logout } = useAuth();
  return (
    <div>
      <p>{isAuthenticated ? `Signed in as ${user?.name ?? ''}` : 'Signed out'}</p>
      <p>{hasPermission('items.create') ? 'can create' : 'cannot create'}</p>
      <button
        type="button"
        onClick={() => {
          void login({ email: 'viewer@example.com', password: DEMO_PASSWORD });
        }}
      >
        Log in as viewer
      </button>
      <button
        type="button"
        onClick={() => {
          void logout();
        }}
      >
        Log out
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  it('restores the session from /auth/me', async () => {
    render(<Probe />, { auth: 'admin' });
    expect(await screen.findByText('Signed in as Alex Admin')).toBeInTheDocument();
    expect(screen.getByText('can create')).toBeInTheDocument();
  });

  it('logs in and out, clearing cached data and session storage', async () => {
    const user = userEvent.setup();
    const { queryClient } = render(<Probe />, { auth: 'anonymous' });

    await user.click(await screen.findByRole('button', { name: 'Log in as viewer' }));
    expect(await screen.findByText('Signed in as Vic Viewer')).toBeInTheDocument();
    expect(screen.getByText('cannot create')).toBeInTheDocument();

    queryClient.setQueryData(['private'], 'secret');
    sessionStore.set(STORAGE_KEYS.ui, 'draft');
    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(queryClient.getQueryData(['private'])).toBeUndefined();
    expect(sessionStore.get(STORAGE_KEYS.ui)).toBeNull();
  });

  it('ends the session when a refresh after a 401 fails', async () => {
    render(<Probe />, { auth: 'admin' });
    await screen.findByText('Signed in as Alex Admin');
    server.use(
      mock.get(apiUrl('/secure'), () => new HttpResponse(null, { status: 401 })),
      mock.post(apiUrl('/auth/refresh'), () => new HttpResponse(null, { status: 401 })),
    );

    await expect(http.get('/secure')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
  });
});
```

`src/core/auth/guards.test.tsx`:

```tsx
import { useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import { render, screen } from '@/test/render';

import { Can } from './can';
import { RequireAuth, RequireGuest, RequirePermission } from './guards';

function LoginProbe() {
  const location = useLocation();
  return <p>Login page {location.search}</p>;
}

describe('guards', () => {
  it('RequireAuth sends signed-out users to login with a return path', async () => {
    render(
      <RequireAuth>
        <p>Secret</p>
      </RequireAuth>,
      {
        auth: 'anonymous',
        path: '/items',
        route: '/items?page=2',
        routes: [{ path: '/login', element: <LoginProbe /> }],
      },
    );
    expect(await screen.findByText('Login page ?returnTo=%2Fitems%3Fpage%3D2')).toBeInTheDocument();
  });

  it('RequireAuth renders its children for signed-in users', async () => {
    render(
      <RequireAuth>
        <p>Secret</p>
      </RequireAuth>,
      { auth: 'viewer' },
    );
    expect(await screen.findByText('Secret')).toBeInTheDocument();
  });

  it('RequireGuest sends signed-in users to their safe return path', async () => {
    render(
      <RequireGuest>
        <p>Login form</p>
      </RequireGuest>,
      {
        auth: 'admin',
        path: '/login',
        route: '/login?returnTo=%2Fitems',
        routes: [{ path: '/items', element: <p>Items page</p> }],
      },
    );
    expect(await screen.findByText('Items page')).toBeInTheDocument();
  });

  it('RequirePermission shows the 403 state without the permission', async () => {
    render(
      <RequirePermission permission="items.create">
        <p>Create form</p>
      </RequirePermission>,
      { auth: 'viewer' },
    );
    expect(await screen.findByRole('heading', { name: "You don't have access to this page" })).toBeInTheDocument();
  });

  it('Can renders children or the fallback', async () => {
    render(
      <>
        <Can permission="items.read">
          <p>Visible</p>
        </Can>
        <Can permission="items.delete" fallback={<p>Hidden</p>}>
          <p>Delete button</p>
        </Can>
      </>,
      { auth: 'viewer' },
    );
    expect(await screen.findByText('Visible')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
    expect(screen.queryByText('Delete button')).not.toBeInTheDocument();
  });
});
```

Run: `pnpm exec vitest run src/core/auth`
Expected: PASS (15 tests).

- [ ] **Step 8: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(auth): add auth provider, route guards, Can and router-aware test render" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7.5: URL state, pagination and the unsaved-changes guard (spec §7.7–7.8)

**Files:**
- Create:
  - `src/hooks/use-url-state.ts`, `use-pagination.ts`, `use-unsaved-changes-warning.ts`
  - a `.test.tsx` for each
- Modify: `src/locales/{en,es}/common.json`

**Interfaces:**
- Produces:
  - `useUrlState(shape)`:
    - `shape` is a record of Zod field schemas with defaults, defined at module level
    - returns `[state, setState(update, { replace = true })]`
    - each param is parsed on its own, and an invalid value falls back to that field's default
    - values equal to their default, and `''` / `null` / `undefined`, are removed from the URL
  - `usePagination(): { pagination: PaginationState; setPagination: OnChangeFn<PaginationState>; resetPage() }`, synced with `?page=` (1-based) and `?pageSize=`. Page changes push a history entry.
  - `useUnsavedChangesWarning(when: boolean)`:
    - blocks in-app navigation to another path with a confirm dialog
    - asks the browser's own prompt on tab close or reload

- [ ] **Step 1: Add the translations**

Deep-merge into `src/locales/en/common.json`:

```json
{
  "unsaved": {
    "title": "Leave this page?",
    "description": "You have unsaved changes. They will be lost if you leave.",
    "leave": "Leave",
    "stay": "Stay"
  }
}
```

Deep-merge into `src/locales/es/common.json`:

```json
{
  "unsaved": {
    "title": "¿Salir de esta página?",
    "description": "Tienes cambios sin guardar. Se perderán si sales.",
    "leave": "Salir",
    "stay": "Quedarme"
  }
}
```

- [ ] **Step 2: Write the failing tests**

`src/hooks/use-url-state.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { act, renderHook } from '@/test/render';

import { useUrlState } from './use-url-state';

const SHAPE = {
  q: z.string().default(''),
  page: z.coerce.number().int().min(1).default(1),
  status: z.enum(['draft', 'active']).optional(),
};

describe('useUrlState', () => {
  it('reads typed values and falls back per key', () => {
    const { result } = renderHook(() => useUrlState(SHAPE), { route: '/items?q=lamp&page=oops&status=active' });
    expect(result.current[0]).toEqual({ q: 'lamp', page: 1, status: 'active' });
  });

  it('writes changes and drops default values from the URL', async () => {
    const { result, router } = renderHook(() => useUrlState(SHAPE), { route: '/items?q=lamp&page=3' });

    await act(async () => {
      result.current[1]({ q: '', page: 2 });
    });

    expect(router.state.location.search).toBe('?page=2');
    expect(result.current[0]).toMatchObject({ q: '', page: 2 });
  });
});
```

`src/hooks/use-pagination.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';

import { act, renderHook } from '@/test/render';

import { usePagination } from './use-pagination';

describe('usePagination', () => {
  it('maps ?page=&pageSize= to DataTable pagination state and back', async () => {
    const { result, router } = renderHook(() => usePagination(), { route: '/items?page=3&pageSize=20' });
    expect(result.current.pagination).toEqual({ pageIndex: 2, pageSize: 20 });

    await act(async () => {
      result.current.setPagination((old) => ({ ...old, pageIndex: old.pageIndex + 1 }));
    });
    expect(router.state.location.search).toBe('?page=4&pageSize=20');

    await act(async () => {
      result.current.resetPage();
    });
    expect(router.state.location.search).toBe('?pageSize=20');
  });

  it('ignores unsupported page sizes', () => {
    const { result } = renderHook(() => usePagination(), { route: '/items?pageSize=7' });
    expect(result.current.pagination).toEqual({ pageIndex: 0, pageSize: 10 });
  });
});
```

`src/hooks/use-unsaved-changes-warning.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { Link } from 'react-router';
import { describe, expect, it } from 'vitest';

import { render, screen } from '@/test/render';

import { useUnsavedChangesWarning } from './use-unsaved-changes-warning';

function EditPage({ dirty }: { dirty: boolean }) {
  useUnsavedChangesWarning(dirty);
  return <Link to="/elsewhere">Go elsewhere</Link>;
}

const routes = [{ path: '/elsewhere', element: <p>Elsewhere</p> }];

describe('useUnsavedChangesWarning', () => {
  it('asks before leaving; Stay keeps the page, Leave navigates', async () => {
    const user = userEvent.setup();
    render(<EditPage dirty />, { path: '/edit', route: '/edit', routes });

    await user.click(screen.getByRole('link', { name: 'Go elsewhere' }));
    expect(await screen.findByRole('alertdialog', { name: 'Leave this page?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Stay' }));
    expect(screen.queryByText('Elsewhere')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Go elsewhere' }));
    await user.click(await screen.findByRole('button', { name: 'Leave' }));
    expect(await screen.findByText('Elsewhere')).toBeInTheDocument();
  });

  it('does nothing without unsaved changes', async () => {
    const user = userEvent.setup();
    render(<EditPage dirty={false} />, { path: '/edit', route: '/edit', routes });

    await user.click(screen.getByRole('link', { name: 'Go elsewhere' }));

    expect(await screen.findByText('Elsewhere')).toBeInTheDocument();
  });
});
```

Run: `pnpm exec vitest run src/hooks`
Expected: FAIL, because the modules are missing.

- [ ] **Step 3: Create `src/hooks/use-url-state.ts`**

```ts
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { z } from 'zod';

/** One Zod schema per query parameter. Give each a `.default()` (or make it `.optional()`). */
export type UrlStateShape = Record<string, z.ZodType>;
export type UrlState<S extends UrlStateShape> = { [K in keyof S]: z.output<S[K]> };
export type UrlStateUpdate<S extends UrlStateShape> = Partial<{ [K in keyof S]: z.output<S[K]> | null }>;

const defaultOf = (field: z.ZodType | undefined): unknown => field?.safeParse(undefined).data;

function readParams<S extends UrlStateShape>(shape: S, params: URLSearchParams): UrlState<S> {
  const state: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(shape)) {
    const parsed = field.safeParse(params.get(key) ?? undefined);
    state[key] = parsed.success ? parsed.data : defaultOf(field);
  }
  return state as UrlState<S>;
}

/**
 * Typed state in the URL query string (spec §7.8): shareable, bookmarkable and back-button friendly.
 * Define `shape` at module level (it must be stable). Use `z.coerce.number()` for numbers.
 */
export function useUrlState<S extends UrlStateShape>(shape: S) {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => readParams(shape, searchParams), [shape, searchParams]);

  const setState = useCallback(
    (update: UrlStateUpdate<S>, { replace = true }: { replace?: boolean } = {}) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(update)) {
            if (value === undefined || value === null || value === '' || value === defaultOf(shape[key])) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }
          return next;
        },
        { replace },
      );
    },
    [shape, setSearchParams],
  );

  return [state, setState] as const;
}
```

- [ ] **Step 4: Create `src/hooks/use-pagination.ts`**

```ts
import type { OnChangeFn, PaginationState } from '@tanstack/react-table';
import { useCallback, useMemo } from 'react';
import { z } from 'zod';

import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/config/constants';

import { useUrlState } from './use-url-state';

const isPageSize = (size: number) => (PAGE_SIZE_OPTIONS as readonly number[]).includes(size);

const PAGINATION_SHAPE = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().refine(isPageSize).default(DEFAULT_PAGE_SIZE),
};

/** Page and page size synced with `?page=&pageSize=` (spec §7.8), shaped for <DataTable pagination>. */
export function usePagination() {
  const [params, setParams] = useUrlState(PAGINATION_SHAPE);

  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: params.page - 1, pageSize: params.pageSize }),
    [params.page, params.pageSize],
  );

  const setPagination = useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      setParams({ page: next.pageIndex + 1, pageSize: next.pageSize }, { replace: false });
    },
    [pagination, setParams],
  );

  /** Back to page 1; call it when filters or search change. */
  const resetPage = useCallback(() => {
    setParams({ page: 1 });
  }, [setParams]);

  return { pagination, setPagination, resetPage };
}
```

- [ ] **Step 5: Create `src/hooks/use-unsaved-changes-warning.ts`**

```ts
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBeforeUnload, useBlocker } from 'react-router';

import { useConfirm } from '@/core/notify';

/** Asks before leaving a page with unsaved changes (spec §7.7): in-app navigation, and tab close or reload. */
export function useUnsavedChangesWarning(when: boolean): void {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => when && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const { proceed, reset } = blocker;
    let active = true;
    void confirm({
      title: t('unsaved.title'),
      description: t('unsaved.description'),
      confirmLabel: t('unsaved.leave'),
      cancelLabel: t('unsaved.stay'),
      destructive: true,
    }).then((leave) => {
      if (!active) return;
      if (leave) proceed();
      else reset();
    });
    return () => {
      active = false;
    };
  }, [blocker, confirm, t]);

  useBeforeUnload((event) => {
    if (when) event.preventDefault(); // the browser shows its own "Leave site?" prompt
  });
}
```

Run: `pnpm exec vitest run src/hooks`
Expected: PASS.

- [ ] **Step 6: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(hooks): add url state, url-synced pagination and unsaved changes warning" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7.6: Layout components (spec §5.5)

**Files:**
- Create in `src/components/layout/`:
  - `nav-types.ts`, `sidebar.tsx`, `header.tsx`, `user-menu.tsx`, `app-shell.tsx`, `page-header.tsx`, `auth-layout.tsx`, `app-footer.tsx`, `route-progress.tsx`, `index.ts`
  - tests: `app-shell.test.tsx`, `page-header.test.tsx`, `user-menu.test.tsx`
  - stories: `page-header.stories.tsx`, `app-shell.stories.tsx`
- Modify: `.storybook/preview.tsx` (router decorator), `src/locales/{en,es}/common.json`

**Interfaces:**
- Consumes: `useAuth`, the UI store selectors, `ThemeToggle`, `LanguageSwitcher`, `OfflineBanner`, `APP_VERSION` / `GIT_SHA`, `env.VITE_APP_NAME`.
- Produces (all from `@/components/layout`):
  - `interface NavItem { labelKey: ParseKeys; icon: LucideIcon; to: string; permission?: Permission; end?: boolean }`
  - `<AppShell navItems>{page}</AppShell>`:
    - a responsive sidebar that is collapsible on desktop and becomes a Sheet on mobile
    - a sticky header
    - a skip link
    - the offline banner
    - `<main id="main-content">`
    - the footer with version and SHA
  - `<Sidebar items collapsed />`, which hides items the user lacks permission for
  - `<Header />`, `<UserMenu />`
  - `<PageHeader title description? breadcrumbs?: { label; to? }[] actions? />`, which renders the page's `h1`
  - `<AuthLayout>`: a centred card
  - `<AppFooter />`
  - `<RouteProgress />`

- [ ] **Step 1: Add the translations**

Deep-merge into `src/locales/en/common.json`:

```json
{
  "nav": {
    "label": "Main navigation",
    "description": "Links to every section of the app",
    "open": "Open navigation",
    "collapse": "Collapse sidebar",
    "expand": "Expand sidebar",
    "dashboard": "Dashboard",
    "items": "Items"
  },
  "a11y": { "skipToContent": "Skip to main content" },
  "auth": { "signOut": "Sign out" },
  "userMenu": { "open": "Open user menu" },
  "status": { "navigating": "Loading page" },
  "about": { "version": "Version {{version}} ({{sha}})" }
}
```

Deep-merge into `src/locales/es/common.json`:

```json
{
  "nav": {
    "label": "Navegación principal",
    "description": "Enlaces a cada sección de la aplicación",
    "open": "Abrir navegación",
    "collapse": "Contraer barra lateral",
    "expand": "Expandir barra lateral",
    "dashboard": "Panel",
    "items": "Elementos"
  },
  "a11y": { "skipToContent": "Saltar al contenido principal" },
  "auth": { "signOut": "Cerrar sesión" },
  "userMenu": { "open": "Abrir menú de usuario" },
  "status": { "navigating": "Cargando página" },
  "about": { "version": "Versión {{version}} ({{sha}})" }
}
```

- [ ] **Step 2: Write the failing tests**

`src/components/layout/app-shell.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { LayoutDashboardIcon, PackageIcon } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { useUiStore } from '@/stores/ui-store';
import { render, screen, within } from '@/test/render';

import { AppShell } from './app-shell';
import type { NavItem } from './nav-types';

const NAV: NavItem[] = [
  { labelKey: 'nav.dashboard', icon: LayoutDashboardIcon, to: '/dashboard', end: true },
  { labelKey: 'nav.items', icon: PackageIcon, to: '/items', permission: 'items.delete' },
];

const renderShell = (auth: 'admin' | 'viewer') =>
  render(
    <AppShell navItems={NAV}>
      <p>Page content</p>
    </AppShell>,
    { auth, route: '/dashboard' },
  );

describe('AppShell', () => {
  it('renders the page with a skip link, navigation and footer', async () => {
    renderShell('admin');

    expect(await screen.findByText('Page content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByText(/^Version /)).toBeInTheDocument();
  });

  it('hides links the user has no permission for', async () => {
    renderShell('viewer');
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });

    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).queryByRole('link', { name: 'Items' })).not.toBeInTheDocument();
  });

  it('opens the mobile navigation sheet and collapses the desktop sidebar', async () => {
    const user = userEvent.setup();
    renderShell('admin');

    await user.click(await screen.findByRole('button', { name: 'Open navigation' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });
});
```

`src/components/layout/page-header.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';

import { render, screen } from '@/test/render';

import { PageHeader } from './page-header';

describe('PageHeader', () => {
  it('renders the title, description, breadcrumbs and actions', () => {
    render(
      <PageHeader
        title="Item details"
        description="Everything about this item."
        breadcrumbs={[{ label: 'Items', to: '/items' }, { label: 'Lamp' }]}
        actions={<button type="button">Edit</button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Item details' })).toBeInTheDocument();
    expect(screen.getByText('Everything about this item.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Items' })).toHaveAttribute('href', '/items');
    expect(screen.getByText('Lamp')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });
});
```

`src/components/layout/user-menu.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { render, screen } from '@/test/render';

import { UserMenu } from './user-menu';

describe('UserMenu', () => {
  it('shows the user and signs out to the login page', async () => {
    const user = userEvent.setup();
    render(<UserMenu />, { auth: 'admin', routes: [{ path: '/login', element: <p>Login page</p> }] });

    await user.click(await screen.findByRole('button', { name: 'Open user menu' }));
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });
});
```

Run: `pnpm exec vitest run src/components/layout`
Expected: FAIL, because the modules are missing.

- [ ] **Step 3: Create `src/components/layout/nav-types.ts`**

```ts
import type { ParseKeys } from 'i18next';
import type { LucideIcon } from 'lucide-react';

import type { Permission } from '@/config/permissions';

/** One entry of the sidebar, configured in src/app/navigation.ts (spec §5.5). */
export interface NavItem {
  /** Translation key in the `common` namespace, e.g. 'nav.dashboard'. */
  labelKey: ParseKeys;
  icon: LucideIcon;
  to: string;
  /** Hidden unless the user has this permission. */
  permission?: Permission;
  /** Active only on an exact path match. */
  end?: boolean;
}
```

- [ ] **Step 4: Create `src/components/layout/sidebar.tsx`**

```tsx
import { LayersIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { Button } from '@/components/ui/button';
import { env } from '@/config/env';
import { useAuth } from '@/core/auth';
import { cn } from '@/lib/cn';
import { useToggleSidebar } from '@/stores/ui-store';

import type { NavItem } from './nav-types';

interface SidebarProps {
  items: readonly NavItem[];
  collapsed: boolean;
  /** Show the collapse toggle (desktop only). */
  collapsible?: boolean;
}

/** Navigation driven by the NavItem config, filtered by permission (spec §5.5). */
export function Sidebar({ items, collapsed, collapsible = false }: SidebarProps) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const toggle = useToggleSidebar();
  const visible = items.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
        <LayersIcon aria-hidden="true" className="size-5 shrink-0" />
        {collapsed ? null : <span className="truncate">{env.VITE_APP_NAME}</span>}
      </div>
      <nav aria-label={t('nav.label')} className="flex-1 p-2">
        <ul className="grid gap-1">
          {visible.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium outline-none focus-visible:ring-3',
                    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                    collapsed && 'justify-center px-2',
                  )
                }
              >
                <item.icon aria-hidden="true" className="size-4 shrink-0" />
                {collapsed ? <span className="sr-only">{t(item.labelKey)}</span> : t(item.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {collapsible ? (
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            onClick={toggle}
          >
            {collapsed ? <PanelLeftOpenIcon aria-hidden="true" /> : <PanelLeftCloseIcon aria-hidden="true" />}
            {collapsed ? null : t('nav.collapse')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/layout/user-menu.tsx`**

```tsx
import { LogOutIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { paths } from '@/config/paths';
import { useAuth } from '@/core/auth';

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** Signed-in user's menu in the header (spec §5.5). */
export function UserMenu() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2" aria-label={t('userMenu.open')}>
          <Avatar className="size-7">
            <AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm sm:inline">{user.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="grid">
          <span className="truncate">{user.name}</span>
          <span className="text-muted-foreground truncate text-xs font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void logout().then(() => navigate(paths.login(), { replace: true }));
          }}
        >
          <LogOutIcon aria-hidden="true" />
          {t('auth.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 6: Create the header, footer, progress bar and page header**

`src/components/layout/header.tsx`:

```tsx
import { MenuIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useSetMobileNavOpen } from '@/stores/ui-store';

import { LanguageSwitcher } from './language-switcher';
import { UserMenu } from './user-menu';

/** Sticky app header: mobile nav trigger, language, theme and user menu (spec §5.5). */
export function Header() {
  const { t } = useTranslation();
  const setMobileNavOpen = useSetMobileNavOpen();

  return (
    <header className="bg-background/95 z-sticky sticky top-0 flex h-14 items-center gap-1 border-b px-4 backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label={t('nav.open')}
        onClick={() => {
          setMobileNavOpen(true);
        }}
      >
        <MenuIcon aria-hidden="true" />
      </Button>
      <div className="flex-1" />
      <LanguageSwitcher />
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
```

`src/components/layout/app-footer.tsx`:

```tsx
import { useTranslation } from 'react-i18next';

import { APP_VERSION, GIT_SHA } from '@/config/constants';

/** Build version and git SHA (spec §10.4: "exposed in the UI footer/about area"). */
export function AppFooter() {
  const { t } = useTranslation();
  return (
    <footer className="text-muted-foreground border-t px-4 py-3 text-xs md:px-6">
      {t('about.version', { version: APP_VERSION, sha: GIT_SHA.slice(0, 7) })}
    </footer>
  );
}
```

`src/components/layout/route-progress.tsx`:

```tsx
import { useTranslation } from 'react-i18next';

/** Thin bar at the top of the page while a lazy route chunk downloads. */
export function RouteProgress() {
  const { t } = useTranslation();
  return (
    <div
      role="progressbar"
      aria-label={t('status.navigating')}
      className="bg-primary/20 z-toast fixed inset-x-0 top-0 h-1 overflow-hidden"
    >
      <div className="bg-primary h-full w-1/3 animate-pulse" />
    </div>
  );
}
```

`src/components/layout/page-header.tsx`:

```tsx
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export interface Crumb {
  label: string;
  /** Omit for the current page (the last crumb). */
  to?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: readonly Crumb[];
  /** Page-level actions (buttons, menus), shown on the right. */
  actions?: ReactNode;
}

/** Title, breadcrumbs and actions for a page; renders the page's single h1 (spec §5.5). */
export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 grid gap-3">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={`${String(index)}-${crumb.label}`}>
                {index > 0 ? <BreadcrumbSeparator /> : null}
                <BreadcrumbItem>
                  {crumb.to ? (
                    <BreadcrumbLink asChild>
                      <Link to={crumb.to}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create `src/components/layout/app-shell.tsx`**

```tsx
import { type ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { OfflineBanner } from '@/components/feedback';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/cn';
import { useMobileNavOpen, useSetMobileNavOpen, useSidebarCollapsed } from '@/stores/ui-store';

import { AppFooter } from './app-footer';
import { Header } from './header';
import type { NavItem } from './nav-types';
import { Sidebar } from './sidebar';

interface AppShellProps {
  navItems: readonly NavItem[];
  children: ReactNode;
}

/** Responsive app frame (spec §5.5): the sidebar collapses on desktop and becomes a sheet on mobile. */
export function AppShell({ navItems, children }: AppShellProps) {
  const { t } = useTranslation();
  const collapsed = useSidebarCollapsed();
  const mobileNavOpen = useMobileNavOpen();
  const setMobileNavOpen = useSetMobileNavOpen();
  const { pathname } = useLocation();

  useEffect(() => {
    setMobileNavOpen(false); // close the mobile sheet after navigating
  }, [pathname, setMobileNavOpen]);

  return (
    <div className="bg-background flex min-h-svh">
      <a
        href="#main-content"
        className="focus:bg-background focus:ring-ring focus:z-toast sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:rounded-md focus:p-2 focus:ring-3"
      >
        {t('a11y.skipToContent')}
      </a>

      <aside className={cn('hidden shrink-0 border-r md:block', collapsed ? 'md:w-16' : 'md:w-64')}>
        <Sidebar items={navItems} collapsed={collapsed} collapsible />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{t('nav.label')}</SheetTitle>
            <SheetDescription>{t('nav.description')}</SheetDescription>
          </SheetHeader>
          <Sidebar items={navItems} collapsed={false} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <OfflineBanner />
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 outline-none md:p-6">
          {children}
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Create `src/components/layout/auth-layout.tsx` and the index**

`src/components/layout/auth-layout.tsx`:

```tsx
import { LayersIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { env } from '@/config/env';

import { LanguageSwitcher } from './language-switcher';

/** Centred card layout for login and similar pages (spec §5.5). */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted/40 flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <LayersIcon aria-hidden="true" className="size-6" />
        {env.VITE_APP_NAME}
      </div>
      <main id="main-content" className="w-full max-w-sm">
        <Card>{children}</Card>
      </main>
      <div className="flex gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </div>
  );
}
```

`src/components/layout/index.ts`:

```ts
export { AppFooter } from './app-footer';
export { AppShell } from './app-shell';
export { AuthLayout } from './auth-layout';
export { Header } from './header';
export { LanguageSwitcher } from './language-switcher';
export type { NavItem } from './nav-types';
export { PageHeader, type Crumb } from './page-header';
export { RouteProgress } from './route-progress';
export { Sidebar } from './sidebar';
export { UserMenu } from './user-menu';
```

Run: `pnpm exec vitest run src/components/layout`
Expected: PASS.

- [ ] **Step 9: Give every story a router (edit `.storybook/preview.tsx`)**

1. Add `import { MemoryRouter } from 'react-router';` to the external imports.
2. In the decorator, wrap the story: `<StoryShell …><MemoryRouter><Story /></MemoryRouter></StoryShell>`.

- [ ] **Step 10: Write the stories**

`src/components/layout/page-header.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '@/components/ui/button';

import { PageHeader } from './page-header';

const meta = {
  title: 'Layout/PageHeader',
  component: PageHeader,
  parameters: { layout: 'padded' },
  args: {
    title: 'Item details',
    description: 'Everything about this item in one place.',
    breadcrumbs: [{ label: 'Items', to: '/items' }, { label: 'Desk lamp' }],
    actions: <Button>Edit</Button>,
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const TitleOnly: Story = { args: { description: undefined, breadcrumbs: undefined, actions: undefined } };
```

`src/components/layout/app-shell.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayoutDashboardIcon, PackageIcon } from 'lucide-react';

import { AuthProvider, type AuthStrategy } from '@/core/auth';
import type { SessionUser } from '@/stores/session-store';

import { AppShell } from './app-shell';
import { PageHeader } from './page-header';

const demoUser: SessionUser = {
  id: 'demo',
  name: 'Demo User',
  email: 'demo@example.com',
  permissions: ['items.read'],
};

/** A strategy that is always signed in, so the shell renders without an API. */
const storyStrategy: AuthStrategy = {
  login: () => Promise.resolve(demoUser),
  logout: () => Promise.resolve(),
  fetchCurrentUser: () => Promise.resolve(demoUser),
  refresh: () => Promise.resolve(),
  prepareRequest: (config) => config,
};

const queryClient = new QueryClient();

const meta = {
  title: 'Layout/AppShell',
  component: AppShell,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider strategy={storyStrategy}>
          <Story />
        </AuthProvider>
      </QueryClientProvider>
    ),
  ],
  args: {
    navItems: [
      { labelKey: 'nav.dashboard', icon: LayoutDashboardIcon, to: '/', end: true },
      { labelKey: 'nav.items', icon: PackageIcon, to: '/items', permission: 'items.read' },
    ],
    children: <PageHeader title="Dashboard" description="Page content renders here." />,
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

- [ ] **Step 11: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm storybook:build`
Expected: all green.

```bash
git add -A
git commit -m "feat(layout): add app shell, sidebar, header, page header and auth layout" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7.7: Router, pages and app wiring (spec §7.1)

**Files:**
- Create:
  - `src/app/navigation.ts`, `src/app/router.tsx`, `src/app/router.test.tsx`
  - in `src/app/routes/`: `root-layout.tsx`, `route-error.tsx`, `guest-layout.tsx`, `app-layout.tsx`, `login.tsx`, `login.test.tsx`, `dashboard.tsx`, `forbidden.tsx`, `not-found.tsx`
  - `docs/routing.md`, `docs/auth.md`
- Modify:
  - `src/app/App.tsx`, `src/app/App.test.tsx`, `src/app/providers.tsx`
  - `src/test/setup.ts`
  - `src/locales/{en,es}/common.json`
  - `docs/security.md`, `docs/architecture.md`

**Interfaces:**
- Consumes: everything from Tasks 7.1–7.6.
- Produces:
  - `routes: RouteObject[]` and `router` (a browser router)
  - `navigation: NavItem[]`
  - `AppProviders { children; client? }`: `QueryClient` → `Confirm` → `ThemeSync` → `AuthProvider` → `Toaster` → devtools
  - `// plop:routes` anchor in `router.tsx` and `// plop:nav` anchor in `navigation.ts`, for generators
  - **Route modules** export `Component`, the React Router lazy-module convention.

- [ ] **Step 1: Add the translations**

Deep-merge into `src/locales/en/common.json`:

```json
{
  "pages": {
    "login": "Sign in",
    "dashboard": "Dashboard",
    "forbidden": "Access denied",
    "notFound": "Page not found"
  },
  "auth": {
    "title": "Sign in",
    "description": "Enter your email and password to continue.",
    "email": "Email",
    "password": "Password",
    "signIn": "Sign in",
    "demoHint": "Mock API demo accounts: {{admin}} (every permission) or {{viewer}} (read-only). Password: {{password}}"
  },
  "dashboard": {
    "welcome": "Welcome back, {{name}}.",
    "emptyTitle": "Your dashboard is empty",
    "emptyDescription": "Add widgets for the numbers your team cares about."
  }
}
```

Deep-merge into `src/locales/es/common.json`:

```json
{
  "pages": {
    "login": "Iniciar sesión",
    "dashboard": "Panel",
    "forbidden": "Acceso denegado",
    "notFound": "Página no encontrada"
  },
  "auth": {
    "title": "Iniciar sesión",
    "description": "Introduce tu correo y tu contraseña para continuar.",
    "email": "Correo electrónico",
    "password": "Contraseña",
    "signIn": "Iniciar sesión",
    "demoHint": "Cuentas de demostración de la API simulada: {{admin}} (todos los permisos) o {{viewer}} (solo lectura). Contraseña: {{password}}"
  },
  "dashboard": {
    "welcome": "Hola de nuevo, {{name}}.",
    "emptyTitle": "Tu panel está vacío",
    "emptyDescription": "Añade widgets con las cifras que le importan a tu equipo."
  }
}
```

- [ ] **Step 2: Give lazy routes time in tests (in `src/test/setup.ts`)**

1. Change the `@testing-library/react` import to `import { cleanup, configure } from '@testing-library/react';`.
2. Add `configure({ asyncUtilTimeout: 3_000 }); // the first import of a lazy route chunk can be slow` right after the imports.

- [ ] **Step 3: Write the failing tests**

`src/app/routes/login.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { RequireGuest } from '@/core/auth';
import { DEMO_PASSWORD } from '@/mocks/fixtures/users';
import { render, screen } from '@/test/render';

import { Component as LoginPage } from './login';

const renderLogin = () =>
  render(
    <RequireGuest>
      <LoginPage />
    </RequireGuest>,
    {
      auth: 'anonymous',
      path: '/login',
      route: '/login?returnTo=%2Fitems',
      routes: [{ path: '/items', element: <p>Items page</p> }],
    },
  );

describe('Login page', () => {
  it('signs in and returns to the page the user wanted', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(await screen.findByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), DEMO_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Items page')).toBeInTheDocument();
  });

  it('shows a translated message for wrong credentials', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(await screen.findByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
  });

  it('validates before calling the API', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });
});
```

`src/app/router.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { mockDb } from '@/mocks/db';
import { DEMO_PASSWORD, MOCK_USER_IDS } from '@/mocks/fixtures/users';
import { createTestQueryClient } from '@/test/render';

import { AppProviders } from './providers';
import { routes } from './router';

function renderApp(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  render(
    <AppProviders client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

describe('app routes', () => {
  it('sends visitors to login, then back to the page they asked for', async () => {
    const user = userEvent.setup();
    const router = renderApp('/dashboard');

    await user.type(await screen.findByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), DEMO_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard');
    await waitFor(() => {
      expect(document.title).toBe('Dashboard · React Bedrock');
    });
  });

  it('redirects / to the dashboard for signed-in users', async () => {
    mockDb.sessionUserId = MOCK_USER_IDS.admin;
    const router = renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard');
  });

  it('shows the 404 page inside the app shell', async () => {
    mockDb.sessionUserId = MOCK_USER_IDS.viewer;
    renderApp('/does-not-exist');
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

  it('shows the 403 page', async () => {
    mockDb.sessionUserId = MOCK_USER_IDS.viewer;
    renderApp('/403');
    expect(await screen.findByRole('heading', { level: 1, name: 'Access denied' })).toBeInTheDocument();
  });
});
```

Replace `src/app/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('boots to the sign-in page when nobody is signed in', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
  });
});
```

Run: `pnpm exec vitest run src/app`
Expected: FAIL, because the route modules and router are missing.

- [ ] **Step 4: Create `src/app/navigation.ts`**

```ts
import { LayoutDashboardIcon } from 'lucide-react';

import type { NavItem } from '@/components/layout';
import { paths } from '@/config/paths';

/** Sidebar entries, in order (spec §5.5). Items with `permission` are hidden from users without it. */
export const navigation: NavItem[] = [
  { labelKey: 'nav.dashboard', icon: LayoutDashboardIcon, to: paths.dashboard(), end: true },
  // plop:nav
];
```

- [ ] **Step 5: Create the always-loaded route components**

`src/app/routes/root-layout.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { Outlet, ScrollRestoration, type UIMatch, useMatches, useNavigation } from 'react-router';

import { RouteProgress } from '@/components/layout';
import { useDocumentTitle } from '@/hooks/use-document-title';

import type { RouteHandle } from '../route-handle';

/** Root of the route tree: document title, scroll restoration and navigation progress (spec §7.1). */
export function RootLayout() {
  const { i18n } = useTranslation();
  const navigation = useNavigation();
  const matches = useMatches() as UIMatch<unknown, RouteHandle | undefined>[];
  const title = matches.findLast((match) => match.handle?.title)?.handle?.title?.(i18n);
  useDocumentTitle(title);

  return (
    <>
      {navigation.state === 'loading' ? <RouteProgress /> : null}
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
```

`src/app/routes/route-error.tsx`:

```tsx
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useRouteError } from 'react-router';

import { ErrorState, NotFoundState } from '@/components/feedback';
import { logger } from '@/core/logger';

/** Route-level error boundary (the router's errorElement). Errors inside a page keep the app shell. */
export function RouteError() {
  const { t } = useTranslation();
  const error = useRouteError();

  useEffect(() => {
    logger.error('Route error', { error });
  }, [error]);

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundState />;
  return (
    <div className="p-6">
      <ErrorState
        error={error}
        retryLabel={t('actions.reload')}
        onRetry={() => {
          window.location.reload(); // also fixes chunks that went stale after a deploy
        }}
      />
    </div>
  );
}
```

- [ ] **Step 6: Create the lazy route modules**

`src/app/routes/guest-layout.tsx`:

```tsx
import { Outlet } from 'react-router';

import { AuthLayout } from '@/components/layout';
import { RequireGuest } from '@/core/auth';

/** Pages for signed-out users (login and similar), in the centred auth layout. */
export function Component() {
  return (
    <RequireGuest>
      <AuthLayout>
        <Outlet />
      </AuthLayout>
    </RequireGuest>
  );
}
```

`src/app/routes/app-layout.tsx`:

```tsx
import { Outlet, useLocation } from 'react-router';

import { AsyncBoundary } from '@/components/feedback';
import { AppShell } from '@/components/layout';
import { RequireAuth } from '@/core/auth';

import { navigation } from '../navigation';

/** Signed-in pages, inside the app shell. The boundary catches suspense queries and resets on navigation. */
export function Component() {
  const { pathname } = useLocation();
  return (
    <RequireAuth>
      <AppShell navItems={navigation}>
        <AsyncBoundary resetKeys={[pathname]}>
          <Outlet />
        </AsyncBoundary>
      </AppShell>
    </RequireAuth>
  );
}
```

`src/app/routes/login.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { env } from '@/config/env';
import { getErrorMessage } from '@/core/api';
import { useAuth } from '@/core/auth';
import { DEMO_EMAILS, DEMO_PASSWORD } from '@/mocks/fixtures/users';

const loginSchema = z.object({ email: z.email(), password: z.string().min(1) });
type LoginValues = z.infer<typeof loginSchema>;

/** Sign-in page (spec §7.1). Once signed in, <RequireGuest> sends the user to `returnTo`. */
export function Component() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <>
      <CardHeader>
        <CardTitle>
          <h1>{t('auth.title')}</h1>
        </CardTitle>
        <CardDescription>{t('auth.description')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Form {...form}>
          <form noValidate className="grid gap-4" onSubmit={onSubmit}>
            {formError ? (
              <p role="alert" className="text-destructive text-sm">
                {formError}
              </p>
            ) : null}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.email')}</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.password')}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Spinner aria-hidden="true" /> : null}
              {t('auth.signIn')}
            </Button>
          </form>
        </Form>
        {env.VITE_ENABLE_MOCKS ? (
          <p className="text-muted-foreground text-xs">
            {t('auth.demoHint', {
              admin: DEMO_EMAILS.admin,
              viewer: DEMO_EMAILS.viewer,
              password: DEMO_PASSWORD,
            })}
          </p>
        ) : null}
      </CardContent>
    </>
  );
}
```

`src/app/routes/dashboard.tsx`:

```tsx
import { LayoutDashboardIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { useAuth } from '@/core/auth';

/** Placeholder dashboard (spec §7.1). Replace it with your product's overview. */
export function Component() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <>
      <PageHeader title={t('pages.dashboard')} description={t('dashboard.welcome', { name: user?.name ?? '' })} />
      <EmptyState
        icon={LayoutDashboardIcon}
        title={t('dashboard.emptyTitle')}
        description={t('dashboard.emptyDescription')}
      />
    </>
  );
}
```

`src/app/routes/forbidden.tsx`:

```tsx
import { useTranslation } from 'react-i18next';

import { ForbiddenState } from '@/components/feedback';
import { PageHeader } from '@/components/layout';

export function Component() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('pages.forbidden')} />
      <ForbiddenState />
    </>
  );
}
```

`src/app/routes/not-found.tsx`:

```tsx
import { useTranslation } from 'react-i18next';

import { NotFoundState } from '@/components/feedback';
import { PageHeader } from '@/components/layout';

export function Component() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('pages.notFound')} />
      <NotFoundState />
    </>
  );
}
```

- [ ] **Step 7: Create `src/app/router.tsx`**

```tsx
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';

import { PageLoader } from '@/components/feedback';
import { paths } from '@/config/paths';

import type { RouteHandle } from './route-handle';
import { RootLayout } from './routes/root-layout';
import { RouteError } from './routes/route-error';

const titled = (title: NonNullable<RouteHandle['title']>): RouteHandle => ({ title });

/**
 * The route tree (spec §7.1). Every page is lazy-loaded; the root shows <PageLoader /> while the first
 * chunk loads, and <RouteProgress /> during later navigations. `pnpm gen page` inserts at `plop:routes`.
 */
export const routes: RouteObject[] = [
  {
    id: 'root',
    element: <RootLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <PageLoader variant="page" />,
    children: [
      { index: true, element: <Navigate to={paths.dashboard()} replace /> },
      {
        lazy: () => import('./routes/guest-layout'),
        children: [
          {
            path: paths.login.pattern,
            lazy: () => import('./routes/login'),
            handle: titled((i18n) => i18n.t('common:pages.login')),
          },
        ],
      },
      {
        lazy: () => import('./routes/app-layout'),
        children: [
          {
            // Errors thrown by a page render here, inside the app shell.
            errorElement: <RouteError />,
            children: [
              {
                path: paths.dashboard.pattern,
                lazy: () => import('./routes/dashboard'),
                handle: titled((i18n) => i18n.t('common:pages.dashboard')),
              },
              // plop:routes
              {
                path: paths.forbidden.pattern,
                lazy: () => import('./routes/forbidden'),
                handle: titled((i18n) => i18n.t('common:pages.forbidden')),
              },
              {
                path: '*',
                lazy: () => import('./routes/not-found'),
                handle: titled((i18n) => i18n.t('common:pages.notFound')),
              },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
```

- [ ] **Step 8: Wire up the app**

Replace `src/app/providers.tsx`:

```tsx
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';

import { queryClient } from '@/core/api';
import { AuthProvider } from '@/core/auth';
import { ConfirmProvider, Toaster } from '@/core/notify';
import { useThemeSync } from '@/stores/theme-store';

function ThemeSync() {
  useThemeSync();
  return null;
}

interface AppProvidersProps {
  children: ReactNode;
  /** Tests pass a fresh client; the app uses its singleton. */
  client?: QueryClient;
}

/** Every app-wide provider, composed in one place (spec §3). */
export function AppProviders({ children, client = queryClient }: AppProvidersProps) {
  return (
    <QueryClientProvider client={client}>
      <ConfirmProvider>
        <ThemeSync />
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </ConfirmProvider>
      {/* Renders nothing outside development builds. */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
```

Replace `src/app/App.tsx`:

```tsx
import { RouterProvider } from 'react-router/dom';

import { AppErrorBoundary } from '@/core/errors';

import { AppProviders } from './providers';
import { router } from './router';

export function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </AppErrorBoundary>
  );
}
```

Run: `pnpm exec vitest run src/app`
Expected: PASS.

- [ ] **Step 9: Write `docs/routing.md`**

````markdown
# Routing

React Router v8, in data mode (`createBrowserRouter`). The tree lives in `src/app/router.tsx`:

```
/ (RootLayout: document title, scroll restoration, navigation progress; errorElement)
├── index → redirect to /dashboard
├── guest layout (RequireGuest + AuthLayout)
│   └── /login
└── app layout (RequireAuth + AppShell + AsyncBoundary)
    └── (errorElement: errors keep the shell)
        ├── /dashboard
        ├── /items … (reference feature)
        ├── /403
        └── * → 404
```

## Paths: never hard-code a URL

```tsx
import { paths } from '@/config/paths';

<Link to={paths.items.detail(item.id)} />;
navigate(paths.login(location.pathname));
```

Each builder carries its `.pattern` (e.g. `/items/:itemId`), which only the router uses. `paths.test.ts` checks that every builder matches its pattern.

## Adding a page

`pnpm gen page` does this for you (docs/generators.md). By hand:

1. Add a builder to `src/config/paths.ts`.
2. Create `src/app/routes/<name>.tsx` that exports `function Component()`, the lazy-route convention. Keep it thin and delegate to a feature.
3. Add the route under `// plop:routes` in `router.tsx`, with `lazy: () => import('./routes/<name>')` and `handle: titled((i18n) => i18n.t('…'))` for the translated tab title.
4. Optionally, add a sidebar entry to `src/app/navigation.ts` (label key, icon, path, required permission).

## Guards

| Guard | Effect |
|---|---|
| `<RequireAuth>` | Signed-out users go to `/login?returnTo=<where they were>` and come back after signing in |
| `<RequireGuest>` | Signed-in users are sent from login to `returnTo` (only same-origin paths) or the dashboard |
| `<RequirePermission permission="items.create">` | Renders the 403 state without the permission |

Guards wrap an `<Outlet />` by default, or take children.

## Loading and errors

- **Lazy chunks:** the first page load shows `PageLoader`; later navigations show a thin progress bar.
- **Suspense:** pages may call `useSuspenseQuery`; `AsyncBoundary` in the app layout handles it and resets on navigation.
- **Errors:** a page that throws renders `RouteError` inside the shell (logged; the **Reload** button also fixes stale chunks after a deploy).

## URL state

Put filters, search, sort, page and tab in the URL, not in component state:
- `useUrlState(shape)`: typed search params, with invalid values falling back to defaults.
- `usePagination()`: `?page=&pageSize=` ↔ DataTable pagination.
````

- [ ] **Step 10: Write `docs/auth.md`**

````markdown
# Authentication and permissions

## Flow (httpOnly cookie session, owner decision 1)

1. **App start:** `AuthProvider` calls `GET /auth/me` and shows a full-page loader until it answers. 200 fills the session store with the user and permissions; 401 means "signed out".
2. **Login:** `POST /auth/login`. The server sets an **httpOnly** session cookie; the frontend never sees a token. The user returns to `returnTo`.
3. **Every request:** the browser attaches the cookie. The strategy sets `withCredentials` so cross-origin APIs receive it too.
4. **401:** the HTTP layer calls `POST /auth/refresh` **once**, even for many concurrent requests, then retries each request once. If the refresh fails, the session is cleared and `<RequireAuth>` redirects to login.
5. **Logout:** `POST /auth/logout`, then the session store, the whole query cache and the app's sessionStorage keys are cleared.

Backend endpoints the template expects (the MSW mocks implement them):
- `POST /auth/login {email,password}` → 200 user, or 401 `{code:'INVALID_CREDENTIALS'}`
- `POST /auth/logout` → 204
- `GET /auth/me` → 200 user, or 401
- `POST /auth/refresh` → 204, or 401
- A user is `{ id, name, email, permissions: string[] }`.

## Using auth in components

```tsx
const { user, isAuthenticated, hasPermission, login, logout } = useAuth();

<Can permission="items.create"><Button>{t('items:actions.create')}</Button></Can>
```

- Guards: see docs/routing.md.
- Sidebar entries take a `permission` and are hidden without it.
- Permissions are listed in `src/config/permissions.ts` (`<resource>.<action>`). Permissions the server sends that the frontend doesn't know are ignored.
- **The server is the real authority.** Frontend checks only decide what to show.

## Switching strategy (e.g. bearer tokens)

Everything strategy-specific is behind `AuthStrategy` (`src/core/auth/types.ts`). To switch:
1. Write `src/core/auth/token-strategy.ts` implementing `login`, `logout`, `fetchCurrentUser`, `refresh` and `prepareRequest`. `prepareRequest` sets `Authorization: Bearer <token>` from an in-memory variable, never localStorage (docs/security.md). `refresh` exchanges the refresh token.
2. Change the one export in `src/core/auth/strategy.ts`.

Nothing else changes: guards, `useAuth`, interceptors and tests all use the interface.

## Demo accounts (mock API only)

| Email | Password | Permissions |
|---|---|---|
| admin@example.com | demo1234 | all item permissions |
| viewer@example.com | demo1234 | items.read |
````

- [ ] **Step 11: Append "Authentication, CSRF and redirects" to `docs/security.md`**

```markdown
## Authentication, CSRF and redirects

- **Session cookie:** the server must set it as `HttpOnly; Secure; SameSite=Lax` (or `Strict`). The frontend can't read it, so XSS can't steal it.
- **CSRF:** `SameSite=Lax` blocks cross-site form posts from carrying the cookie. For defence in depth, have the backend also require a custom header on state-changing requests; every request from the shared client carries `X-Request-Id`, which a cross-site form cannot send. For a double-submit CSRF token instead, Axios's `xsrfCookieName` / `xsrfHeaderName` options work with the shared instance.
- **Open redirects:** `returnTo` is honoured only for same-origin relative paths (`safeReturnTo`).
- **Permissions in the UI are cosmetic.** The API must enforce them.
- **After logout,** the query cache and sessionStorage are cleared, so the next user of a shared computer sees nothing of the previous one.
```

- [ ] **Step 12: Append "Composition root" to `docs/architecture.md`**

```markdown
## Composition root (`src/app`)

- `main.tsx`: env check → global error handlers → mock worker (if enabled) → `createRoot(…, reactRootErrorHandlers)`
- `App.tsx`: `AppErrorBoundary` → `AppProviders` → `RouterProvider`
- `providers.tsx`: `QueryClientProvider` → `ConfirmProvider` → `ThemeSync` → `AuthProvider` → `Toaster` (+ devtools in development)
- `router.tsx`: the route tree; `routes/`: thin, lazy page modules that export `Component`
- `navigation.ts`: the sidebar config
```

- [ ] **Step 13: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all green. The build output lists a separate chunk per route.

```bash
git add -A
git commit -m "feat(app): add lazy route tree, login, dashboard and error pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Phase 7 gate

- [ ] Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Expected: all green.
- [ ] Manual check with `pnpm dev`:
  1. `/` redirects to `/login?returnTo=%2Fdashboard`.
  2. Sign in as `admin@example.com` / `demo1234`. You land on the Dashboard, and the tab title is "Dashboard · React Bedrock".
  3. Reload: you are still signed in (the mock cookie).
  4. Switch to Español and toggle dark mode: both persist across reloads.
  5. `/nope` shows the 404 inside the shell. `/403` shows access denied.
  6. Sign out from the user menu, then sign in as the viewer.
  7. Narrow the window: the sidebar becomes a sheet. Tab from the top: "Skip to main content" appears first.
- [ ] Post the **Phase 7 report**. Mention that the shared hooks and flags (spec §7.8–7.9) are delivered in this phase. Then **STOP** until the owner approves.

---

# Phase 8 — Reference feature ("Items")

Scope (spec §8): one complete feature in `src/features/example/` that shows every pattern:
- a list page with DataTable, server-side pagination, debounced URL-synced search, filters and QueryState
- a detail page with a skeleton, retry and 404 handling
- a create/edit form with Zod, RHF, server error mapping, toast and invalidation
- delete via `useConfirm` with an optimistic update and rollback
- MSW handlers with realistic fixtures, latency and errors
- tests, and full `en` + `es` translations

Feature layout (the Plop generator in Phase 9 produces the same shape):

```
src/features/example/
├── api/         items-api.ts (hand-written service), item-keys.ts, item-queries.ts
├── hooks/       use-items.ts, use-item.ts, use-item-mutations.ts
├── schemas/     item.ts (API + form schemas)
├── types/       item.ts
├── components/  pages, table, toolbar, form, details, delete button, status badge, export
└── index.ts     the feature's public API: the only thing other code imports
```

### Task 8.1: Domain types, schemas and the `items` namespace

**Files:**
- Create:
  - `src/features/example/types/item.ts`
  - `src/features/example/schemas/item.ts`, `item.test.ts`
  - `src/features/example/index.ts`
  - `src/locales/en/items.json`, `src/locales/es/items.json`
  - `src/lib/csv.ts`, `src/lib/csv.test.ts`
- Modify:
  - `src/core/i18n/resources.ts`: register `items`, and add plop anchors
  - `src/locales/{en,es}/errors.json`

**Interfaces:**
- Produces (from `@/features/example`):
  - `ITEM_STATUSES = ['draft', 'active', 'archived'] as const`, `type ItemStatus`
  - `ITEM_SORT_FIELDS = ['name', 'price', 'quantity', 'updatedAt'] as const`, `type ItemSortField`
  - `interface Item { id; name; description; status; price; quantity; createdAt; updatedAt }` (dates are ISO strings)
  - `interface ItemList { items: Item[]; total; page; pageSize }`
  - `interface ItemListParams { page; pageSize; q?; status?; sort?; order? }`
  - `itemSchema`, `itemListSchema` (API validation)
  - `itemFormSchema`, `type ItemFormValues = { name; description; status; price; quantity }`
  - `ITEM_FORM_DEFAULTS`
- Produces: `toCsv(rows: readonly (readonly unknown[])[]): string` from `@/lib/csv`
- Produces: the `items` i18n namespace, and `errors:codes.ITEM_LOCKED`
- Produces: the resources anchors `// plop:resources-imports`, `// plop:resources-en` and `// plop:resources-es`

- [ ] **Step 1: Create `src/locales/en/items.json`**

```json
{
  "list": {
    "title": "Items",
    "description": "Everything in your catalogue, searchable and sortable.",
    "searchLabel": "Search items",
    "searchPlaceholder": "Search by name or description…",
    "statusLabel": "Filter by status",
    "allStatuses": "All statuses",
    "caption": "Items",
    "refreshing": "Refreshing",
    "emptyTitle": "No items yet",
    "emptyDescription": "Create your first item to get started.",
    "noResultsTitle": "No items match",
    "noResultsDescription": "Try a different search, or clear the filters.",
    "clearFilters": "Clear filters"
  },
  "fields": {
    "id": "ID",
    "name": "Name",
    "description": "Description",
    "status": "Status",
    "price": "Price",
    "quantity": "Quantity",
    "createdAt": "Created",
    "updatedAt": "Updated",
    "actions": "Actions"
  },
  "status": {
    "draft": "Draft",
    "active": "Active",
    "archived": "Archived"
  },
  "actions": {
    "create": "New item",
    "edit": "Edit",
    "editItem": "Edit {{name}}",
    "deleteItem": "Delete {{name}}",
    "copyId": "Copy ID",
    "copied": "Copied",
    "export": "Export CSV"
  },
  "detail": {
    "title": "Item details",
    "notFoundTitle": "Item not found",
    "notFoundDescription": "It may have been deleted, or the link is wrong."
  },
  "create": {
    "title": "New item",
    "submit": "Create item"
  },
  "edit": {
    "title": "Edit item",
    "heading": "Edit {{name}}",
    "submit": "Save changes"
  },
  "form": {
    "namePlaceholder": "e.g. Desk lamp",
    "descriptionHint": "Optional. Up to 500 characters.",
    "priceHint": "In {{currency}}."
  },
  "delete": {
    "title": "Delete {{name}}?",
    "description": "This permanently removes the item.",
    "confirm": "Delete"
  },
  "toast": {
    "created": "Created {{name}}",
    "updated": "Saved {{name}}",
    "deleted": "Deleted {{name}}"
  }
}
```

- [ ] **Step 2: Create `src/locales/es/items.json`**

```json
{
  "list": {
    "title": "Elementos",
    "description": "Todo tu catálogo, con búsqueda y orden.",
    "searchLabel": "Buscar elementos",
    "searchPlaceholder": "Busca por nombre o descripción…",
    "statusLabel": "Filtrar por estado",
    "allStatuses": "Todos los estados",
    "caption": "Elementos",
    "refreshing": "Actualizando",
    "emptyTitle": "Aún no hay elementos",
    "emptyDescription": "Crea tu primer elemento para empezar.",
    "noResultsTitle": "Ningún elemento coincide",
    "noResultsDescription": "Prueba otra búsqueda o quita los filtros.",
    "clearFilters": "Quitar filtros"
  },
  "fields": {
    "id": "ID",
    "name": "Nombre",
    "description": "Descripción",
    "status": "Estado",
    "price": "Precio",
    "quantity": "Cantidad",
    "createdAt": "Creado",
    "updatedAt": "Actualizado",
    "actions": "Acciones"
  },
  "status": {
    "draft": "Borrador",
    "active": "Activo",
    "archived": "Archivado"
  },
  "actions": {
    "create": "Nuevo elemento",
    "edit": "Editar",
    "editItem": "Editar {{name}}",
    "deleteItem": "Eliminar {{name}}",
    "copyId": "Copiar ID",
    "copied": "Copiado",
    "export": "Exportar CSV"
  },
  "detail": {
    "title": "Detalle del elemento",
    "notFoundTitle": "Elemento no encontrado",
    "notFoundDescription": "Puede que se haya eliminado o que el enlace sea incorrecto."
  },
  "create": {
    "title": "Nuevo elemento",
    "submit": "Crear elemento"
  },
  "edit": {
    "title": "Editar elemento",
    "heading": "Editar {{name}}",
    "submit": "Guardar cambios"
  },
  "form": {
    "namePlaceholder": "p. ej., Lámpara de escritorio",
    "descriptionHint": "Opcional. Hasta 500 caracteres.",
    "priceHint": "En {{currency}}."
  },
  "delete": {
    "title": "¿Eliminar {{name}}?",
    "description": "Esto elimina el elemento de forma permanente.",
    "confirm": "Eliminar"
  },
  "toast": {
    "created": "Se creó {{name}}",
    "updated": "Se guardó {{name}}",
    "deleted": "Se eliminó {{name}}"
  }
}
```

- [ ] **Step 3: Add the backend-specific error code**

This shows how backend error codes get translated.

Deep-merge into `src/locales/en/errors.json`:

```json
{ "codes": { "ITEM_LOCKED": "This item is locked and can't be deleted." } }
```

Deep-merge into `src/locales/es/errors.json`:

```json
{ "codes": { "ITEM_LOCKED": "Este elemento está bloqueado y no se puede eliminar." } }
```

- [ ] **Step 4: Register the namespace, with generator anchors (replace `src/core/i18n/resources.ts`)**

```ts
import type { Locale } from '@/config/constants';
import enCommon from '@/locales/en/common.json';
import enErrors from '@/locales/en/errors.json';
import enItems from '@/locales/en/items.json';
import enValidation from '@/locales/en/validation.json';
import esCommon from '@/locales/es/common.json';
import esErrors from '@/locales/es/errors.json';
import esItems from '@/locales/es/items.json';
import esValidation from '@/locales/es/validation.json';
// plop:resources-imports

/** English is the source of truth: its keys define the TypeScript key types. */
const en = {
  common: enCommon,
  errors: enErrors,
  validation: enValidation,
  items: enItems,
  // plop:resources-en
};

/** Every other locale must provide every English key (checked by the compiler and resources.test.ts). */
const es: typeof en = {
  common: esCommon,
  errors: esErrors,
  validation: esValidation,
  items: esItems,
  // plop:resources-es
};

export const resources = { en, es } satisfies Record<Locale, typeof en>;

export const defaultNS = 'common';
export type Namespace = keyof typeof en;
export const namespaces = Object.keys(en) as Namespace[];
```

- [ ] **Step 5: Write the failing tests**

`src/lib/csv.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { toCsv } from './csv';

describe('toCsv', () => {
  it('joins rows with CRLF and quotes values that need it', () => {
    expect(
      toCsv([
        ['Name', 'Note'],
        ['Lamp', 'plain'],
        ['Desk, large', 'says "hi"'],
        ['Multi\nline', 42],
      ]),
    ).toBe('Name,Note\r\nLamp,plain\r\n"Desk, large","says ""hi"""\r\n"Multi\nline",42');
  });

  it('neutralises spreadsheet formula injection', () => {
    expect(toCsv([['=SUM(A1:A9)', '+1', '-2', '@x']])).toBe("'=SUM(A1:A9),'+1,'-2,'@x");
  });
});
```

`src/features/example/schemas/item.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ITEM_FORM_DEFAULTS, itemFormSchema, itemListSchema } from './item';

const valid = { name: 'Desk lamp', description: '', status: 'active', price: 19.99, quantity: 3 } as const;

describe('itemFormSchema', () => {
  it('accepts a valid item and the empty defaults fail with translated messages', () => {
    expect(itemFormSchema.parse(valid)).toEqual(valid);

    const result = itemFormSchema.safeParse(ITEM_FORM_DEFAULTS);
    expect(result.success).toBe(false);
    expect(z.flattenError(result.error!).fieldErrors.name).toEqual(['Use at least 2 characters']);
  });

  it('rejects negative numbers and non-numbers', () => {
    const result = itemFormSchema.safeParse({ ...valid, price: -1, quantity: Number.NaN });
    expect(z.flattenError(result.error!).fieldErrors).toMatchObject({
      price: ['Must be at least 0'],
      quantity: ['Enter a valid value'],
    });
  });
});

describe('itemListSchema', () => {
  it('validates list responses at the API boundary', () => {
    expect(itemListSchema.safeParse({ items: [], total: 0, page: 1, pageSize: 10 }).success).toBe(true);
    expect(itemListSchema.safeParse({ items: [{ id: 1 }], total: 'x' }).success).toBe(false);
  });
});
```

Run: `pnpm exec vitest run src/lib/csv.test.ts src/features/example`
Expected: FAIL, because the modules are missing.

- [ ] **Step 6: Create `src/lib/csv.ts`**

```ts
const NEEDS_QUOTES = /[",\r\n]/;
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value as string | number | boolean);
  // A leading =, +, - or @ makes spreadsheets evaluate the cell (CSV injection); prefix a quote.
  if (FORMULA_START.test(text)) text = `'${text}`;
  return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 CSV (CRLF line endings), safe to open in spreadsheet apps. */
export function toCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}
```

- [ ] **Step 7: Create `src/features/example/types/item.ts`**

```ts
export const ITEM_STATUSES = ['draft', 'active', 'archived'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** Fields the list can be sorted by (server-side). */
export const ITEM_SORT_FIELDS = ['name', 'price', 'quantity', 'updatedAt'] as const;
export type ItemSortField = (typeof ITEM_SORT_FIELDS)[number];

export interface Item {
  id: string;
  name: string;
  description: string;
  status: ItemStatus;
  /** In major units of VITE_DEFAULT_CURRENCY (e.g. 19.99). */
  price: number;
  quantity: number;
  /** ISO-8601. */
  createdAt: string;
  /** ISO-8601. */
  updatedAt: string;
}

export interface ItemList {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ItemListParams {
  /** 1-based. */
  page: number;
  pageSize: number;
  q?: string;
  status?: ItemStatus;
  sort?: ItemSortField;
  order?: 'asc' | 'desc';
}
```

- [ ] **Step 8: Create `src/features/example/schemas/item.ts`**

```ts
import { z } from 'zod';

import { ITEM_STATUSES } from '../types/item';

/** API response validation (spec Principle 6): the contract is checked where data enters the app. */
export const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(ITEM_STATUSES),
  price: z.number(),
  quantity: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const itemListSchema = z.object({
  items: z.array(itemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

/** The create/edit form. Messages come from the global Zod error map, translated. */
export const itemFormSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500),
  status: z.enum(ITEM_STATUSES),
  price: z.number().min(0).max(1_000_000),
  quantity: z.number().int().min(0).max(1_000_000),
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;

export const ITEM_FORM_DEFAULTS: ItemFormValues = {
  name: '',
  description: '',
  status: 'draft',
  price: 0,
  quantity: 0,
};
```

- [ ] **Step 9: Create `src/features/example/index.ts`**

Tasks 8.3–8.5 extend it.

```ts
/**
 * Public API of the reference feature. Other code imports ONLY from '@/features/example'
 * (ESLint forbids '@/features/example/*').
 */
export {
  ITEM_FORM_DEFAULTS,
  itemFormSchema,
  itemListSchema,
  itemSchema,
  type ItemFormValues,
} from './schemas/item';
export {
  ITEM_SORT_FIELDS,
  ITEM_STATUSES,
  type Item,
  type ItemList,
  type ItemListParams,
  type ItemSortField,
  type ItemStatus,
} from './types/item';
```

Run: `pnpm exec vitest run src/lib src/features/example src/core/i18n`
Expected: PASS. The resource tests now also cover `items`.

- [ ] **Step 10: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(example): add item types, schemas, translations and csv helper" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8.2: Mock Items API with realistic fixtures, latency and errors

**Files:**
- Create: `src/mocks/fixtures/items.ts`, `src/mocks/handlers/items.ts`, `src/mocks/handlers/items.test.ts`
- Modify: `src/mocks/db.ts`, `src/mocks/handlers/auth.ts` (export the session lookup), `src/mocks/handlers.ts`

**Interfaces:**
- Produces:
  - `GET /items?page&pageSize&q&status&sort&order` → `ItemList`. `q=error` returns a 500, to demonstrate `ErrorState`.
  - `GET /items/:itemId` → `Item`, or 404.
  - `POST /items` → 201 `Item`. Invalid input gets 422 `{ code: 'VALIDATION_ERROR', details: { fields } }`, and a duplicate name gets 422 with `fields.name = 'ALREADY_EXISTS'`.
  - `PATCH /items/:itemId` → 200 `Item`; 404; 422 as above.
  - `DELETE /items/:itemId` → 204; 404. The fixture `item-locked` gets 409 `{ code: 'ITEM_LOCKED' }`, to demonstrate optimistic rollback.
  - Every write requires the matching `items.*` permission (403 otherwise), and reads require `items.read`.
  - `queryItems(items, params): ItemList`, pure and unit-tested
  - `createItemFixtures(): Item[]`: 25 deterministic items, including `item-locked`
  - `mockDb.items`
  - `findSessionUser(cookies)`, exported from the auth handlers

- [ ] **Step 1: Create `src/mocks/fixtures/items.ts`**

```ts
import type { Item, ItemStatus } from '@/features/example';

const NAMES = [
  'Desk lamp', 'Notebook A5', 'Wireless mouse', 'Mechanical keyboard', 'Monitor stand', 'USB-C hub',
  'Office chair', 'Standing desk', 'Water bottle', 'Backpack', 'Headphones', 'Webcam', 'Desk mat',
  'Cable organiser', 'Whiteboard', 'Marker set', 'Paper tray', 'Stapler', 'Plant pot', 'Coffee mug',
  'Bookshelf', 'Filing cabinet', 'Laptop sleeve', 'Phone stand',
];
const STATUS_CYCLE: readonly ItemStatus[] = ['active', 'active', 'draft', 'archived'];
const DAY_MS = 86_400_000;
const BASE = Date.UTC(2026, 0, 1);

/** Deterministic demo data: 24 regular items plus one whose delete always fails. */
export function createItemFixtures(): Item[] {
  const regular = NAMES.map<Item>((name, index) => ({
    id: `item-${String(index + 1).padStart(3, '0')}`,
    name,
    description: `${name} from the demo catalogue.`,
    status: STATUS_CYCLE[index % STATUS_CYCLE.length] ?? 'active',
    price: Math.round((9.5 + index * 7.25) * 100) / 100,
    quantity: (index * 13) % 120,
    createdAt: new Date(BASE + index * DAY_MS).toISOString(),
    updatedAt: new Date(BASE + index * 2 * DAY_MS).toISOString(),
  }));
  return [
    ...regular,
    {
      id: 'item-locked',
      name: 'Locked sample',
      description: 'Deleting this item fails on purpose, to show the optimistic rollback.',
      status: 'active',
      price: 1,
      quantity: 1,
      createdAt: new Date(BASE).toISOString(),
      updatedAt: new Date(BASE).toISOString(),
    },
  ];
}
```

- [ ] **Step 2: Extend the mock DB (replace `src/mocks/db.ts`)**

```ts
import type { Item } from '@/features/example';

import { createItemFixtures } from './fixtures/items';

/**
 * In-memory state of the mock backend. It resets on page reload (the browser keeps the session through
 * the mock cookie) and after every test (src/test/setup.ts calls resetMockDb).
 */
export const mockDb: { sessionUserId: string | null; items: Item[] } = {
  sessionUserId: null,
  items: createItemFixtures(),
};

export function resetMockDb(): void {
  mockDb.sessionUserId = null;
  mockDb.items = createItemFixtures();
}
```

- [ ] **Step 3: Export the session lookup (edit `src/mocks/handlers/auth.ts`)**

Rename `currentUser` to `findSessionUser` in all four places, and export it:

```ts
/** The signed-in mock user, from the cookie (browser) or the in-memory session (jsdom). */
export function findSessionUser(cookies: Record<string, string>): MockUser | undefined {
  const id = cookies[MOCK_SESSION_COOKIE] ?? mockDb.sessionUserId;
  return MOCK_USERS.find((user) => user.id === id);
}
```

- [ ] **Step 4: Write the failing test `src/mocks/handlers/items.test.ts`**

```ts
import { describe, expect, it } from 'vitest';

import { createItemFixtures } from '../fixtures/items';

import { queryItems } from './items';

const items = createItemFixtures();

describe('queryItems (mock backend logic)', () => {
  it('paginates', () => {
    const page = queryItems(items, { page: 3, pageSize: 10 });
    expect(page).toMatchObject({ total: 25, page: 3, pageSize: 10 });
    expect(page.items).toHaveLength(5);
  });

  it('searches name and description case-insensitively and filters by status', () => {
    expect(queryItems(items, { page: 1, pageSize: 50, q: 'DESK' }).items.map((item) => item.name)).toEqual([
      'Desk lamp',
      'Standing desk',
      'Desk mat',
    ]);
    expect(queryItems(items, { page: 1, pageSize: 50, status: 'archived' }).items.every((item) => item.status === 'archived')).toBe(true);
  });

  it('sorts in either direction', () => {
    const byPrice = queryItems(items, { page: 1, pageSize: 50, sort: 'price', order: 'desc' }).items;
    expect(byPrice[0]?.price).toBeGreaterThanOrEqual(byPrice[1]?.price ?? 0);
    expect(queryItems(items, { page: 1, pageSize: 1, sort: 'name', order: 'asc' }).items[0]?.name).toBe('Backpack');
  });
});
```

Run: `pnpm exec vitest run src/mocks/handlers/items.test.ts`
Expected: FAIL, because `./items` is missing.

- [ ] **Step 5: Create `src/mocks/handlers/items.ts`**

```ts
import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';

import type { Permission } from '@/config/permissions';
import {
  ITEM_SORT_FIELDS,
  ITEM_STATUSES,
  itemFormSchema,
  type Item,
  type ItemList,
  type ItemListParams,
} from '@/features/example';
import { createRequestId } from '@/lib/id';

import { apiUrl } from '../api-url';
import { mockDb } from '../db';

import { findSessionUser } from './auth';

const listParamsSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10),
  q: z.string().optional(),
  status: z.enum(ITEM_STATUSES).optional().catch(undefined),
  sort: z.enum(ITEM_SORT_FIELDS).optional().catch(undefined),
  order: z.enum(['asc', 'desc']).optional().catch(undefined),
});

/** Filtering, sorting and paging exactly as a real backend would do them. */
export function queryItems(items: readonly Item[], params: ItemListParams): ItemList {
  const q = params.q?.trim().toLowerCase();
  let result = items.filter(
    (item) =>
      (!q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)) &&
      (!params.status || item.status === params.status),
  );
  if (params.sort) {
    const { sort } = params;
    const direction = params.order === 'desc' ? -1 : 1;
    result = [...result].sort((a, b) => {
      const left = a[sort];
      const right = b[sort];
      const order = typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right));
      return order * direction;
    });
  }
  const start = (params.page - 1) * params.pageSize;
  return {
    items: result.slice(start, start + params.pageSize),
    total: result.length,
    page: params.page,
    pageSize: params.pageSize,
  };
}

function forbiddenUnless(cookies: Record<string, string>, permission: Permission) {
  const user = findSessionUser(cookies);
  if (!user) return HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  if (!user.permissions.includes(permission)) return HttpResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
  return null;
}

function validationError(fields: Record<string, string>) {
  return HttpResponse.json({ code: 'VALIDATION_ERROR', details: { fields } }, { status: 422 });
}

const nameTaken = (name: string, exceptId?: string) =>
  mockDb.items.some((item) => item.id !== exceptId && item.name.toLowerCase() === name.trim().toLowerCase());

async function readForm(request: Request) {
  return itemFormSchema.safeParse(await request.json());
}

export const itemHandlers = [
  http.get(apiUrl('/items'), async ({ request, cookies }) => {
    await delay();
    const denied = forbiddenUnless(cookies, 'items.read');
    if (denied) return denied;
    const params = listParamsSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    if (params.q === 'error') return HttpResponse.json({ code: 'SERVER_ERROR' }, { status: 500 });
    return HttpResponse.json(queryItems(mockDb.items, params));
  }),

  http.get<{ itemId: string }>(apiUrl('/items/:itemId'), async ({ params, cookies }) => {
    await delay();
    const denied = forbiddenUnless(cookies, 'items.read');
    if (denied) return denied;
    const item = mockDb.items.find((candidate) => candidate.id === params.itemId);
    return item ? HttpResponse.json(item) : HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
  }),

  http.post(apiUrl('/items'), async ({ request, cookies }) => {
    await delay();
    const denied = forbiddenUnless(cookies, 'items.create');
    if (denied) return denied;
    const form = await readForm(request);
    if (!form.success) return validationError({ form: 'INVALID' });
    if (nameTaken(form.data.name)) return validationError({ name: 'ALREADY_EXISTS' });

    const now = new Date().toISOString();
    const item: Item = { ...form.data, id: `item-${createRequestId().slice(0, 8)}`, createdAt: now, updatedAt: now };
    mockDb.items = [item, ...mockDb.items];
    return HttpResponse.json(item, { status: 201 });
  }),

  http.patch<{ itemId: string }>(apiUrl('/items/:itemId'), async ({ request, params, cookies }) => {
    await delay();
    const denied = forbiddenUnless(cookies, 'items.update');
    if (denied) return denied;
    const existing = mockDb.items.find((candidate) => candidate.id === params.itemId);
    if (!existing) return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    const form = await readForm(request);
    if (!form.success) return validationError({ form: 'INVALID' });
    if (nameTaken(form.data.name, existing.id)) return validationError({ name: 'ALREADY_EXISTS' });

    const updated: Item = { ...existing, ...form.data, updatedAt: new Date().toISOString() };
    mockDb.items = mockDb.items.map((item) => (item.id === updated.id ? updated : item));
    return HttpResponse.json(updated);
  }),

  http.delete<{ itemId: string }>(apiUrl('/items/:itemId'), async ({ params, cookies }) => {
    await delay();
    const denied = forbiddenUnless(cookies, 'items.delete');
    if (denied) return denied;
    if (params.itemId === 'item-locked') return HttpResponse.json({ code: 'ITEM_LOCKED' }, { status: 409 });
    if (!mockDb.items.some((item) => item.id === params.itemId)) {
      return HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    }
    mockDb.items = mockDb.items.filter((item) => item.id !== params.itemId);
    return new HttpResponse(null, { status: 204 });
  }),
];
```

- [ ] **Step 6: Register them (in `src/mocks/handlers.ts`)**

Add `import { itemHandlers } from './handlers/items';`, then add `...itemHandlers,` after `...authHandlers,`.

Run: `pnpm exec vitest run src/mocks`
Expected: PASS.

- [ ] **Step 7: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(mocks): add items api with fixtures, latency, permissions and simulated errors" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8.3: Items service, query keys, queries and mutation hooks

**Files:**
- Create:
  - `src/features/example/api/items-api.ts`, `item-keys.ts`, `item-queries.ts`, `items-api.test.ts`
  - `src/features/example/hooks/use-items.ts`, `use-item.ts`, `use-item-mutations.ts`, `use-item-mutations.test.tsx`
- Modify: `src/features/example/index.ts`

**Interfaces:**
- Produces:
  - `itemsApi.list(params, signal?)`, `.get(id, signal?)`, `.create(input)`, `.update(id, input)`, `.remove(id)`. Every response is Zod-validated.
  - `itemKeys.all`, `.lists()`, `.list(params)`, `.details()`, `.detail(id)`
  - `itemListQuery(params)` (keeps the previous page's data while the next one loads) and `itemDetailQuery(id)`
  - `useItems(params)`, `useItem(id)`
  - `useCreateItem()` and `useUpdateItem(id)`:
    - `meta.silent`, so the form handles errors itself
    - on success they seed the detail cache and invalidate the lists
  - `useDeleteItem()`:
    - optimistic removal from every cached list, with rollback on error
    - the global error toast stays on
    - on settle it invalidates the lists

- [ ] **Step 1: Write the failing tests**

`src/features/example/api/items-api.test.ts`:

```ts
import { http as mock, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { apiUrl } from '@/mocks/api-url';
import { mockDb } from '@/mocks/db';
import { MOCK_USER_IDS } from '@/mocks/fixtures/users';
import { server } from '@/mocks/server';

import { itemsApi } from './items-api';

describe('itemsApi', () => {
  beforeEach(() => {
    mockDb.sessionUserId = MOCK_USER_IDS.admin;
  });

  it('sends only the list parameters that are set', async () => {
    let search = '';
    server.use(
      mock.get(apiUrl('/items'), ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json({ items: [], total: 0, page: 2, pageSize: 10 });
      }),
    );

    await itemsApi.list({ page: 2, pageSize: 10, q: '', status: 'active' });

    expect(search).toBe('?page=2&pageSize=10&status=active');
  });

  it('rejects responses that break the contract', async () => {
    server.use(mock.get(apiUrl('/items/x'), () => HttpResponse.json({ id: 'x' })));
    await expect(itemsApi.get('x')).rejects.toThrow();
  });

  it('creates, reads and deletes against the mock backend', async () => {
    const created = await itemsApi.create({ name: 'Brand new', description: '', status: 'draft', price: 5, quantity: 1 });

    await expect(itemsApi.get(created.id)).resolves.toMatchObject({ name: 'Brand new' });
    await itemsApi.remove(created.id);
    await expect(itemsApi.get(created.id)).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('surfaces duplicate names as field errors', async () => {
    await expect(
      itemsApi.create({ name: 'desk lamp', description: '', status: 'draft', price: 1, quantity: 1 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', details: { fields: { name: 'ALREADY_EXISTS' } } });
  });
});
```

`src/features/example/hooks/use-item-mutations.test.tsx`:

```tsx
import { beforeEach, describe, expect, it } from 'vitest';

import { mockDb } from '@/mocks/db';
import { MOCK_USER_IDS } from '@/mocks/fixtures/users';
import { createTestQueryClient, renderHook, waitFor } from '@/test/render';

import { itemKeys } from '../api/item-keys';
import { itemsApi } from '../api/items-api';
import type { ItemList } from '../types/item';

import { useCreateItem, useDeleteItem } from './use-item-mutations';

const params = { page: 1, pageSize: 50 };
const hasItem = (list: ItemList | undefined, id: string) => list?.items.some((item) => item.id === id);

describe('item mutations', () => {
  beforeEach(() => {
    mockDb.sessionUserId = MOCK_USER_IDS.admin;
  });

  it('delete removes the item optimistically and rolls back when the server refuses', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(itemKeys.list(params), await itemsApi.list(params));
    const { result } = renderHook(() => useDeleteItem(), { queryClient });

    const deletion = result.current.mutateAsync('item-locked');
    await waitFor(() => {
      expect(hasItem(queryClient.getQueryData(itemKeys.list(params)), 'item-locked')).toBe(false);
    });

    await expect(deletion).rejects.toMatchObject({ code: 'ITEM_LOCKED', status: 409 });
    expect(hasItem(queryClient.getQueryData(itemKeys.list(params)), 'item-locked')).toBe(true);
  });

  it('delete keeps the item removed when the server agrees', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(itemKeys.list(params), await itemsApi.list(params));
    const { result } = renderHook(() => useDeleteItem(), { queryClient });

    await result.current.mutateAsync('item-001');

    expect(hasItem(queryClient.getQueryData(itemKeys.list(params)), 'item-001')).toBe(false);
    expect(mockDb.items.some((item) => item.id === 'item-001')).toBe(false);
  });

  it('create seeds the detail cache with the new item', async () => {
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useCreateItem(), { queryClient });

    const item = await result.current.mutateAsync({ name: 'Fresh item', description: '', status: 'active', price: 3, quantity: 2 });

    expect(queryClient.getQueryData(itemKeys.detail(item.id))).toEqual(item);
  });
});
```

Run: `pnpm exec vitest run src/features/example`
Expected: FAIL, because the modules are missing.

- [ ] **Step 2: Create `src/features/example/api/items-api.ts`**

```ts
import { http } from '@/core/api';

import { itemListSchema, itemSchema, type ItemFormValues } from '../schemas/item';
import type { Item, ItemList, ItemListParams } from '../types/item';

/** Only parameters that are actually set go into the query string. */
function toQuery(params: ItemListParams): Record<string, number | string> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  ) as Record<string, number | string>;
}

const segment = (id: string) => encodeURIComponent(id);

/**
 * Hand-written service: the pattern for backends without an OpenAPI spec (docs/api-codegen.md shows
 * the generated alternative). Every response is validated, so contract drift fails here, loudly.
 */
export const itemsApi = {
  async list(params: ItemListParams, signal?: AbortSignal): Promise<ItemList> {
    const { data } = await http.get<unknown>('/items', { params: toQuery(params), signal });
    return itemListSchema.parse(data);
  },
  async get(id: string, signal?: AbortSignal): Promise<Item> {
    const { data } = await http.get<unknown>(`/items/${segment(id)}`, { signal });
    return itemSchema.parse(data);
  },
  async create(input: ItemFormValues): Promise<Item> {
    const { data } = await http.post<unknown>('/items', input);
    return itemSchema.parse(data);
  },
  async update(id: string, input: ItemFormValues): Promise<Item> {
    const { data } = await http.patch<unknown>(`/items/${segment(id)}`, input);
    return itemSchema.parse(data);
  },
  async remove(id: string): Promise<void> {
    await http.delete(`/items/${segment(id)}`);
  },
};
```

- [ ] **Step 3: Create the key factory and query options**

`src/features/example/api/item-keys.ts`:

```ts
import type { ItemListParams } from '../types/item';

/** Query keys for this feature (spec §6.2). Invalidate broadly with `itemKeys.lists()`. */
export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (params: ItemListParams) => [...itemKeys.lists(), params] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
};
```

`src/features/example/api/item-queries.ts`:

```ts
import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import type { ItemListParams } from '../types/item';

import { itemKeys } from './item-keys';
import { itemsApi } from './items-api';

export const itemListQuery = (params: ItemListParams) =>
  queryOptions({
    queryKey: itemKeys.list(params),
    queryFn: ({ signal }) => itemsApi.list(params, signal),
    placeholderData: keepPreviousData, // keep the current page on screen while the next one loads
  });

export const itemDetailQuery = (id: string) =>
  queryOptions({
    queryKey: itemKeys.detail(id),
    queryFn: ({ signal }) => itemsApi.get(id, signal),
  });
```

- [ ] **Step 4: Create the hooks**

`src/features/example/hooks/use-items.ts`:

```ts
import { useQuery } from '@tanstack/react-query';

import { itemListQuery } from '../api/item-queries';
import type { ItemListParams } from '../types/item';

export function useItems(params: ItemListParams) {
  return useQuery(itemListQuery(params));
}
```

`src/features/example/hooks/use-item.ts`:

```ts
import { useQuery } from '@tanstack/react-query';

import { itemDetailQuery } from '../api/item-queries';

export function useItem(id: string) {
  return useQuery(itemDetailQuery(id));
}
```

`src/features/example/hooks/use-item-mutations.ts`:

```ts
import { type QueryKey, useMutation } from '@tanstack/react-query';

import { itemKeys } from '../api/item-keys';
import { itemsApi } from '../api/items-api';
import type { ItemFormValues } from '../schemas/item';
import type { ItemList } from '../types/item';

export function useCreateItem() {
  return useMutation({
    mutationFn: (input: ItemFormValues) => itemsApi.create(input),
    meta: { silent: true }, // the form shows field errors, or its own toast
    onSuccess: (item, _input, _result, context) => {
      context.client.setQueryData(itemKeys.detail(item.id), item);
      return context.client.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

export function useUpdateItem(id: string) {
  return useMutation({
    mutationFn: (input: ItemFormValues) => itemsApi.update(id, input),
    meta: { silent: true },
    onSuccess: (item, _input, _result, context) => {
      context.client.setQueryData(itemKeys.detail(item.id), item);
      return context.client.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}

interface DeleteSnapshot {
  lists: [QueryKey, ItemList | undefined][];
}

/**
 * Optimistic delete (spec §8): the item disappears from every cached list at once and comes back if
 * the server refuses. The global mutation toast explains why (e.g. errors:codes.ITEM_LOCKED).
 */
export function useDeleteItem() {
  return useMutation({
    mutationFn: (id: string) => itemsApi.remove(id),
    onMutate: async (id, context): Promise<DeleteSnapshot> => {
      await context.client.cancelQueries({ queryKey: itemKeys.lists() });
      const lists = context.client.getQueriesData<ItemList>({ queryKey: itemKeys.lists() });
      context.client.setQueriesData<ItemList>({ queryKey: itemKeys.lists() }, (list) =>
        list
          ? { ...list, items: list.items.filter((item) => item.id !== id), total: Math.max(0, list.total - 1) }
          : list,
      );
      return { lists };
    },
    onError: (_error, _id, snapshot, context) => {
      for (const [key, data] of snapshot?.lists ?? []) context.client.setQueryData(key, data);
    },
    onSuccess: (_data, id, _snapshot, context) => {
      context.client.removeQueries({ queryKey: itemKeys.detail(id) });
    },
    onSettled: (_data, _error, _id, _snapshot, context) =>
      context.client.invalidateQueries({ queryKey: itemKeys.lists() }),
  });
}
```

- [ ] **Step 5: Export them (append to `src/features/example/index.ts`)**

```ts
export { itemKeys } from './api/item-keys';
export { itemDetailQuery, itemListQuery } from './api/item-queries';
export { itemsApi } from './api/items-api';
export { useItem } from './hooks/use-item';
export { useCreateItem, useDeleteItem, useUpdateItem } from './hooks/use-item-mutations';
export { useItems } from './hooks/use-items';
```

Run: `pnpm exec vitest run src/features/example`
Expected: PASS.

If the installed TanStack Query still passes the older callback arguments (no `context` parameter), use `useQueryClient()` inside each hook instead of `context.client`, and record the change.

- [ ] **Step 6: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(example): add items service, query keys and optimistic mutation hooks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8.4: Feature components (table, toolbar, form, details, delete, export)

**Files:**
- Create in `src/features/example/components/`:
  - `item-status-badge.tsx`, `delete-item-button.tsx`, `items-table.tsx`, `items-toolbar.tsx`, `export-items-button.tsx`, `item-details.tsx`, `item-form.tsx`
  - tests: `delete-item-button.test.tsx`, `items-table.test.tsx`, `export-items-button.test.tsx`, `item-details.test.tsx`, `item-form.test.tsx`
- Modify: `docs/forms.md`

**Interfaces:**
- Consumes: the hooks and schemas (Tasks 8.1–8.3), `DataTable`, `Can`, `useConfirm`, `notify`, `applyServerErrors`, `useUnsavedChangesWarning`, `useCopyToClipboard`, `useFeature`, the formatters, `toCsv`.
- Produces:
  - `<ItemStatusBadge status />`
  - `<DeleteItemButton item onDeleted? variant?: 'icon' | 'button' />`. It confirms, deletes optimistically, and toasts on success.
  - `<ItemsTable data pagination onPaginationChange sorting onSortingChange />`. Edit and delete appear only with `items.update` / `items.delete`.
  - `<ItemsToolbar search onSearchChange status onStatusChange isFetching />`
  - `<ExportItemsButton items />`, rendered only when the `itemsExport` flag is on
  - `<ItemDetails item />`
  - `<ItemForm defaultValues? submitLabel onSubmit />`:
    - Zod + RHF
    - maps server field errors, or toasts the error
    - shows a loading submit button
    - warns about unsaved changes

- [ ] **Step 1: Write the failing tests**

`src/features/example/components/delete-item-button.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { notify } from '@/core/notify';
import { mockDb } from '@/mocks/db';
import { MOCK_USER_IDS } from '@/mocks/fixtures/users';
import { render, screen, waitFor } from '@/test/render';

import { DeleteItemButton } from './delete-item-button';

describe('DeleteItemButton', () => {
  beforeEach(() => {
    mockDb.sessionUserId = MOCK_USER_IDS.admin;
  });

  it('asks first, then deletes and reports success', async () => {
    const onDeleted = vi.fn();
    const success = vi.spyOn(notify, 'success');
    const user = userEvent.setup();
    render(<DeleteItemButton item={{ id: 'item-001', name: 'Desk lamp' }} onDeleted={onDeleted} />);

    await user.click(screen.getByRole('button', { name: 'Delete Desk lamp' }));
    expect(await screen.findByRole('alertdialog', { name: 'Delete Desk lamp?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledTimes(1);
    });
    expect(success).toHaveBeenCalledWith('Deleted Desk lamp');
    expect(mockDb.items.some((item) => item.id === 'item-001')).toBe(false);
  });

  it('does nothing when the user cancels', async () => {
    const user = userEvent.setup();
    render(<DeleteItemButton item={{ id: 'item-001', name: 'Desk lamp' }} />);

    await user.click(screen.getByRole('button', { name: 'Delete Desk lamp' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(mockDb.items.some((item) => item.id === 'item-001')).toBe(true);
  });
});
```

`src/features/example/components/items-table.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createItemFixtures } from '@/mocks/fixtures/items';
import { render, screen, within } from '@/test/render';

import { ItemsTable } from './items-table';

const items = createItemFixtures().slice(0, 3);
const data = { items, total: 25, page: 1, pageSize: 3 };

const renderTable = (auth: 'admin' | 'viewer', onSortingChange = vi.fn()) =>
  render(
    <ItemsTable
      data={data}
      pagination={{ pageIndex: 0, pageSize: 3 }}
      onPaginationChange={vi.fn()}
      sorting={[]}
      onSortingChange={onSortingChange}
    />,
    { auth },
  );

describe('ItemsTable', () => {
  it('renders formatted rows that link to the details', async () => {
    renderTable('admin');

    const row = (await screen.findByRole('link', { name: 'Desk lamp' })).closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('$9.50')).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Desk lamp' })).toHaveAttribute('href', '/items/item-001');
    expect(screen.getByText('25 total')).toBeInTheDocument();
  });

  it('shows edit and delete only to users allowed to use them', async () => {
    renderTable('viewer');
    await screen.findByRole('link', { name: 'Desk lamp' });

    expect(screen.queryByRole('link', { name: 'Edit Desk lamp' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Desk lamp' })).not.toBeInTheDocument();
  });

  it('asks for server-side sorting when a header is clicked', async () => {
    const onSortingChange = vi.fn();
    const user = userEvent.setup();
    renderTable('admin', onSortingChange);

    await user.click(await screen.findByRole('button', { name: /Price/ }));

    expect(onSortingChange).toHaveBeenCalledTimes(1);
  });
});
```

`src/features/example/components/export-items-button.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createEnvFlagSource, getFeatureFlagSource, setFeatureFlagSource } from '@/config/features';
import { createItemFixtures } from '@/mocks/fixtures/items';
import { render, screen } from '@/test/render';

import { ExportItemsButton } from './export-items-button';

describe('ExportItemsButton', () => {
  const original = getFeatureFlagSource();
  afterEach(() => {
    setFeatureFlagSource(original);
  });

  it('is hidden while the itemsExport flag is off', () => {
    render(<ExportItemsButton items={createItemFixtures()} />);
    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument();
  });

  it('downloads the current rows as CSV when the flag is on', async () => {
    setFeatureFlagSource(createEnvFlagSource(['itemsExport']));
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:items');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const user = userEvent.setup();

    render(<ExportItemsButton items={createItemFixtures().slice(0, 2)} />);
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(click).toHaveBeenCalledTimes(1);
    const csv = await createObjectURL.mock.calls[0]?.[0].text();
    expect(csv?.split('\r\n')).toEqual(['Name,Status,Price,Quantity', 'Desk lamp,Active,9.5,0', 'Notebook A5,Active,16.75,13']);
  });
});
```

`src/features/example/components/item-details.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createItemFixtures } from '@/mocks/fixtures/items';
import { render, screen } from '@/test/render';

import { ItemDetails } from './item-details';

const item = createItemFixtures()[1]!;

describe('ItemDetails', () => {
  it('shows every field, formatted', () => {
    render(<ItemDetails item={item} />);
    expect(screen.getByText('Notebook A5 from the demo catalogue.')).toBeInTheDocument();
    expect(screen.getByText('$16.75')).toBeInTheDocument();
    expect(screen.getByText('item-002')).toBeInTheDocument();
  });

  it('copies the id', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const user = userEvent.setup();
    render(<ItemDetails item={item} />);

    await user.click(screen.getByRole('button', { name: 'Copy ID' }));

    expect(writeText).toHaveBeenCalledWith('item-002');
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });
});
```

`src/features/example/components/item-form.test.tsx`:

```tsx
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppError } from '@/core/api';
import { notify } from '@/core/notify';
import { render, screen, waitFor } from '@/test/render';

import type { ItemFormValues } from '../schemas/item';

import { ItemForm } from './item-form';

describe('ItemForm', () => {
  it('shows translated validation errors and does not submit', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ItemForm submitLabel="Create item" onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Create item' }));

    expect(await screen.findByText('Use at least 2 characters')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits typed values', async () => {
    const onSubmit = vi.fn<(values: ItemFormValues) => Promise<void>>(() => Promise.resolve());
    const user = userEvent.setup();
    render(<ItemForm submitLabel="Create item" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), 'Desk fan');
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '24.5' } });
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '7' } });
    await user.click(screen.getByRole('button', { name: 'Create item' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Desk fan', description: '', status: 'draft', price: 24.5, quantity: 7 });
    });
  });

  it('maps server field errors onto the fields, translated', async () => {
    const onSubmit = vi.fn(() =>
      Promise.reject(new AppError({ code: 'VALIDATION_ERROR', message: 'Invalid', status: 422, details: { fields: { name: 'ALREADY_EXISTS' } } })),
    );
    const user = userEvent.setup();
    render(<ItemForm submitLabel="Create item" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), 'Desk lamp');
    await user.click(screen.getByRole('button', { name: 'Create item' }));

    expect(await screen.findByText('This value is already in use')).toBeInTheDocument();
  });

  it('toasts errors that carry no field details', async () => {
    const toast = vi.spyOn(notify, 'error');
    const onSubmit = vi.fn(() => Promise.reject(new AppError({ code: 'SERVER_ERROR', message: 'boom', status: 500 })));
    const user = userEvent.setup();
    render(<ItemForm submitLabel="Create item" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), 'Desk lamp');
    await user.click(screen.getByRole('button', { name: 'Create item' }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('The server ran into a problem. Please try again later.');
    });
  });
});
```

Run: `pnpm exec vitest run src/features/example/components`
Expected: FAIL, because the components are missing.

- [ ] **Step 2: Create `src/features/example/components/item-status-badge.tsx`**

```tsx
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';

import type { ItemStatus } from '../types/item';

const VARIANT = {
  draft: 'secondary',
  active: 'success',
  archived: 'outline',
} as const satisfies Record<ItemStatus, 'outline' | 'secondary' | 'success'>;

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const { t } = useTranslation('items');
  return <Badge variant={VARIANT[status]}>{t(`status.${status}`)}</Badge>;
}
```

- [ ] **Step 3: Create `src/features/example/components/delete-item-button.tsx`**

```tsx
import { Trash2Icon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { notify, useConfirm } from '@/core/notify';

import { useDeleteItem } from '../hooks/use-item-mutations';
import type { Item } from '../types/item';

interface DeleteItemButtonProps {
  item: Pick<Item, 'id' | 'name'>;
  /** Called after the server confirmed the delete, e.g. to leave the detail page. */
  onDeleted?: () => void;
  /** `icon` for table rows, `button` for page headers. */
  variant?: 'button' | 'icon';
}

/** Confirm → optimistic delete → toast (spec §8). If the server refuses, the row comes back. */
export function DeleteItemButton({ item, onDeleted, variant = 'icon' }: DeleteItemButtonProps) {
  const { t } = useTranslation('items');
  const confirm = useConfirm();
  const deleteItem = useDeleteItem();

  const handleClick = async () => {
    const confirmed = await confirm({
      title: t('delete.title', { name: item.name }),
      description: t('delete.description'),
      confirmLabel: t('delete.confirm'),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      // mutateAsync, not mutate(…, { onSuccess }): the row unmounts as soon as it is optimistically removed.
      await deleteItem.mutateAsync(item.id);
      notify.success(t('toast.deleted', { name: item.name }));
      onDeleted?.();
    } catch {
      // Rolled back; the global mutation handler already told the user why.
    }
  };

  if (variant === 'button') {
    return (
      <Button
        variant="destructive"
        onClick={() => {
          void handleClick();
        }}
      >
        <Trash2Icon aria-hidden="true" />
        {t('delete.confirm')}
      </Button>
    );
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t('actions.deleteItem', { name: item.name })}
      onClick={() => {
        void handleClick();
      }}
    >
      <Trash2Icon aria-hidden="true" />
    </Button>
  );
}
```

- [ ] **Step 4: Create `src/features/example/components/items-table.tsx`**

```tsx
import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';
import { PencilIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { createDataTableColumnHelper, DataTable } from '@/components/ui/data-table';
import { paths } from '@/config/paths';
import { Can } from '@/core/auth';
import { formatCurrency, formatNumber, formatRelative } from '@/lib/format';

import type { Item, ItemList } from '../types/item';

import { DeleteItemButton } from './delete-item-button';
import { ItemStatusBadge } from './item-status-badge';

const column = createDataTableColumnHelper<Item>();

interface ItemsTableProps {
  data: ItemList;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
}

export function ItemsTable({ data, pagination, onPaginationChange, sorting, onSortingChange }: ItemsTableProps) {
  const { t } = useTranslation('items');

  // `t` changes with the language, so headers and formatted cells re-render in the new locale.
  const columns = useMemo(
    () =>
      column.columns([
        column.accessor('name', {
          header: () => t('fields.name'),
          cell: (info) => (
            <Link
              to={paths.items.detail(info.row.original.id)}
              className="font-medium underline-offset-4 hover:underline"
            >
              {info.getValue()}
            </Link>
          ),
        }),
        column.accessor('status', {
          header: () => t('fields.status'),
          enableSorting: false,
          cell: (info) => <ItemStatusBadge status={info.getValue()} />,
        }),
        column.accessor('price', {
          header: () => t('fields.price'),
          cell: (info) => formatCurrency(info.getValue()),
        }),
        column.accessor('quantity', {
          header: () => t('fields.quantity'),
          cell: (info) => formatNumber(info.getValue()),
        }),
        column.accessor('updatedAt', {
          header: () => t('fields.updatedAt'),
          cell: (info) => formatRelative(info.getValue()),
        }),
        column.display({
          id: 'actions',
          header: () => <span className="sr-only">{t('fields.actions')}</span>,
          cell: (info) => (
            <div className="flex justify-end gap-1">
              <Can permission="items.update">
                <Button asChild variant="ghost" size="icon">
                  <Link
                    to={paths.items.edit(info.row.original.id)}
                    aria-label={t('actions.editItem', { name: info.row.original.name })}
                  >
                    <PencilIcon aria-hidden="true" />
                  </Link>
                </Button>
              </Can>
              <Can permission="items.delete">
                <DeleteItemButton item={info.row.original} />
              </Can>
            </div>
          ),
        }),
      ]),
    [t],
  );

  return (
    <DataTable
      caption={t('list.caption')}
      columns={columns}
      data={data.items}
      getRowId={(item) => item.id}
      sorting={{ state: sorting, onChange: onSortingChange }}
      pagination={{ state: pagination, onChange: onPaginationChange, rowCount: data.total }}
    />
  );
}
```

- [ ] **Step 5: Create `src/features/example/components/items-toolbar.tsx`**

```tsx
import { SearchIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

import { ITEM_STATUSES, type ItemStatus } from '../types/item';

const ALL = 'all';
const isItemStatus = (value: string): value is ItemStatus => (ITEM_STATUSES as readonly string[]).includes(value);

interface ItemsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: ItemStatus | undefined;
  onStatusChange: (value: ItemStatus | undefined) => void;
  /** A background refetch is running (e.g. the next page or a new search). */
  isFetching: boolean;
}

export function ItemsToolbar({ search, onSearchChange, status, onStatusChange, isFetching }: ItemsToolbarProps) {
  const { t } = useTranslation('items');

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-sm">
        <SearchIcon
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          type="search"
          className="pl-9"
          value={search}
          aria-label={t('list.searchLabel')}
          placeholder={t('list.searchPlaceholder')}
          onChange={(event) => {
            onSearchChange(event.target.value);
          }}
        />
      </div>
      <Select
        value={status ?? ALL}
        onValueChange={(value) => {
          onStatusChange(isItemStatus(value) ? value : undefined);
        }}
      >
        <SelectTrigger className="w-44" aria-label={t('list.statusLabel')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('list.allStatuses')}</SelectItem>
          {ITEM_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {t(`status.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isFetching ? <Spinner className="text-muted-foreground" aria-label={t('list.refreshing')} /> : null}
    </div>
  );
}
```

- [ ] **Step 6: Create `src/features/example/components/export-items-button.tsx`**

```tsx
import { DownloadIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useFeature } from '@/hooks/use-feature';
import { toCsv } from '@/lib/csv';

import type { Item } from '../types/item';

/** Downloads the visible rows as CSV. Behind the `itemsExport` feature flag (spec §7.9). */
export function ExportItemsButton({ items }: { items: readonly Item[] | undefined }) {
  const { t } = useTranslation('items');
  const enabled = useFeature('itemsExport');
  if (!enabled) return null;

  const download = () => {
    const csv = toCsv([
      [t('fields.name'), t('fields.status'), t('fields.price'), t('fields.quantity')],
      ...(items ?? []).map((item) => [item.name, t(`status.${item.status}`), item.price, item.quantity]),
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'items.csv';
    link.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  };

  return (
    <Button variant="outline" disabled={!items?.length} onClick={download}>
      <DownloadIcon aria-hidden="true" />
      {t('actions.export')}
    </Button>
  );
}
```

- [ ] **Step 7: Create `src/features/example/components/item-details.tsx`**

```tsx
import { CheckIcon, CopyIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { formatCurrency, formatDateTime, formatNumber, formatRelative } from '@/lib/format';

import type { Item } from '../types/item';

import { ItemStatusBadge } from './item-status-badge';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-muted-foreground text-xs font-medium uppercase">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export function ItemDetails({ item }: { item: Item }) {
  const { t } = useTranslation('items');
  const { copied, copy } = useCopyToClipboard();

  return (
    <Card>
      <CardContent className="grid gap-6">
        {item.description ? <p className="text-muted-foreground">{item.description}</p> : null}
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t('fields.status')}>
            <ItemStatusBadge status={item.status} />
          </Field>
          <Field label={t('fields.price')}>{formatCurrency(item.price)}</Field>
          <Field label={t('fields.quantity')}>{formatNumber(item.quantity)}</Field>
          <Field label={t('fields.createdAt')}>{formatDateTime(item.createdAt)}</Field>
          <Field label={t('fields.updatedAt')}>{formatRelative(item.updatedAt)}</Field>
          <Field label={t('fields.id')}>
            <span className="flex items-center gap-2">
              <span className="font-mono">{item.id}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void copy(item.id);
                }}
              >
                {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
                {copied ? t('actions.copied') : t('actions.copyId')}
              </Button>
            </span>
          </Field>
        </dl>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 8: Create `src/features/example/components/item-form.tsx`**

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { env } from '@/config/env';
import { paths } from '@/config/paths';
import { applyServerErrors, getErrorMessage } from '@/core/api';
import { notify } from '@/core/notify';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';

import { ITEM_FORM_DEFAULTS, itemFormSchema, type ItemFormValues } from '../schemas/item';
import { ITEM_STATUSES } from '../types/item';

interface ItemFormProps {
  defaultValues?: ItemFormValues;
  submitLabel: string;
  /** Persist the values. Throw (e.g. the AppError) to keep the form open; field errors are mapped automatically. */
  onSubmit: (values: ItemFormValues) => Promise<void>;
}

/** The standard form pattern (spec §7.7): Zod schema → RHF → shadcn Form, with server error mapping. */
export function ItemForm({ defaultValues = ITEM_FORM_DEFAULTS, submitLabel, onSubmit }: ItemFormProps) {
  const { t } = useTranslation(['items', 'common']);
  const form = useForm<ItemFormValues>({ resolver: zodResolver(itemFormSchema), defaultValues });
  const { isDirty, isSubmitting } = form.formState;

  // Navigating away mid-submit is expected (to the saved item), so only warn while idle.
  useUnsavedChangesWarning(isDirty && !isSubmitting);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      form.reset(values);
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.error(getErrorMessage(error));
    }
  });

  return (
    <Form {...form}>
      <form noValidate className="grid max-w-2xl gap-6" onSubmit={submit}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('form.namePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.description')}</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
              </FormControl>
              <FormDescription>{t('form.descriptionHint')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-6 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.status')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ITEM_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`status.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.price')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min={0}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={Number.isNaN(field.value) ? '' : field.value}
                    onChange={(event) => {
                      field.onChange(event.target.valueAsNumber);
                    }}
                  />
                </FormControl>
                <FormDescription>{t('form.priceHint', { currency: env.VITE_DEFAULT_CURRENCY })}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.quantity')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min={0}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={Number.isNaN(field.value) ? '' : field.value}
                    onChange={(event) => {
                      field.onChange(event.target.valueAsNumber);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner aria-hidden="true" /> : null}
            {submitLabel}
          </Button>
          <Button asChild variant="outline">
            <Link to={paths.items.list()}>{t('common:actions.cancel')}</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

Run: `pnpm exec vitest run src/features/example/components`
Expected: PASS.

- [ ] **Step 9: Append "Server errors, submitting and leaving" to `docs/forms.md`**

````markdown
## Server errors, submitting, and leaving with unsaved changes

The reference form (`src/features/example/components/item-form.tsx`) shows the whole pattern:

```tsx
const submit = form.handleSubmit(async (values) => {
  try {
    await onSubmit(values); // e.g. createItem.mutateAsync(values)
    form.reset(values);
  } catch (error) {
    if (!applyServerErrors(form, error)) notify.error(getErrorMessage(error));
  }
});
useUnsavedChangesWarning(form.formState.isDirty && !form.formState.isSubmitting);
```

- **Server validation:** a 422 whose `details.fields` looks like `{ name: 'ALREADY_EXISTS' }` becomes a field error under the input, and the first bad field gets focus. Messages that match `validation:server.<CODE>` are translated; others are shown as the server sent them. Adapt the parsing in `getFieldErrors` (`src/core/api/errors.ts`) if your backend's shape differs.
- **The mutation opts out of the global toast** (`meta: { silent: true }`), because the form decides: field errors, or a toast.
- **Submitting:** the submit button disables itself and shows a spinner while `isSubmitting`.
- **Unsaved changes:** leaving the page (links, back button) asks for confirmation; closing the tab triggers the browser's own prompt.
- **Number inputs:** bind with `valueAsNumber` so form state holds numbers. An empty field becomes `NaN`, which fails `z.number()` with a translated message.
````

- [ ] **Step 10: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(example): add items table, toolbar, details, form, delete and export components" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8.5: Pages, routes and navigation for the reference feature

**Files:**
- Create:
  - `src/hooks/use-debounced-callback.ts`, `use-debounced-callback.test.ts`
  - in `src/features/example/components/`: `item-not-found.tsx`, `items-list-page.tsx`, `item-detail-page.tsx`, `item-create-page.tsx`, `item-edit-page.tsx`, plus `items-list-page.test.tsx`, `item-detail-page.test.tsx`, `item-create-page.test.tsx`, `item-edit-page.test.tsx`
  - `src/app/routes/items/list.tsx`, `detail.tsx`, `create.tsx`, `edit.tsx`
- Modify:
  - `src/hooks/use-pagination.ts` (export `PAGINATION_SHAPE`)
  - `src/config/constants.ts`
  - `src/features/example/index.ts`
  - `src/app/router.tsx`, `src/app/navigation.ts`, `src/app/routes/dashboard.tsx`
  - `src/locales/{en,es}/common.json`
  - `docs/architecture.md`

**Interfaces:**
- Produces:
  - `useDebouncedCallback(callback, delayMs): { run(...args); cancel() }`. It always calls the latest callback.
  - `SEARCH_DEBOUNCE_MS = 300`
  - `ItemsListPage`, `ItemDetailPage`, `ItemCreatePage`, `ItemEditPage`, all from `@/features/example`
  - **Routes**, each guarded by its permission:
    - `/items` needs `items.read`
    - `/items/new` needs `items.create`
    - `/items/:itemId` needs `items.read`
    - `/items/:itemId/edit` needs `items.update`
  - a sidebar entry "Items" (`items.read`)
  - a dashboard link to the list

- [ ] **Step 1: Export the pagination shape and add the constant**

In `src/hooks/use-pagination.ts`, change `const PAGINATION_SHAPE = {` to `export const PAGINATION_SHAPE = {`.

Append to `src/config/constants.ts`:

```ts
/** How long search inputs wait after the last keystroke before querying. */
export const SEARCH_DEBOUNCE_MS = 300;
```

- [ ] **Step 2: Add the translations**

Deep-merge into `src/locales/en/common.json`:

```json
{ "dashboard": { "goToItems": "Browse items" } }
```

Deep-merge into `src/locales/es/common.json`:

```json
{ "dashboard": { "goToItems": "Ver elementos" } }
```

- [ ] **Step 3: Write the failing tests**

`src/hooks/use-debounced-callback.test.ts`:

```ts
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedCallback } from './use-debounced-callback';

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the latest callback once, after calls stop', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ callback }) => useDebouncedCallback(callback, 300), {
      initialProps: { callback: first },
    });

    result.current.run('a');
    result.current.run('ab');
    rerender({ callback: second });
    vi.advanceTimersByTime(300);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith('ab');
  });

  it('can be cancelled', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    result.current.run('x');
    result.current.cancel();
    vi.advanceTimersByTime(300);

    expect(callback).not.toHaveBeenCalled();
  });
});
```

`src/features/example/components/items-list-page.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { render, screen, waitFor } from '@/test/render';

import { ItemsListPage } from './items-list-page';

const renderList = (route = '/items', auth: 'admin' | 'viewer' = 'admin') =>
  render(<ItemsListPage />, { auth, path: '/items', route });

describe('ItemsListPage', () => {
  it('shows the first page with totals', async () => {
    renderList();
    expect(await screen.findByRole('link', { name: 'Desk lamp' })).toBeInTheDocument();
    expect(screen.getByText('25 total')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('searches once typing pauses, and keeps the search in the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderList();
    await screen.findByRole('link', { name: 'Desk lamp' });

    await user.type(screen.getByRole('searchbox', { name: 'Search items' }), 'desk');

    await waitFor(() => {
      expect(router.state.location.search).toBe('?q=desk');
    });
    expect(await screen.findByText('3 total')).toBeInTheDocument();
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    const { router } = renderList();
    await screen.findByRole('link', { name: 'Desk lamp' });

    await user.click(screen.getByRole('combobox', { name: 'Filter by status' }));
    await user.click(await screen.findByRole('option', { name: 'Archived' }));

    await waitFor(() => {
      expect(router.state.location.search).toBe('?status=archived');
    });
    expect(await screen.findByText('6 total')).toBeInTheDocument();
  });

  it('sorts on the server when a column header is clicked', async () => {
    const user = userEvent.setup();
    const { router } = renderList();
    await screen.findByRole('link', { name: 'Desk lamp' });

    await user.click(screen.getByRole('button', { name: /Price/ }));

    await waitFor(() => {
      expect(router.state.location.search).toBe('?sort=price');
    });
    const firstRowLink = (await screen.findAllByRole('link', { name: /Locked sample|Desk lamp/ }))[0];
    expect(firstRowLink).toHaveTextContent('Locked sample');
  });

  it('pages through the results', async () => {
    const user = userEvent.setup();
    const { router } = renderList();
    await screen.findByRole('link', { name: 'Desk lamp' });

    await user.click(screen.getByRole('button', { name: 'Go to next page' }));

    await waitFor(() => {
      expect(router.state.location.search).toBe('?page=2');
    });
    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('offers to clear the filters when nothing matches', async () => {
    const user = userEvent.setup();
    const { router } = renderList('/items?q=zzz');

    await user.click(await screen.findByRole('button', { name: 'Clear filters' }));

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(await screen.findByRole('link', { name: 'Desk lamp' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toHaveValue('');
  });

  it('shows a retryable error when loading fails', async () => {
    renderList('/items?q=error');
    expect(await screen.findByRole('alert')).toHaveTextContent('The server ran into a problem');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('hides the create action from read-only users', async () => {
    renderList('/items', 'viewer');
    await screen.findByRole('link', { name: 'Desk lamp' });
    expect(screen.queryByRole('link', { name: 'New item' })).not.toBeInTheDocument();
  });
});
```

`src/features/example/components/item-detail-page.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { http as mock, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiUrl } from '@/mocks/api-url';
import { server } from '@/mocks/server';
import { render, screen, within } from '@/test/render';

import { ItemDetailPage } from './item-detail-page';

const renderDetail = (id: string) =>
  render(<ItemDetailPage />, {
    auth: 'admin',
    path: '/items/:itemId',
    route: `/items/${id}`,
    routes: [{ path: '/items', element: <p>Items list</p> }],
  });

describe('ItemDetailPage', () => {
  it('shows the item', async () => {
    renderDetail('item-001');
    expect(await screen.findByRole('heading', { level: 1, name: 'Desk lamp' })).toBeInTheDocument();
    expect(screen.getByText('$9.50')).toBeInTheDocument();
  });

  it('handles unknown ids with a not-found state', async () => {
    renderDetail('does-not-exist');
    expect(await screen.findByRole('heading', { level: 1, name: 'Item not found' })).toBeInTheDocument();
  });

  it('retries after a failed load', async () => {
    server.use(
      mock.get(apiUrl('/items/:itemId'), () => HttpResponse.json({ code: 'SERVER_ERROR' }, { status: 500 }), {
        once: true,
      }),
    );
    const user = userEvent.setup();
    renderDetail('item-001');

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Desk lamp' })).toBeInTheDocument();
  });

  it('deletes the item and returns to the list', async () => {
    const user = userEvent.setup();
    renderDetail('item-001');

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Items list')).toBeInTheDocument();
  });
});
```

`src/features/example/components/item-create-page.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { notify } from '@/core/notify';
import { mockDb } from '@/mocks/db';
import { render, screen } from '@/test/render';

import { ItemCreatePage } from './item-create-page';

const renderCreate = () =>
  render(<ItemCreatePage />, {
    auth: 'admin',
    path: '/items/new',
    route: '/items/new',
    routes: [{ path: '/items/:itemId', element: <p>Detail page</p> }],
  });

describe('ItemCreatePage', () => {
  it('creates the item, confirms it and opens it', async () => {
    const success = vi.spyOn(notify, 'success');
    const user = userEvent.setup();
    renderCreate();

    await user.type(await screen.findByLabelText('Name'), 'Desk fan');
    await user.click(screen.getByRole('button', { name: 'Create item' }));

    expect(await screen.findByText('Detail page')).toBeInTheDocument();
    expect(success).toHaveBeenCalledWith('Created Desk fan');
    expect(mockDb.items.some((item) => item.name === 'Desk fan')).toBe(true);
  });

  it('shows the server field error for a duplicate name', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.type(await screen.findByLabelText('Name'), 'Desk lamp');
    await user.click(screen.getByRole('button', { name: 'Create item' }));

    expect(await screen.findByText('This value is already in use')).toBeInTheDocument();
  });
});
```

`src/features/example/components/item-edit-page.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { mockDb } from '@/mocks/db';
import { render, screen } from '@/test/render';

import { ItemEditPage } from './item-edit-page';

describe('ItemEditPage', () => {
  it('loads the item, saves changes and returns to it', async () => {
    const user = userEvent.setup();
    render(<ItemEditPage />, {
      auth: 'admin',
      path: '/items/:itemId/edit',
      route: '/items/item-001/edit',
      routes: [{ path: '/items/:itemId', element: <p>Detail page</p> }],
    });

    const name = await screen.findByLabelText('Name');
    expect(name).toHaveValue('Desk lamp');
    await user.clear(name);
    await user.type(name, 'Desk lamp XL');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Detail page')).toBeInTheDocument();
    expect(mockDb.items.find((item) => item.id === 'item-001')?.name).toBe('Desk lamp XL');
  });
});
```

Run: `pnpm exec vitest run src/hooks/use-debounced-callback.test.ts src/features/example`
Expected: FAIL, because the modules are missing.

- [ ] **Step 4: Create `src/hooks/use-debounced-callback.ts`**

```ts
import { useEffect, useMemo, useRef } from 'react';

/**
 * Calls the latest `callback` once calls stop for `delayMs` (e.g. committing a search to the URL).
 * `cancel()` drops a pending call. The timer is cleared on unmount.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs = 300,
) {
  const callbackRef = useRef(callback);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    const timer = timerRef;
    return () => {
      window.clearTimeout(timer.current);
    };
  }, []);

  return useMemo(
    () => ({
      run: (...args: Args) => {
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          callbackRef.current(...args);
        }, delayMs);
      },
      cancel: () => {
        window.clearTimeout(timerRef.current);
      },
    }),
    [delayMs],
  );
}
```

- [ ] **Step 5: Create the pages**

`src/features/example/components/item-not-found.tsx`:

```tsx
import { useTranslation } from 'react-i18next';

import { NotFoundState } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { paths } from '@/config/paths';

/** Shown by the detail and edit pages when the item doesn't exist (404). */
export function ItemNotFound() {
  const { t } = useTranslation('items');
  return (
    <>
      <PageHeader
        title={t('detail.notFoundTitle')}
        breadcrumbs={[{ label: t('list.title'), to: paths.items.list() }]}
      />
      <NotFoundState title={t('detail.notFoundTitle')} description={t('detail.notFoundDescription')} />
    </>
  );
}
```

`src/features/example/components/items-list-page.tsx`:

```tsx
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { z } from 'zod';

import { EmptyState, QueryState, TableSkeleton } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { SEARCH_DEBOUNCE_MS } from '@/config/constants';
import { paths } from '@/config/paths';
import { Can } from '@/core/auth';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { PAGINATION_SHAPE, usePagination } from '@/hooks/use-pagination';
import { useUrlState } from '@/hooks/use-url-state';

import { useItems } from '../hooks/use-items';
import { ITEM_SORT_FIELDS, ITEM_STATUSES, type ItemSortField } from '../types/item';

import { ExportItemsButton } from './export-items-button';
import { ItemsTable } from './items-table';
import { ItemsToolbar } from './items-toolbar';

/** Everything the list keeps in the URL, so any view can be bookmarked or shared (spec §8). */
const FILTERS_SHAPE = {
  ...PAGINATION_SHAPE,
  q: z.string().default(''),
  status: z.enum(ITEM_STATUSES).optional(),
  sort: z.enum(ITEM_SORT_FIELDS).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
};

const isSortField = (value: string): value is ItemSortField =>
  (ITEM_SORT_FIELDS as readonly string[]).includes(value);

export function ItemsListPage() {
  const { t } = useTranslation('items');
  const [filters, setFilters] = useUrlState(FILTERS_SHAPE);
  const { pagination, setPagination } = usePagination();

  // The input answers every keystroke; the URL (and therefore the request) updates when typing pauses.
  const [search, setSearch] = useState(filters.q);
  const commitSearch = useDebouncedCallback((value: string) => {
    setFilters({ q: value.trim(), page: null });
  }, SEARCH_DEBOUNCE_MS);

  const query = useItems({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    q: filters.q || undefined,
    status: filters.status,
    sort: filters.sort,
    order: filters.sort ? filters.order : undefined,
  });

  const sorting = filters.sort ? [{ id: filters.sort, desc: filters.order === 'desc' }] : [];
  const hasFilters = filters.q !== '' || filters.status !== undefined;

  const clearFilters = () => {
    commitSearch.cancel();
    setSearch('');
    setFilters({ q: null, status: null, page: null });
  };

  const createButton = (
    <Can permission="items.create">
      <Button asChild>
        <Link to={paths.items.create()}>
          <PlusIcon aria-hidden="true" />
          {t('actions.create')}
        </Link>
      </Button>
    </Can>
  );

  return (
    <>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={
          <>
            <ExportItemsButton items={query.data?.items} />
            {createButton}
          </>
        }
      />
      <ItemsToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          commitSearch.run(value);
        }}
        status={filters.status}
        onStatusChange={(status) => {
          setFilters({ status: status ?? null, page: null });
        }}
        isFetching={query.isFetching && !query.isPending}
      />
      <QueryState
        query={query}
        loading={<TableSkeleton rows={pagination.pageSize} columns={6} />}
        isEmpty={(data) => data.items.length === 0}
        empty={
          hasFilters ? (
            <EmptyState
              title={t('list.noResultsTitle')}
              description={t('list.noResultsDescription')}
              action={
                <Button variant="outline" onClick={clearFilters}>
                  {t('list.clearFilters')}
                </Button>
              }
            />
          ) : (
            <EmptyState title={t('list.emptyTitle')} description={t('list.emptyDescription')} action={createButton} />
          )
        }
      >
        {(data) => (
          <ItemsTable
            data={data}
            pagination={pagination}
            onPaginationChange={setPagination}
            sorting={sorting}
            onSortingChange={(updater) => {
              const [next] = typeof updater === 'function' ? updater(sorting) : updater;
              setFilters({
                sort: next && isSortField(next.id) ? next.id : null,
                order: next?.desc ? 'desc' : 'asc',
                page: null,
              });
            }}
          />
        )}
      </QueryState>
    </>
  );
}
```

`src/features/example/components/item-detail-page.tsx`:

```tsx
import { PencilIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';

import { DetailSkeleton, QueryState } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { Can } from '@/core/auth';

import { useItem } from '../hooks/use-item';

import { DeleteItemButton } from './delete-item-button';
import { ItemDetails } from './item-details';
import { ItemNotFound } from './item-not-found';

export function ItemDetailPage() {
  const { t } = useTranslation('items');
  const { itemId = '' } = useParams();
  const navigate = useNavigate();
  const query = useItem(itemId);

  if (query.error?.status === 404) return <ItemNotFound />;

  return (
    <QueryState query={query} loading={<DetailSkeleton />}>
      {(item) => (
        <>
          <PageHeader
            title={item.name}
            breadcrumbs={[{ label: t('list.title'), to: paths.items.list() }, { label: item.name }]}
            actions={
              <>
                <Can permission="items.update">
                  <Button asChild variant="outline">
                    <Link to={paths.items.edit(item.id)}>
                      <PencilIcon aria-hidden="true" />
                      {t('actions.edit')}
                    </Link>
                  </Button>
                </Can>
                <Can permission="items.delete">
                  <DeleteItemButton
                    item={item}
                    variant="button"
                    onDeleted={() => {
                      void navigate(paths.items.list());
                    }}
                  />
                </Can>
              </>
            }
          />
          <ItemDetails item={item} />
        </>
      )}
    </QueryState>
  );
}
```

`src/features/example/components/item-create-page.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { PageHeader } from '@/components/layout';
import { paths } from '@/config/paths';
import { notify } from '@/core/notify';

import { useCreateItem } from '../hooks/use-item-mutations';

import { ItemForm } from './item-form';

export function ItemCreatePage() {
  const { t } = useTranslation('items');
  const navigate = useNavigate();
  const createItem = useCreateItem();

  return (
    <>
      <PageHeader
        title={t('create.title')}
        breadcrumbs={[{ label: t('list.title'), to: paths.items.list() }, { label: t('create.title') }]}
      />
      <ItemForm
        submitLabel={t('create.submit')}
        onSubmit={async (values) => {
          const item = await createItem.mutateAsync(values);
          notify.success(t('toast.created', { name: item.name }));
          await navigate(paths.items.detail(item.id));
        }}
      />
    </>
  );
}
```

`src/features/example/components/item-edit-page.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

import { FormSkeleton, QueryState } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { paths } from '@/config/paths';
import { notify } from '@/core/notify';

import { useItem } from '../hooks/use-item';
import { useUpdateItem } from '../hooks/use-item-mutations';

import { ItemForm } from './item-form';
import { ItemNotFound } from './item-not-found';

export function ItemEditPage() {
  const { t } = useTranslation('items');
  const { itemId = '' } = useParams();
  const navigate = useNavigate();
  const query = useItem(itemId);
  const updateItem = useUpdateItem(itemId);

  if (query.error?.status === 404) return <ItemNotFound />;

  return (
    <QueryState query={query} loading={<FormSkeleton fields={5} />}>
      {(item) => (
        <>
          <PageHeader
            title={t('edit.heading', { name: item.name })}
            breadcrumbs={[
              { label: t('list.title'), to: paths.items.list() },
              { label: item.name, to: paths.items.detail(item.id) },
              { label: t('edit.title') },
            ]}
          />
          <ItemForm
            defaultValues={{
              name: item.name,
              description: item.description,
              status: item.status,
              price: item.price,
              quantity: item.quantity,
            }}
            submitLabel={t('edit.submit')}
            onSubmit={async (values) => {
              const saved = await updateItem.mutateAsync(values);
              notify.success(t('toast.updated', { name: saved.name }));
              await navigate(paths.items.detail(saved.id));
            }}
          />
        </>
      )}
    </QueryState>
  );
}
```

Append to `src/features/example/index.ts`:

```ts
export { ItemCreatePage } from './components/item-create-page';
export { ItemDetailPage } from './components/item-detail-page';
export { ItemEditPage } from './components/item-edit-page';
export { ItemsListPage } from './components/items-list-page';
```

Run: `pnpm exec vitest run src/hooks src/features/example`
Expected: PASS.

- [ ] **Step 6: Add the thin route modules in `src/app/routes/items/`**

`list.tsx`:

```tsx
import { RequirePermission } from '@/core/auth';
import { ItemsListPage } from '@/features/example';

export function Component() {
  return (
    <RequirePermission permission="items.read">
      <ItemsListPage />
    </RequirePermission>
  );
}
```

`detail.tsx`:

```tsx
import { RequirePermission } from '@/core/auth';
import { ItemDetailPage } from '@/features/example';

export function Component() {
  return (
    <RequirePermission permission="items.read">
      <ItemDetailPage />
    </RequirePermission>
  );
}
```

`create.tsx`:

```tsx
import { RequirePermission } from '@/core/auth';
import { ItemCreatePage } from '@/features/example';

export function Component() {
  return (
    <RequirePermission permission="items.create">
      <ItemCreatePage />
    </RequirePermission>
  );
}
```

`edit.tsx`:

```tsx
import { RequirePermission } from '@/core/auth';
import { ItemEditPage } from '@/features/example';

export function Component() {
  return (
    <RequirePermission permission="items.update">
      <ItemEditPage />
    </RequirePermission>
  );
}
```

- [ ] **Step 7: Register the routes, the sidebar entry and the dashboard link**

1. In `src/app/router.tsx`, insert directly above `// plop:routes`:

```tsx
{
  path: paths.items.list.pattern,
  lazy: () => import('./routes/items/list'),
  handle: titled((i18n) => i18n.t('items:list.title')),
},
{
  path: paths.items.create.pattern,
  lazy: () => import('./routes/items/create'),
  handle: titled((i18n) => i18n.t('items:create.title')),
},
{
  path: paths.items.detail.pattern,
  lazy: () => import('./routes/items/detail'),
  handle: titled((i18n) => i18n.t('items:detail.title')),
},
{
  path: paths.items.edit.pattern,
  lazy: () => import('./routes/items/edit'),
  handle: titled((i18n) => i18n.t('items:edit.title')),
},
```

2. In `src/app/navigation.ts`:
   - change the icon import to `import { LayoutDashboardIcon, PackageIcon } from 'lucide-react';`
   - insert directly above `// plop:nav`:

   ```ts
   { labelKey: 'nav.items', icon: PackageIcon, to: paths.items.list(), permission: 'items.read' },
   ```

3. In `src/app/routes/dashboard.tsx`:
   - add these imports: `Link` from `react-router`, `Button` from `@/components/ui/button`, `paths` from `@/config/paths`, and `Can` from `@/core/auth` (next to `useAuth`)
   - give the `EmptyState` this prop:

   ```tsx
   action={
     <Can permission="items.read">
       <Button asChild>
         <Link to={paths.items.list()}>{t('dashboard.goToItems')}</Link>
       </Button>
     </Can>
   }
   ```

- [ ] **Step 8: Add an items flow to `src/app/router.test.tsx`**

```tsx
it('navigates from the sidebar to the items list, then to an item', async () => {
  mockDb.sessionUserId = MOCK_USER_IDS.admin;
  const user = userEvent.setup();
  const router = renderApp('/dashboard');

  await user.click(await screen.findByRole('link', { name: 'Items' }));
  await user.click(await screen.findByRole('link', { name: 'Desk lamp' }));

  expect(await screen.findByRole('heading', { level: 1, name: 'Desk lamp' })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/items/item-001');
});
```

- [ ] **Step 9: Append "Features" to `docs/architecture.md`**

````markdown
## Features (`src/features/<name>/`)

Business code lives in features. The reference feature, `src/features/example/` (the "Items" catalogue), shows every pattern. Copy it, or run `pnpm gen feature`.

```
api/         hand-written service (http + Zod-validated responses), query key factory, queryOptions
hooks/       useItems / useItem / mutations (optimistic delete with rollback)
schemas/     Zod schemas for API responses and forms
types/       domain types and enums
components/  pages and UI: list (DataTable + URL state), detail, create/edit form, delete, export
index.ts     the public API: the ONLY entry point other code may import
```

Rules:
- Pages in `src/app/routes/` are **thin**: a permission guard plus the feature's page component.
- Features never import another feature's internals. Move shared code to `src/components`, `src/hooks` or `src/lib`.
- A feature owns its i18n namespace (`src/locales/<locale>/<feature>.json`) and its mock handlers (`src/mocks/handlers/<feature>.ts`).
````

- [ ] **Step 10: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all green.

```bash
git add -A
git commit -m "feat(example): add items list, detail, create and edit pages with routes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Phase 8 gate

- [ ] Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Expected: all green.
- [ ] Manual walkthrough with `pnpm dev`, signed in as admin:
  1. **Items:** open Items, search "desk" (the URL updates after a pause), filter Archived, sort by Price, go to page 2, then reload. The view is restored from the URL.
  2. **Create:** create "Desk fan". A toast appears and the new item opens. Creating "Desk lamp" instead shows "This value is already in use" under Name.
  3. **Edit:** change a field, then click Cancel. The "Leave this page?" dialog appears.
  4. **Delete:** delete "Locked sample". The row disappears, comes back, and an explanation toast appears. Delete another item: it disappears for good.
  5. **Failure:** search "error" to get the ErrorState with **Try again**. Open `/items/nope` to get "Item not found".
  6. **Language:** switch to Español. Every label, status, toast and validation message is translated.
  7. **Read-only user:** as the viewer, there are no create, edit or delete actions, and `/items/new` shows the 403 state.
  8. **Feature flag:** set `VITE_FEATURE_FLAGS=itemsExport` in `.env.local` and restart. **Export CSV** appears.
- [ ] Post the **Phase 8 report** (E2E coverage for this feature arrives in Phase 10), then **STOP** until the owner approves.

---

# Phase 9 — Codegen

Scope (spec §12, §6.3, §9): Orval (config, mutator and a fixture spec) and Plop generators (feature, component, page, hook, store).

### Task 9.1: Orval API codegen through the shared client (spec §6.3)

**Files:**
- Create:
  - `openapi/openapi.yaml`: a local fixture that mirrors the MSW mocks (decision 3)
  - `orval.config.ts`
  - `src/core/api/mutator.ts`
  - `src/api/generated/**` (generated and committed)
  - `src/api/generated-client.test.tsx`
  - `docs/api-codegen.md`
- Modify: `package.json` (script), `tsconfig.node.json` (include the config), `src/core/api/index.ts`

**Interfaces:**
- Produces:
  - `customInstance<T>(config, options?)`, the Orval mutator that calls the shared `http`
  - `type ErrorType<E> = AppError`, `type BodyType<B> = B`
  - generated hooks and functions such as `useListItems`, `useGetItem`, `useGetItemSuspense`, `getGetItemQueryKey`, `createItem` and `deleteItem` (under `src/api/generated/endpoints/`)
  - models under `src/api/generated/model/`, and Zod schemas under `src/api/generated/zod/`
  - script `codegen:api`

- [ ] **Step 1: Install**

Run: `pnpm add -D orval`

- [ ] **Step 2: Create `openapi/openapi.yaml`**

```yaml
openapi: 3.1.0
info:
  title: React Bedrock example API
  version: 1.0.0
  description: >
    Local fixture that mirrors the mock API in src/mocks (owner decision 3).
    Replace this file (or point orval.config.ts at your backend's spec URL) for a real project.
servers:
  - url: /api
tags:
  - name: auth
  - name: items
paths:
  /auth/login:
    post:
      tags: [auth]
      operationId: login
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/LoginRequest' }
      responses:
        '200':
          description: Signed in; the session cookie is set.
          content:
            application/json:
              schema: { $ref: '#/components/schemas/SessionUser' }
        '401': { $ref: '#/components/responses/Error' }
  /auth/logout:
    post:
      tags: [auth]
      operationId: logout
      responses:
        '204': { description: Signed out. }
  /auth/me:
    get:
      tags: [auth]
      operationId: getCurrentUser
      responses:
        '200':
          description: The signed-in user.
          content:
            application/json:
              schema: { $ref: '#/components/schemas/SessionUser' }
        '401': { $ref: '#/components/responses/Error' }
  /auth/refresh:
    post:
      tags: [auth]
      operationId: refreshSession
      responses:
        '204': { description: Session renewed. }
        '401': { $ref: '#/components/responses/Error' }
  /items:
    get:
      tags: [items]
      operationId: listItems
      parameters:
        - { name: page, in: query, schema: { type: integer, minimum: 1, default: 1 } }
        - { name: pageSize, in: query, schema: { type: integer, minimum: 1, maximum: 100, default: 10 } }
        - { name: q, in: query, schema: { type: string } }
        - { name: status, in: query, schema: { $ref: '#/components/schemas/ItemStatus' } }
        - { name: sort, in: query, schema: { type: string, enum: [name, price, quantity, updatedAt] } }
        - { name: order, in: query, schema: { type: string, enum: [asc, desc] } }
      responses:
        '200':
          description: One page of items.
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ItemList' }
        '403': { $ref: '#/components/responses/Error' }
    post:
      tags: [items]
      operationId: createItem
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ItemInput' }
      responses:
        '201':
          description: Created.
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Item' }
        '422': { $ref: '#/components/responses/Error' }
  /items/{itemId}:
    parameters:
      - { name: itemId, in: path, required: true, schema: { type: string } }
    get:
      tags: [items]
      operationId: getItem
      responses:
        '200':
          description: The item.
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Item' }
        '404': { $ref: '#/components/responses/Error' }
    patch:
      tags: [items]
      operationId: updateItem
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ItemInput' }
      responses:
        '200':
          description: Updated.
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Item' }
        '404': { $ref: '#/components/responses/Error' }
        '422': { $ref: '#/components/responses/Error' }
    delete:
      tags: [items]
      operationId: deleteItem
      responses:
        '204': { description: Deleted. }
        '404': { $ref: '#/components/responses/Error' }
        '409': { $ref: '#/components/responses/Error' }
components:
  responses:
    Error:
      description: Error (the assumed contract, owner decision 2).
      content:
        application/json:
          schema: { $ref: '#/components/schemas/Error' }
  schemas:
    Error:
      type: object
      required: [code]
      properties:
        code: { type: string }
        message: { type: string }
        details: { type: object, additionalProperties: true }
    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email: { type: string, format: email }
        password: { type: string }
    SessionUser:
      type: object
      required: [id, name, email, permissions]
      properties:
        id: { type: string }
        name: { type: string }
        email: { type: string }
        permissions: { type: array, items: { type: string } }
    ItemStatus:
      type: string
      enum: [draft, active, archived]
    ItemInput:
      type: object
      required: [name, description, status, price, quantity]
      properties:
        name: { type: string, minLength: 2, maxLength: 80 }
        description: { type: string, maxLength: 500 }
        status: { $ref: '#/components/schemas/ItemStatus' }
        price: { type: number, minimum: 0 }
        quantity: { type: integer, minimum: 0 }
    Item:
      allOf:
        - { $ref: '#/components/schemas/ItemInput' }
        - type: object
          required: [id, createdAt, updatedAt]
          properties:
            id: { type: string }
            createdAt: { type: string, format: date-time }
            updatedAt: { type: string, format: date-time }
    ItemList:
      type: object
      required: [items, total, page, pageSize]
      properties:
        items: { type: array, items: { $ref: '#/components/schemas/Item' } }
        total: { type: integer }
        page: { type: integer }
        pageSize: { type: integer }
```

- [ ] **Step 3: Create `src/core/api/mutator.ts`**

```ts
import type { AxiosRequestConfig } from 'axios';

import type { AppError } from './errors';
import { http } from './http';

/**
 * Orval's custom mutator (spec §6.3): every generated call goes through the shared `http` instance,
 * so auth refresh, request ids, Accept-Language, error normalisation, toasts and logging all apply.
 */
export const customInstance = <T>(config: AxiosRequestConfig, options?: AxiosRequestConfig): Promise<T> =>
  http<T>({ ...config, ...options }).then(({ data }) => data);

/** Errors reaching generated hooks are already normalised to AppError by the interceptors. */
export type ErrorType<E = unknown> = E extends never ? never : AppError;

export type BodyType<BodyData> = BodyData;
```

Append to `src/core/api/index.ts`:

```ts
export { customInstance, type BodyType, type ErrorType } from './mutator';
```

- [ ] **Step 4: Create `orval.config.ts`**

Then add `"orval.config.ts"` to the `include` array in `tsconfig.node.json`.

```ts
import { defineConfig } from 'orval';

/**
 * API codegen (spec §6.3, docs/api-codegen.md). Run `pnpm codegen:api` after the spec changes.
 * `input.target` may also be your backend's spec URL, e.g. 'https://api.example.com/openapi.json'.
 */
export default defineConfig({
  api: {
    input: { target: './openapi/openapi.yaml' },
    output: {
      mode: 'tags-split',
      target: './src/api/generated/endpoints',
      schemas: './src/api/generated/model',
      client: 'react-query',
      httpClient: 'axios', // Orval 8 defaults to fetch; the shared instance is Axios
      clean: true,
      override: {
        mutator: { path: './src/core/api/mutator.ts', name: 'customInstance' },
        query: { useQuery: true, useSuspenseQuery: true, signal: true },
      },
    },
  },
  apiZod: {
    input: { target: './openapi/openapi.yaml' },
    output: {
      mode: 'tags-split',
      target: './src/api/generated/zod',
      client: 'zod',
      fileExtension: '.zod.ts',
      clean: true,
    },
  },
});
```

Add the script to `package.json`: `"codegen:api": "orval --config ./orval.config.ts"`.

- [ ] **Step 5: Generate the client**

Run: `pnpm codegen:api`
Expected:
- `src/api/generated/endpoints/items/items.ts` and `.../auth/auth.ts` exist, with hooks such as `useGetItem`, `useListItems`, `useCreateItem` and `useGetItemSuspense`
- `src/api/generated/model/*.ts` and `src/api/generated/zod/**/*.zod.ts` exist
- the generated calls import `customInstance` from `src/core/api/mutator.ts`

Run: `pnpm typecheck`
Expected: exits 0. If generated code fails a strict flag (for example `noUncheckedIndexedAccess`), first try Orval's own options (`override.useDates`, `override.enumGenerationType`). As a last resort, add `hooks: { afterAllFilesWrite: 'node scripts/ts-nocheck-generated.mjs' }` with a script that prepends `// @ts-nocheck` to every generated file, and record it as a deviation. Generated types still flow to callers either way.

- [ ] **Step 6: Write the test `src/api/generated-client.test.tsx`**

It proves the generated hooks use the shared interceptors.

```tsx
import { http as mock, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { isAppError } from '@/core/api';
import { apiUrl } from '@/mocks/api-url';
import { mockDb } from '@/mocks/db';
import { MOCK_USER_IDS } from '@/mocks/fixtures/users';
import { server } from '@/mocks/server';
import { renderHook, waitFor } from '@/test/render';

import { useGetItem } from './generated/endpoints/items/items';

describe('Orval-generated client', () => {
  beforeEach(() => {
    mockDb.sessionUserId = MOCK_USER_IDS.admin;
  });

  it('fetches through the shared instance, so the interceptors add their headers', async () => {
    let requestId: string | null = null;
    let language: string | null = null;
    server.use(
      mock.get(apiUrl('/items/:itemId'), ({ request, params }) => {
        requestId = request.headers.get('x-request-id');
        language = request.headers.get('accept-language');
        return HttpResponse.json({
          id: String(params.itemId),
          name: 'Generated',
          description: '',
          status: 'active',
          price: 1,
          quantity: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        });
      }),
    );

    const { result } = renderHook(() => useGetItem('item-001'));

    await waitFor(() => {
      expect(result.current.data?.name).toBe('Generated');
    });
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(language).toBe('en');
  });

  it('receives normalised AppErrors', async () => {
    const { result } = renderHook(() => useGetItem('does-not-exist'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(isAppError(result.current.error)).toBe(true);
    expect(result.current.error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });
});
```

Run: `pnpm exec vitest run src/api`
Expected: PASS.

- [ ] **Step 7: Write `docs/api-codegen.md`**

````markdown
# API code generation (Orval)

`pnpm codegen:api` reads the OpenAPI spec and writes typed clients to `src/api/generated/`:

| Output | Contents |
|---|---|
| `endpoints/<tag>/<tag>.ts` | request functions plus TanStack Query hooks (`useGetItem`, `useListItems`, `useCreateItem`, `…Suspense` variants, `get…QueryKey` helpers) |
| `model/` | TypeScript types for every schema |
| `zod/` | Zod schemas, for runtime validation |

- **Generated files are committed** and excluded from ESLint and Prettier. Never edit them by hand; change the spec and regenerate. CI regenerates and fails if the committed output is stale.
- **The spec:** `orval.config.ts` points at `openapi/openapi.yaml`, a local fixture that mirrors the MSW mocks. For a real backend, set `input.target` to its spec file or URL.

## Why the generated hooks behave like the rest of the app

Orval's **custom mutator** (`src/core/api/mutator.ts`) sends every generated call through the shared `http` instance. So generated calls get:
- the auth refresh on 401
- `X-Request-Id` and `Accept-Language`
- `AppError` normalisation and the 403 / offline toasts
- logging

`src/api/generated-client.test.tsx` proves it.

```tsx
import { useGetItem, useListItems } from '@/api/generated/endpoints/items/items';

const { data } = useListItems({ page: 1, pageSize: 20 });
```

## No OpenAPI spec? Hand-write the service

The reference feature does exactly this (`src/features/example/api/`):
1. `items-api.ts`: functions that call `http` and validate responses with Zod.
2. `item-keys.ts`: a query key factory.
3. `item-queries.ts`: `queryOptions` with `signal`.
4. `hooks/`: `useQuery` / `useMutation` wrappers.

The patterns are the same as the generated ones, so you can switch to codegen later without touching components.
````

- [ ] **Step 8: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(api): add orval codegen from a local openapi fixture via the shared client" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9.2: Plop generators (spec §9)

**Files:**
- Create:
  - `plopfile.js`
  - templates in `plop/templates/`:
    - `feature/`: `types.ts.hbs`, `schemas.ts.hbs`, `api.ts.hbs`, `keys.ts.hbs`, `hook.ts.hbs`, `list-page.tsx.hbs`, `list-page.test.tsx.hbs`, `index.ts.hbs`, `locale.en.json.hbs`, `locale.es.json.hbs`, `mock-handlers.ts.hbs`, `route.tsx.hbs`
    - `component/`: `component.tsx.hbs`, `component.stories.tsx.hbs`, `component.test.tsx.hbs`
    - `page/page.tsx.hbs`
    - `hook/`: `hook.ts.hbs`, `hook.test.ts.hbs`
    - `store/`: `store.ts.hbs`, `store.test.ts.hbs`
  - `docs/generators.md`
- Modify:
  - `package.json` (the `gen` script)
  - `src/mocks/handlers.ts` (add `// plop:handlers-imports`)
  - `src/app/navigation.ts` (add `// plop:nav-imports`)
  - `src/config/permissions.ts` (reword the anchor comment)

**Interfaces:**
- Produces:
  - `pnpm gen` (a menu), or skip the prompts with `pnpm gen <generator> <answers…>`:
    - `pnpm gen feature <name-plural> <entity-singular> <y|n>`: the last answer adds a route and sidebar link
    - `pnpm gen component <name> <ui|feedback|feature> [feature]`
    - `pnpm gen page <name> <Title>`
    - `pnpm gen hook <name>`
    - `pnpm gen store <name>`
  - Anchors the generators write to:
    - `// plop:resources-imports`, `// plop:resources-en`, `// plop:resources-es`
    - `// plop:handlers-imports`, `// plop:handlers`
    - `// plop:paths`, `// plop:routes`
    - `// plop:nav-imports`, `// plop:nav`
    - the `"nav": {` and `"pages": {` objects in `common.json`

- [ ] **Step 1: Install and add the script**

Run: `pnpm add -D plop`

Add `"gen": "plop"` to `package.json` scripts.

- [ ] **Step 2: Add the missing anchors**

1. In `src/mocks/handlers.ts`, add the line `// plop:handlers-imports` directly after the last `import` statement.
2. In `src/app/navigation.ts`, add the line `// plop:nav-imports` directly after the last `import` statement.
3. In `src/config/permissions.ts`, replace `// plop:permissions` with `// Add each feature's permissions here (generators don't touch this list).`

- [ ] **Step 3: Create `plopfile.js`**

```js
import { execFileSync } from 'node:child_process';

const FEATURE = 'src/features/{{kebabCase name}}';
const EOL = '\\r?\\n'; // tolerate CRLF checkouts

const kebab = (value) =>
  /^[a-z][a-z0-9-]*$/.test(value) || 'Use lower-case words separated by dashes, e.g. purchase-orders';
const required = (label) => (value) => (value.trim() ? true : `${label} is required`);

/**
 * Code generators (spec §9). `pnpm gen` opens a menu; `pnpm gen <generator> <answers…>` skips it.
 * Every generator ends by running Prettier and ESLint --fix on what it touched, so output is lint-clean.
 * @param {import('plop').NodePlopAPI} plop
 */
export default function (plop) {
  plop.setActionType('format', (answers, config) => {
    const files = [...new Set(config.files.map((file) => plop.renderString(file, answers)))];
    const run = (command, args) =>
      execFileSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
    run('pnpm', ['exec', 'prettier', '--write', ...files]);
    const code = files.filter((file) => /\.tsx?$/.test(file));
    if (code.length > 0) run('pnpm', ['exec', 'eslint', '--fix', '--no-warn-ignored', ...code]);
    return `formatted ${files.length} file(s)`;
  });

  plop.setHelper(
    'storyGroup',
    (location) => ({ ui: 'UI', feedback: 'Feedback', feature: 'Features' })[location] ?? 'Components',
  );

  plop.setGenerator('feature', {
    description: 'Feature: types, schema, api, query keys, hook, list page + test, locales, mock API (+ route)',
    prompts: [
      { type: 'input', name: 'name', message: 'Feature name, plural (e.g. purchase-orders):', validate: kebab },
      { type: 'input', name: 'entity', message: 'Entity name, singular (e.g. purchase-order):', validate: kebab },
      { type: 'confirm', name: 'withRoute', message: 'Add a route and a sidebar link?', default: true },
    ],
    actions: (answers) => {
      const files = {
        types: `${FEATURE}/types/{{kebabCase entity}}.ts`,
        schemas: `${FEATURE}/schemas/{{kebabCase entity}}.ts`,
        api: `${FEATURE}/api/{{kebabCase name}}-api.ts`,
        keys: `${FEATURE}/api/{{kebabCase entity}}-keys.ts`,
        hook: `${FEATURE}/hooks/use-{{kebabCase name}}.ts`,
        page: `${FEATURE}/components/{{kebabCase name}}-list-page.tsx`,
        pageTest: `${FEATURE}/components/{{kebabCase name}}-list-page.test.tsx`,
        index: `${FEATURE}/index.ts`,
        en: 'src/locales/en/{{kebabCase name}}.json',
        es: 'src/locales/es/{{kebabCase name}}.json',
        mocks: 'src/mocks/handlers/{{kebabCase name}}.ts',
      };
      const template = (file) => `plop/templates/feature/${file}`;
      const actions = [
        { type: 'add', path: files.types, templateFile: template('types.ts.hbs') },
        { type: 'add', path: files.schemas, templateFile: template('schemas.ts.hbs') },
        { type: 'add', path: files.api, templateFile: template('api.ts.hbs') },
        { type: 'add', path: files.keys, templateFile: template('keys.ts.hbs') },
        { type: 'add', path: files.hook, templateFile: template('hook.ts.hbs') },
        { type: 'add', path: files.page, templateFile: template('list-page.tsx.hbs') },
        { type: 'add', path: files.pageTest, templateFile: template('list-page.test.tsx.hbs') },
        { type: 'add', path: files.index, templateFile: template('index.ts.hbs') },
        { type: 'add', path: files.en, templateFile: template('locale.en.json.hbs') },
        { type: 'add', path: files.es, templateFile: template('locale.es.json.hbs') },
        { type: 'add', path: files.mocks, templateFile: template('mock-handlers.ts.hbs') },
        {
          type: 'modify',
          path: 'src/core/i18n/resources.ts',
          pattern: /(\/\/ plop:resources-imports)/,
          template:
            "import en{{pascalCase name}} from '@/locales/en/{{kebabCase name}}.json';\nimport es{{pascalCase name}} from '@/locales/es/{{kebabCase name}}.json';\n$1",
        },
        {
          type: 'modify',
          path: 'src/core/i18n/resources.ts',
          pattern: /( *\/\/ plop:resources-en)/,
          template: '  {{camelCase name}}: en{{pascalCase name}},\n$1',
        },
        {
          type: 'modify',
          path: 'src/core/i18n/resources.ts',
          pattern: /( *\/\/ plop:resources-es)/,
          template: '  {{camelCase name}}: es{{pascalCase name}},\n$1',
        },
        {
          type: 'modify',
          path: 'src/mocks/handlers.ts',
          pattern: /(\/\/ plop:handlers-imports)/,
          template: "import { {{camelCase name}}Handlers } from './handlers/{{kebabCase name}}';\n$1",
        },
        {
          type: 'modify',
          path: 'src/mocks/handlers.ts',
          pattern: new RegExp(`( *// plop:handlers${EOL})`),
          template: '  ...{{camelCase name}}Handlers,\n$1',
        },
      ];
      const touched = [...Object.values(files), 'src/core/i18n/resources.ts', 'src/mocks/handlers.ts'];

      if (answers.withRoute) {
        const route = 'src/app/routes/{{kebabCase name}}/list.tsx';
        actions.push(
          { type: 'add', path: route, templateFile: template('route.tsx.hbs') },
          {
            type: 'modify',
            path: 'src/config/paths.ts',
            pattern: /( *\/\/ plop:paths)/,
            template:
              "  {{camelCase name}}: {\n    list: route('/{{kebabCase name}}', () => '/{{kebabCase name}}'),\n  },\n$1",
          },
          {
            type: 'modify',
            path: 'src/app/router.tsx',
            pattern: /( *\/\/ plop:routes)/,
            template:
              "{\n  path: paths.{{camelCase name}}.list.pattern,\n  lazy: () => import('./routes/{{kebabCase name}}/list'),\n  handle: titled((i18n) => i18n.t('{{camelCase name}}:list.title')),\n},\n$1",
          },
          {
            type: 'modify',
            path: 'src/app/navigation.ts',
            pattern: /(\/\/ plop:nav-imports)/,
            template: "import { FolderIcon as {{pascalCase name}}Icon } from 'lucide-react';\n$1",
          },
          {
            type: 'modify',
            path: 'src/app/navigation.ts',
            pattern: new RegExp(`( *// plop:nav${EOL})`),
            template:
              "  { labelKey: 'nav.{{camelCase name}}', icon: {{pascalCase name}}Icon, to: paths.{{camelCase name}}.list() },\n$1",
          },
          {
            type: 'modify',
            path: 'src/locales/en/common.json',
            pattern: new RegExp(`("nav": \\{${EOL})`),
            template: '$1    "{{camelCase name}}": "{{titleCase name}}",\n',
          },
          {
            type: 'modify',
            path: 'src/locales/es/common.json',
            pattern: new RegExp(`("nav": \\{${EOL})`),
            template: '$1    "{{camelCase name}}": "{{titleCase name}}",\n',
          },
        );
        touched.push(
          route,
          'src/config/paths.ts',
          'src/app/router.tsx',
          'src/app/navigation.ts',
          'src/locales/en/common.json',
          'src/locales/es/common.json',
        );
      }

      actions.push({ type: 'format', files: touched });
      return actions;
    },
  });

  plop.setGenerator('component', {
    description: 'Component with a story and a test',
    prompts: [
      { type: 'input', name: 'name', message: 'Component name (e.g. status-pill):', validate: kebab },
      { type: 'list', name: 'location', message: 'Where does it live?', choices: ['ui', 'feedback', 'feature'] },
      {
        type: 'input',
        name: 'feature',
        message: 'Feature folder (e.g. example):',
        when: (answers) => answers.location === 'feature',
        validate: kebab,
      },
    ],
    actions: (answers) => {
      const dir =
        answers.location === 'feature'
          ? `src/features/${answers.feature}/components`
          : `src/components/${answers.location}`;
      const files = [
        `${dir}/{{kebabCase name}}.tsx`,
        `${dir}/{{kebabCase name}}.stories.tsx`,
        `${dir}/{{kebabCase name}}.test.tsx`,
      ];
      return [
        { type: 'add', path: files[0], templateFile: 'plop/templates/component/component.tsx.hbs' },
        { type: 'add', path: files[1], templateFile: 'plop/templates/component/component.stories.tsx.hbs' },
        { type: 'add', path: files[2], templateFile: 'plop/templates/component/component.test.tsx.hbs' },
        { type: 'format', files },
      ];
    },
  });

  plop.setGenerator('page', {
    description: 'Route page, registered in paths.ts and router.tsx, with its title in every locale',
    prompts: [
      { type: 'input', name: 'name', message: 'Page name (e.g. reports):', validate: kebab },
      { type: 'input', name: 'title', message: 'Page title in English (e.g. Reports):', validate: required('Title') },
    ],
    actions: [
      { type: 'add', path: 'src/app/routes/{{kebabCase name}}.tsx', templateFile: 'plop/templates/page/page.tsx.hbs' },
      {
        type: 'modify',
        path: 'src/config/paths.ts',
        pattern: /( *\/\/ plop:paths)/,
        template: "  {{camelCase name}}: route('/{{kebabCase name}}', () => '/{{kebabCase name}}'),\n$1",
      },
      {
        type: 'modify',
        path: 'src/app/router.tsx',
        pattern: /( *\/\/ plop:routes)/,
        template:
          "{\n  path: paths.{{camelCase name}}.pattern,\n  lazy: () => import('./routes/{{kebabCase name}}'),\n  handle: titled((i18n) => i18n.t('common:pages.{{camelCase name}}')),\n},\n$1",
      },
      // Triple braces: Handlebars must not HTML-escape the title (e.g. an apostrophe) inside JSON.
      {
        type: 'modify',
        path: 'src/locales/en/common.json',
        pattern: new RegExp(`("pages": \\{${EOL})`),
        template: '$1    "{{camelCase name}}": "{{{title}}}",\n',
      },
      {
        type: 'modify',
        path: 'src/locales/es/common.json',
        pattern: new RegExp(`("pages": \\{${EOL})`),
        template: '$1    "{{camelCase name}}": "{{{title}}}",\n',
      },
      {
        type: 'format',
        files: [
          'src/app/routes/{{kebabCase name}}.tsx',
          'src/config/paths.ts',
          'src/app/router.tsx',
          'src/locales/en/common.json',
          'src/locales/es/common.json',
        ],
      },
    ],
  });

  plop.setGenerator('hook', {
    description: 'Shared hook with a test',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Hook name without "use" (e.g. window-size):',
        filter: (value) => value.replace(/^use-?/i, ''),
        validate: kebab,
      },
    ],
    actions: [
      { type: 'add', path: 'src/hooks/use-{{kebabCase name}}.ts', templateFile: 'plop/templates/hook/hook.ts.hbs' },
      {
        type: 'add',
        path: 'src/hooks/use-{{kebabCase name}}.test.ts',
        templateFile: 'plop/templates/hook/hook.test.ts.hbs',
      },
      { type: 'format', files: ['src/hooks/use-{{kebabCase name}}.ts', 'src/hooks/use-{{kebabCase name}}.test.ts'] },
    ],
  });

  plop.setGenerator('store', {
    description: 'Zustand store with selector hooks and a test',
    prompts: [{ type: 'input', name: 'name', message: 'Store name (e.g. filters):', validate: kebab }],
    actions: [
      {
        type: 'add',
        path: 'src/stores/{{kebabCase name}}-store.ts',
        templateFile: 'plop/templates/store/store.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/stores/{{kebabCase name}}-store.test.ts',
        templateFile: 'plop/templates/store/store.test.ts.hbs',
      },
      {
        type: 'format',
        files: ['src/stores/{{kebabCase name}}-store.ts', 'src/stores/{{kebabCase name}}-store.test.ts'],
      },
    ],
  });
}
```

- [ ] **Step 4: Create the feature templates in `plop/templates/feature/`**

`types.ts.hbs`:

```hbs
export interface {{pascalCase entity}} {
  id: string;
  name: string;
  /** ISO-8601. */
  createdAt: string;
}

export interface {{pascalCase entity}}List {
  items: {{pascalCase entity}}[];
  total: number;
  page: number;
  pageSize: number;
}

export interface {{pascalCase entity}}ListParams {
  /** 1-based. */
  page: number;
  pageSize: number;
}
```

`schemas.ts.hbs`:

```hbs
import { z } from 'zod';

/** API response validation: the contract is checked where data enters the app. */
export const {{camelCase entity}}Schema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
});

export const {{camelCase entity}}ListSchema = z.object({
  items: z.array({{camelCase entity}}Schema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
```

`api.ts.hbs`:

```hbs
import { http } from '@/core/api';

import { {{camelCase entity}}ListSchema } from '../schemas/{{kebabCase entity}}';
import type { {{pascalCase entity}}List, {{pascalCase entity}}ListParams } from '../types/{{kebabCase entity}}';

/** Hand-written service (see src/features/example/api for the full CRUD pattern). */
export const {{camelCase name}}Api = {
  async list(params: {{pascalCase entity}}ListParams, signal?: AbortSignal): Promise<{{pascalCase entity}}List> {
    const { data } = await http.get<unknown>('/{{kebabCase name}}', { params, signal });
    return {{camelCase entity}}ListSchema.parse(data);
  },
};
```

`keys.ts.hbs`:

```hbs
import type { {{pascalCase entity}}ListParams } from '../types/{{kebabCase entity}}';

/** Query keys for this feature. Invalidate broadly with `{{camelCase entity}}Keys.lists()`. */
export const {{camelCase entity}}Keys = {
  all: ['{{kebabCase name}}'] as const,
  lists: () => [...{{camelCase entity}}Keys.all, 'list'] as const,
  list: (params: {{pascalCase entity}}ListParams) => [...{{camelCase entity}}Keys.lists(), params] as const,
};
```

`hook.ts.hbs`:

```hbs
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { {{camelCase name}}Api } from '../api/{{kebabCase name}}-api';
import { {{camelCase entity}}Keys } from '../api/{{kebabCase entity}}-keys';
import type { {{pascalCase entity}}ListParams } from '../types/{{kebabCase entity}}';

export function use{{pascalCase name}}(params: {{pascalCase entity}}ListParams) {
  return useQuery({
    queryKey: {{camelCase entity}}Keys.list(params),
    queryFn: ({ signal }) => {{camelCase name}}Api.list(params, signal),
    placeholderData: keepPreviousData,
  });
}
```

`list-page.tsx.hbs`:

```hbs
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { QueryState, TableSkeleton } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { createDataTableColumnHelper, DataTable } from '@/components/ui/data-table';
import { usePagination } from '@/hooks/use-pagination';
import { formatDate } from '@/lib/format';

import { use{{pascalCase name}} } from '../hooks/use-{{kebabCase name}}';
import type { {{pascalCase entity}} } from '../types/{{kebabCase entity}}';

const column = createDataTableColumnHelper<{{pascalCase entity}}>();

export function {{pascalCase name}}ListPage() {
  const { t } = useTranslation('{{camelCase name}}');
  const { pagination, setPagination } = usePagination();
  const query = use{{pascalCase name}}({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize });

  const columns = useMemo(
    () =>
      column.columns([
        column.accessor('name', { header: () => t('fields.name') }),
        column.accessor('createdAt', {
          header: () => t('fields.createdAt'),
          enableSorting: false,
          cell: (info) => formatDate(info.getValue()),
        }),
      ]),
    [t],
  );

  return (
    <>
      <PageHeader title={t('list.title')} description={t('list.description')} />
      <QueryState
        query={query}
        loading={<TableSkeleton rows={pagination.pageSize} columns={2} />}
        isEmpty={(data) => data.items.length === 0}
      >
        {(data) => (
          <DataTable
            caption={t('list.title')}
            columns={columns}
            data={data.items}
            getRowId={(row) => row.id}
            pagination={ { state: pagination, onChange: setPagination, rowCount: data.total } }
          />
        )}
      </QueryState>
    </>
  );
}
```

The `pagination={ { … } }` spacing keeps Handlebars from reading `{{` as a tag. Prettier removes the spaces in the formatting step.

`list-page.test.tsx.hbs`:

```hbs
import { describe, expect, it } from 'vitest';

import { render, screen } from '@/test/render';

import { {{pascalCase name}}ListPage } from './{{kebabCase name}}-list-page';

describe('{{pascalCase name}}ListPage', () => {
  it('lists records from the API', async () => {
    render(<{{pascalCase name}}ListPage />, { path: '/{{kebabCase name}}', route: '/{{kebabCase name}}' });
    expect(await screen.findByText('Sample {{titleCase entity}} 1')).toBeInTheDocument();
    expect(screen.getByText('12 total')).toBeInTheDocument();
  });
});
```

`index.ts.hbs`:

```hbs
/** Public API of the {{kebabCase name}} feature. Other code imports only from '@/features/{{kebabCase name}}'. */
export { {{camelCase name}}Api } from './api/{{kebabCase name}}-api';
export { {{camelCase entity}}Keys } from './api/{{kebabCase entity}}-keys';
export { {{pascalCase name}}ListPage } from './components/{{kebabCase name}}-list-page';
export { use{{pascalCase name}} } from './hooks/use-{{kebabCase name}}';
export type { {{pascalCase entity}}, {{pascalCase entity}}List, {{pascalCase entity}}ListParams } from './types/{{kebabCase entity}}';
```

`locale.en.json.hbs`:

```hbs
{
  "list": {
    "title": "{{titleCase name}}",
    "description": "All {{titleCase name}} in one place."
  },
  "fields": {
    "name": "Name",
    "createdAt": "Created"
  }
}
```

`locale.es.json.hbs`:

```hbs
{
  "list": {
    "title": "{{titleCase name}}",
    "description": "Todos los registros de {{titleCase name}} en un solo lugar."
  },
  "fields": {
    "name": "Nombre",
    "createdAt": "Creado"
  }
}
```

`mock-handlers.ts.hbs`:

```hbs
import { delay, http, HttpResponse } from 'msw';

import type { {{pascalCase entity}} } from '@/features/{{kebabCase name}}';

import { apiUrl } from '../api-url';

/** Demo data for the {{kebabCase name}} feature. Replace it with realistic fixtures. */
const records: {{pascalCase entity}}[] = Array.from({ length: 12 }, (_, index) => ({
  id: '{{kebabCase entity}}-' + String(index + 1),
  name: 'Sample {{titleCase entity}} ' + String(index + 1),
  createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
}));

export const {{camelCase name}}Handlers = [
  http.get(apiUrl('/{{kebabCase name}}'), async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const pageSize = Math.max(1, Number(url.searchParams.get('pageSize') ?? 10));
    const start = (page - 1) * pageSize;
    return HttpResponse.json({
      items: records.slice(start, start + pageSize),
      total: records.length,
      page,
      pageSize,
    });
  }),
];
```

`route.tsx.hbs`:

```hbs
import { {{pascalCase name}}ListPage } from '@/features/{{kebabCase name}}';

/** Thin route module: add a <RequirePermission> guard here once the feature has permissions. */
export function Component() {
  return <{{pascalCase name}}ListPage />;
}
```

- [ ] **Step 5: Create the component, page, hook and store templates**

`plop/templates/component/component.tsx.hbs`:

```hbs
import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

export type {{pascalCase name}}Props = ComponentProps<'div'>;

/** Describe what {{pascalCase name}} is for, and when to use it instead of an existing component. */
export function {{pascalCase name}}({ className, ...props }: {{pascalCase name}}Props) {
  return <div data-slot="{{kebabCase name}}" className={cn('rounded-md border p-4', className)} {...props} />;
}
```

`plop/templates/component/component.stories.tsx.hbs`:

```hbs
import type { Meta, StoryObj } from '@storybook/react-vite';

import { {{pascalCase name}} } from './{{kebabCase name}}';

const meta = {
  title: '{{storyGroup location}}/{{pascalCase name}}',
  component: {{pascalCase name}},
  args: { children: '{{titleCase name}}' },
} satisfies Meta<typeof {{pascalCase name}}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

`plop/templates/component/component.test.tsx.hbs`:

```hbs
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { {{pascalCase name}} } from './{{kebabCase name}}';

describe('{{pascalCase name}}', () => {
  it('renders its children', () => {
    render(<{{pascalCase name}}>Hello</{{pascalCase name}}>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

`plop/templates/page/page.tsx.hbs`:

```hbs
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/feedback';
import { PageHeader } from '@/components/layout';

/** Route page. Keep it thin: render a feature's page component here once it exists. */
export function Component() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('pages.{{camelCase name}}')} />
      <EmptyState />
    </>
  );
}
```

`plop/templates/hook/hook.ts.hbs`:

```hbs
import { useState } from 'react';

/** Describe what use{{pascalCase name}} returns and when to use it. */
export function use{{pascalCase name}}(initialValue = false) {
  const [value, setValue] = useState(initialValue);
  return { value, setValue };
}
```

`plop/templates/hook/hook.test.ts.hbs`:

```hbs
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { use{{pascalCase name}} } from './use-{{kebabCase name}}';

describe('use{{pascalCase name}}', () => {
  it('starts with the initial value and updates', () => {
    const { result } = renderHook(() => use{{pascalCase name}}(true));
    expect(result.current.value).toBe(true);

    act(() => {
      result.current.setValue(false);
    });
    expect(result.current.value).toBe(false);
  });
});
```

`plop/templates/store/store.ts.hbs`:

```hbs
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { env } from '@/config/env';

interface {{pascalCase name}}State {
  value: string;
  setValue: (value: string) => void;
  reset: () => void;
}

/** UI state only (docs/state-management.md). To persist it, follow src/stores/ui-store.ts. */
export const use{{pascalCase name}}Store = create<{{pascalCase name}}State>()(
  devtools(
    (set) => ({
      value: '',
      setValue: (value) => {
        set({ value }, undefined, '{{camelCase name}}/setValue');
      },
      reset: () => {
        set({ value: '' }, undefined, '{{camelCase name}}/reset');
      },
    }),
    { name: '{{kebabCase name}}-store', enabled: env.isDev && !env.isTest },
  ),
);

export const use{{pascalCase name}}Value = () => use{{pascalCase name}}Store((state) => state.value);
export const useSet{{pascalCase name}}Value = () => use{{pascalCase name}}Store((state) => state.setValue);
```

`plop/templates/store/store.test.ts.hbs`:

```hbs
import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { use{{pascalCase name}}Store } from './{{kebabCase name}}-store';

describe('use{{pascalCase name}}Store', () => {
  it('sets and resets its value', () => {
    act(() => {
      use{{pascalCase name}}Store.getState().setValue('x');
    });
    expect(use{{pascalCase name}}Store.getState().value).toBe('x');

    act(() => {
      use{{pascalCase name}}Store.getState().reset();
    });
    expect(use{{pascalCase name}}Store.getState().value).toBe('');
  });
});
```

- [ ] **Step 6: Prove every generator's output passes the gate**

Start from a clean working tree (`git status` shows nothing to commit), then run:

```bash
pnpm gen feature purchase-orders purchase-order y
pnpm gen component status-pill ui
pnpm gen page reports Reports
pnpm gen hook window-size
pnpm gen store filters
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected: every generator prints `formatted N file(s)`, and the whole gate is green:
- `/purchase-orders` renders "Sample Purchase Order 1…" in `pnpm dev`
- `/reports` renders with the tab title "Reports · React Bedrock"

Throw the generated output away:

```bash
git restore . && git clean -fd -- src
```

If a template fails lint or typecheck, fix the template (not the output) and repeat.

- [ ] **Step 7: Write `docs/generators.md`**

````markdown
# Generators (Plop)

`pnpm gen` opens a menu. Skip the prompts by passing the answers in order:

| Command | Creates |
|---|---|
| `pnpm gen feature <plural> <singular> <y\|n>` | `src/features/<plural>/` with types, Zod schema, API service, query keys, hook, list page and test, index; `src/locales/{en,es}/<plural>.json`; a mock API in `src/mocks/handlers/<plural>.ts`. With `y`, also a route, a `paths` entry and a sidebar link. It registers the namespace in `src/core/i18n/resources.ts` and the handlers in `src/mocks/handlers.ts`. |
| `pnpm gen component <name> <ui\|feedback\|feature> [feature]` | Component, Storybook story and test |
| `pnpm gen page <name> <Title>` | `src/app/routes/<name>.tsx`, registered in `paths.ts` and `router.tsx`, with its title in every locale |
| `pnpm gen hook <name>` | `src/hooks/use-<name>.ts` plus a test |
| `pnpm gen store <name>` | `src/stores/<name>-store.ts` with selector hooks, plus a test |

- **Output is lint-clean:** every generator ends by running Prettier and `eslint --fix` on the files it touched. CI runs every generator and the full gate on each pull request.
- **Anchors:** generators insert code at `// plop:…` comments (`resources-imports`, `resources-en`, `resources-es`, `handlers-imports`, `handlers`, `paths`, `routes`, `nav-imports`, `nav`) and into the `"nav"` / `"pages"` objects of `common.json`. **Don't delete or rename them.**
- **After generating:**
  - translate the Spanish strings (they start as copies of the English names)
  - add permissions (`src/config/permissions.ts`) plus `<RequirePermission>` in the route module
  - replace the demo mock data
- **Templates** live in `plop/templates/<generator>/*.hbs`. To change what gets generated, change the template. Avoid a literal `{{` in template code; write `{ {` and let Prettier join it.
````

- [ ] **Step 8: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "feat(codegen): add plop generators for feature, component, page, hook and store" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Phase 9 gate

- [ ] Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Expected: all green.
- [ ] Run `pnpm codegen:api && git diff --exit-code src/api/generated`. Expected: no diff, because the committed output matches the spec.
- [ ] Step 6 of Task 9.2 was run and passed. Include the generator output in the report.
- [ ] Post the **Phase 9 report**, then **STOP** until the owner approves.

---

# Phase 10 — Testing, Docker & CI/CD

Scope (spec §12, §10):
- Playwright E2E with a11y checks
- coverage thresholds
- Dockerfile, Dockerfile.dev, Compose, the entrypoint and the nginx template
- GitHub Actions, including the Docker image build and smoke test
- Dependabot and bundle analysis

### Task 10.1: Playwright E2E with axe accessibility checks

**Files:**
- Create:
  - `playwright.config.ts`, `tsconfig.e2e.json`
  - in `e2e/`: `fixtures.ts`, `auth.spec.ts`, `navigation.spec.ts`, `items.spec.ts`, `i18n.spec.ts`, `theme.spec.ts`, `a11y.spec.ts`
- Modify: `tsconfig.json` (add the reference), `package.json` (scripts), `docs/testing.md`

**Interfaces:**
- Produces:
  - `pnpm test:e2e` builds, then runs Playwright against `vite preview` on port 4173, with the mock API on
  - from `e2e/fixtures.ts`:
    - `test` (with a `makeAxeBuilder` fixture) and `expect`
    - `ACCOUNTS`, which mirror the mock users
    - `signIn(page, account?)`

- [ ] **Step 1: Install**

```bash
pnpm add -D @playwright/test @axe-core/playwright
pnpm exec playwright install chromium
```

On Linux CI use `--with-deps`.

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const baseURL = `http://localhost:${String(PORT)}`;

/** E2E against the production build (`vite preview`) with the mock API on (spec §10.2). */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: { baseURL, trace: 'on-first-retry', locale: 'en-US' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm preview --port ${String(PORT)} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Create `tsconfig.e2e.json` and reference it**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.e2e.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "types": ["node"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["e2e", "playwright.config.ts"]
}
```

In `tsconfig.json`, add `{ "path": "./tsconfig.e2e.json" }` to `references`.

In `package.json`, add these scripts:

```json
"test:e2e": "pnpm build && playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 4: Create `e2e/fixtures.ts`**

```ts
import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

/** Mirrors the demo accounts in src/mocks/fixtures/users.ts (mock API only). */
export const ACCOUNTS = {
  admin: { email: 'admin@example.com', password: 'demo1234' },
  viewer: { email: 'viewer@example.com', password: 'demo1234' },
} as const;

export async function signIn(page: Page, account: keyof typeof ACCOUNTS = 'admin'): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ACCOUNTS[account].email);
  await page.getByLabel('Password').fill(ACCOUNTS[account].password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
}

/** `makeAxeBuilder()` runs axe with the WCAG 2.1 A and AA rules (spec §10.2). */
export const test = base.extend<{ makeAxeBuilder: () => AxeBuilder }>({
  makeAxeBuilder: async ({ page }, provide) => {
    await provide(() => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']));
  },
});

export { expect };
```

- [ ] **Step 5: Write the specs**

`e2e/auth.spec.ts`:

```ts
import { ACCOUNTS, expect, signIn, test } from './fixtures';

test('sends visitors to login and back to the page they asked for', async ({ page }) => {
  await page.goto('/items');
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fitems$/);

  await page.getByLabel('Email').fill(ACCOUNTS.admin.email);
  await page.getByLabel('Password').fill(ACCOUNTS.admin.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/items$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Items' })).toBeVisible();
});

test('explains wrong credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ACCOUNTS.admin.email);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('alert')).toHaveText('Incorrect email or password.');
});

test('keeps the session across reloads, then signs out', async ({ page }) => {
  await signIn(page);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();

  await page.getByRole('button', { name: 'Open user menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();

  await expect(page).toHaveURL(/\/login$/);
});
```

`e2e/navigation.spec.ts`:

```ts
import { expect, signIn, test } from './fixtures';

test('navigates with the sidebar and titles every page', async ({ page }) => {
  await signIn(page);
  await expect(page).toHaveTitle('Dashboard · React Bedrock');

  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Items' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Items' })).toBeVisible();
  await expect(page).toHaveTitle('Items · React Bedrock');
});

test('shows the 404 page inside the app shell', async ({ page }) => {
  await signIn(page);
  await page.goto('/does-not-exist');

  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
});

test('is keyboard navigable: the skip link comes first and moves focus to the content', async ({ page }) => {
  await signIn(page);
  await page.keyboard.press('Tab');

  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible(); // visible when focused (focus:not-sr-only)
  await page.keyboard.press('Enter');

  await expect(page.locator('#main-content')).toBeFocused();
});
```

`e2e/items.spec.ts`:

```ts
import { expect, signIn, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.goto('/items');
  await expect(page.getByRole('link', { name: 'Desk lamp' })).toBeVisible();
});

test('search, filter, sort and paging live in the URL', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search items' }).fill('desk');
  await expect(page).toHaveURL(/\?q=desk$/);
  await expect(page.getByText('3 total')).toBeVisible();

  await page.getByRole('searchbox', { name: 'Search items' }).fill('');
  await page.getByRole('combobox', { name: 'Filter by status' }).click();
  await page.getByRole('option', { name: 'Archived' }).click();
  await expect(page).toHaveURL(/status=archived/);

  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Filter by status' })).toHaveText('Archived');
});

test('creates, edits and deletes an item', async ({ page }) => {
  await page.getByRole('link', { name: 'New item' }).click();
  await page.getByLabel('Name').fill('E2E lamp');
  await page.getByLabel('Price').fill('12.5');
  await page.getByRole('button', { name: 'Create item' }).click();

  await expect(page.getByText('Created E2E lamp')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'E2E lamp' })).toBeVisible();

  await page.getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Name').fill('E2E lamp XL');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'E2E lamp XL' })).toBeVisible();

  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Deleted E2E lamp XL')).toBeVisible();
  await expect(page).toHaveURL(/\/items$/);
});

test('rolls back an optimistic delete the server refuses', async ({ page }) => {
  await page.getByRole('button', { name: 'Go to last page' }).click();
  await page.getByRole('button', { name: 'Delete Locked sample' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText("This item is locked and can't be deleted.")).toBeVisible();
  await expect(page.getByRole('link', { name: 'Locked sample' })).toBeVisible();
});

test('read-only users see no write actions and get 403 on write pages', async ({ page }) => {
  await page.getByRole('button', { name: 'Open user menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await signIn(page, 'viewer');

  await page.goto('/items');
  await expect(page.getByRole('link', { name: 'Desk lamp' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'New item' })).toHaveCount(0);

  await page.goto('/items/new');
  await expect(page.getByRole('heading', { name: "You don't have access to this page" })).toBeVisible();
});
```

`e2e/i18n.spec.ts`:

```ts
import { expect, signIn, test } from './fixtures';

test('switches to Spanish and remembers it', async ({ page }) => {
  await signIn(page);

  await page.getByRole('button', { name: 'Change language' }).click();
  await page.getByRole('menuitemradio', { name: 'Español' }).click();

  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Panel' })).toBeVisible();
});
```

`e2e/theme.spec.ts`:

```ts
import { expect, test } from './fixtures';

test('switches to dark mode, persists it, and applies it before the app loads', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Change theme' }).click();
  await page.getByRole('menuitemradio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);

  await page.reload({ waitUntil: 'domcontentloaded' });
  // The inline bootstrap script ran during parsing, before React: no light flash.
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
});
```

`e2e/a11y.spec.ts`:

```ts
import { expect, signIn, test } from './fixtures';

test('the login page has no WCAG A/AA violations, in light and dark', async ({ page, makeAxeBuilder }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);

  await page.getByRole('button', { name: 'Change theme' }).click();
  await page.getByRole('menuitemradio', { name: 'Dark' }).click();
  await page.keyboard.press('Escape');
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});

for (const path of ['/dashboard', '/items', '/items/new', '/items/item-001']) {
  test(`${path} has no WCAG A/AA violations`, async ({ page, makeAxeBuilder }) => {
    await signIn(page);
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
  });
}
```

- [ ] **Step 6: Run the E2E suite**

Run: `pnpm test:e2e`
Expected: all specs pass in Chromium. On failure, open `playwright-report/index.html`; traces are recorded on the first retry.

If axe reports a contrast violation, fix the **token** in `tokens.css`, not the component, and note it.

- [ ] **Step 7: Append "End-to-end tests (Playwright)" to `docs/testing.md`**

````markdown
## End-to-end tests (Playwright)

- `pnpm test:e2e` builds the app and runs `e2e/*.spec.ts` against `vite preview` (port 4173) with the **mock API on**, so no backend is needed.
- `pnpm test:e2e:ui` opens the interactive runner.
- **Covered:**
  - sign-in and redirects, sign-out, and session persistence
  - sidebar navigation, titles and 404
  - Items: search, filter and URL state; create, edit and delete; optimistic rollback; read-only users
  - the language switch
  - the dark theme without a flash
- **Accessibility:** `a11y.spec.ts` runs axe (WCAG 2.1 A/AA) on the key pages, in light and dark. Keyboard checks (skip link, focus) are in `navigation.spec.ts`. Storybook's a11y panel covers individual components.
- **Helpers:** `e2e/fixtures.ts` provides `signIn(page, 'admin' | 'viewer')` and the `makeAxeBuilder` fixture.
- **Reports:** failures leave a report in `playwright-report/`, with traces on retry. CI uploads it as an artifact.

## What to test where

| Change | Test it with |
|---|---|
| Pure function, schema, store | Vitest unit test next to the file |
| Component or hook | Vitest + Testing Library (`@/test/render`), with MSW for data |
| A feature flow across pages | an integration test with the real route tree (`src/app/router.test.tsx`), or E2E |
| Critical user journeys, visual states, a11y | Playwright (`e2e/`) |
````

- [ ] **Step 8: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "test(e2e): add playwright journeys and axe accessibility checks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 10.2: Coverage thresholds, bundle analysis and a container-friendly Vite config

**Files:**
- Modify: `vite.config.ts`, `package.json` (script), `docs/testing.md`, `docs/architecture.md`

**Interfaces:**
- Produces:
  - `pnpm test:coverage` **fails** when `src/core/**` or `src/lib/**` drops below 70% lines, functions, branches or statements (spec §10.2)
  - `pnpm analyze` builds and opens `stats.html`, a bundle treemap (spec §10.5). The file is git-ignored.
  - `CHOKIDAR_USEPOLLING=true` (from the shell or any `.env*` file) makes the dev server poll for file changes. The Docker dev container (Task 10.4) relies on this.
  - `APP_VERSION` / `GIT_SHA` set to an **empty string** now fall back to the package version and `local`. Docker passes build args that weren't provided as empty strings.

- [ ] **Step 1: Install**

Run: `pnpm add -D rollup-plugin-visualizer`

- [ ] **Step 2: Replace `vite.config.ts`**

This keeps everything from Tasks 1.2, 1.5, 2.3 and 6.1 and adds the new parts.

```ts
/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv, type PluginOption } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

/** Build metadata from the environment. Docker passes build args that were not provided as empty strings. */
function buildArg(name: 'APP_VERSION' | 'GIT_SHA'): string | undefined {
  const value = process.env[name];
  return value === '' ? undefined : value;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Server-side settings, never exposed to the browser (read from .env files and the shell).
  const serverEnv = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = serverEnv.API_PROXY_TARGET;
  const proxy = apiProxyTarget
    ? { '/api': { target: apiProxyTarget, changeOrigin: true } }
    : undefined;
  // Docker on Windows/WSL: bind-mounted files emit no change events, so poll instead (docs/docker.md).
  const watch =
    serverEnv.CHOKIDAR_USEPOLLING === 'true' ? { usePolling: true, interval: 300 } : undefined;

  return {
    plugins: [
      react(),
      tailwindcss(),
      // `pnpm analyze`: a treemap of everything in the bundle, with gzip and brotli sizes.
      mode === 'analyze' &&
        (visualizer({
          filename: 'stats.html',
          template: 'treemap',
          gzipSize: true,
          brotliSize: true,
          open: true,
        }) as PluginOption),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(buildArg('APP_VERSION') ?? pkg.version),
      __GIT_SHA__: JSON.stringify(buildArg('GIT_SHA') ?? 'local'),
    },
    server: { proxy, watch },
    preview: { proxy },
    test: {
      environment: 'jsdom',
      environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      env: { TZ: 'UTC' },
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/**/*.stories.tsx',
          'src/**/*.d.ts',
          'src/test/**',
          'src/mocks/**',
          'src/api/generated/**',
          'src/main.tsx',
        ],
        reporter: ['text', 'html', 'lcov'],
        // Spec §10.2: at least ~70% on the infrastructure and utility layers. Raise these as coverage grows.
        thresholds: {
          'src/core/**': { lines: 70, functions: 70, branches: 70, statements: 70 },
          'src/lib/**': { lines: 70, functions: 70, branches: 70, statements: 70 },
        },
      },
    },
  };
});
```

If ESLint reports `no-unnecessary-type-assertion` on the `as PluginOption` cast, the installed versions agree on plugin types: drop the cast.

- [ ] **Step 3: Check that the thresholds pass, and that they bite**

Run: `pnpm test:coverage`
Expected: PASS. The text report ends with the per-file table, and nothing reports a threshold error.

If a threshold fails, add tests for the uncovered lines the report lists. Don't lower a threshold without the owner's approval.

Then temporarily change `lines: 70` to `lines: 100` for `'src/lib/**'` and run `pnpm test:coverage` again.
Expected: FAIL with `ERROR: Coverage for lines (…%) does not meet "src/lib/**" threshold (100%)`. Revert the change.

- [ ] **Step 4: Add the analyze script and try it**

Add to `package.json` scripts: `"analyze": "vite build --mode analyze"`.

Run: `pnpm analyze`
Expected: the build succeeds and `stats.html` opens in the browser. Separate chunks appear for each route, the Sentry SDK and the mock worker.

- [ ] **Step 5: Append "Coverage" to `docs/testing.md`**

```markdown
## Coverage

`pnpm test:coverage` writes a report to `coverage/` (open `coverage/index.html`). It **fails** when coverage of `src/core/**` or `src/lib/**` drops below 70% for lines, functions, branches or statements. CI runs it on every pull request and uploads the report.

Raise the thresholds in `vite.config.ts` as coverage grows. Never lower them to make a change pass.
```

- [ ] **Step 6: Append "Performance" to `docs/architecture.md`**

```markdown
## Performance

- **Code splitting:** every page is a lazy route (`lazy: () => import(…)` in `src/app/router.tsx`), so users download only what they open. The Sentry SDK and the mock API are separate chunks, loaded only when enabled.
- **Bundle analysis:** `pnpm analyze` builds and opens `stats.html`, a treemap of every module by size. Check it before and after adding a dependency.
- **Caching:** in the Docker image, hashed files under `/assets/` are cached for a year, while `index.html` and `config.js` are never cached. A new deployment is therefore live on the next page load.
- **Images:**
  - Prefer SVG for icons and illustrations; lucide icons are already inline SVG.
  - Use AVIF or WebP for photos, sized for the largest display they appear at.
  - Import images from `src/` (`import heroUrl from './hero.webp'`) to get hashed, long-cached URLs. Put files in `public/` only when they need a fixed URL.
  - Always set `width` and `height` (or an aspect ratio) to avoid layout shift.
  - Add `loading="lazy"` and `decoding="async"` to images below the fold.
- **Web Vitals:** optional; see docs/error-handling-and-logging.md.
```

- [ ] **Step 7: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

```bash
git add -A
git commit -m "build: add coverage thresholds, bundle analysis and polling support" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 10.3: Production image with runtime configuration (spec §10.4)

**Files:**
- Create:
  - `Dockerfile`, `.dockerignore`
  - `docker/docker-entrypoint.sh`, `docker/nginx.conf.template`
  - `scripts/csp-script-hashes.mjs`, `scripts/docker-smoke-test.sh`
  - `src/test/docker-config.guard.test.ts`
- Modify: `docs/security.md`

**Interfaces:**
- Consumes: `ENV_KEYS` (Task 1.5); `public/config.js` and the inline theme script in `index.html` (Tasks 1.5 and 2.5); the `APP_VERSION` / `GIT_SHA` handling in `vite.config.ts` (Task 10.2).
- Produces:
  - **Image:**
    - built with `docker build -t react-bedrock:local [--build-arg APP_VERSION=…] [--build-arg GIT_SHA=…] .`
    - listens on port 8080 as UID 101 (non-root), with `HEALTHCHECK` on `/healthz`
    - the multi-stage build needs no emulation for other platforms, because the JavaScript stages run on the build platform
    - under 50 MB
  - **Container start** (`docker/docker-entrypoint.sh`):
    - writes `/usr/share/nginx/html/config.js` from the whitelisted `CONFIG_KEYS`, JSON-escaped, leaving out empty values
    - validates `API_PROXY_TARGET` (it must be `http(s)://host[:port]`), or exits 1 with a clear message
    - renders the nginx config, with the `/api/` proxy block only when `API_PROXY_TARGET` is set
    - builds the default CSP, or uses `CONTENT_SECURITY_POLICY` if set
    - logs the proxy status and the effective CSP, then `exec nginx -g 'daemon off;'`
  - **nginx:**
    - SPA fallback, and 404 for missing `/assets/*`
    - `Cache-Control: no-store` for `index.html` and `config.js`; one-year `immutable` for `/assets/*`
    - gzip
    - `/healthz` returns `ok`
    - `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` and the CSP on every response
  - `node scripts/csp-script-hashes.mjs <file|->` prints `'sha256-…'` for each inline `<script>`
  - `bash scripts/docker-smoke-test.sh [image]` checks the whole runtime contract and exits non-zero on the first failure. CI uses it in Task 10.5.

- [ ] **Step 1: Write the failing guard test `src/test/docker-config.guard.test.ts`**

```ts
import { describe, expect, it } from 'vitest';

import entrypoint from '/docker/docker-entrypoint.sh?raw';

import { ENV_KEYS } from '@/config/env';

describe('Docker configuration (spec §10.4)', () => {
  it('writes every supported variable, and only those, into config.js', () => {
    const keys = /^CONFIG_KEYS="([^"]*)"$/m.exec(entrypoint)?.[1]?.split(/\s+/) ?? [];
    expect([...keys].sort()).toEqual([...ENV_KEYS].sort());
  });
});
```

If ESLint moves the `?raw` import to another group, run `pnpm lint:fix`.

Run: `pnpm exec vitest run src/test/docker-config.guard.test.ts`
Expected: FAIL with `Failed to resolve import "/docker/docker-entrypoint.sh?raw"`.

- [ ] **Step 2: Create `docker/docker-entrypoint.sh`**

```sh
#!/bin/sh
# Start-up for the production image (spec §10.4). Runs as the unprivileged nginx user (UID 101).
#   1. Writes /usr/share/nginx/html/config.js from the whitelisted VITE_* variables, JSON-escaped.
#   2. Renders the nginx server config: the /api proxy only when API_PROXY_TARGET is set.
#   3. Replaces itself with nginx.
# Everything in config.js is PUBLIC: every visitor's browser downloads it. Never put secrets in VITE_* variables.
set -eu

HTML_DIR=/usr/share/nginx/html
APP_DIR=/etc/nginx/app

# The variables the app reads at runtime. Keep in sync with ENV_KEYS in src/config/env.ts
# (src/test/docker-config.guard.test.ts fails when they differ).
CONFIG_KEYS="VITE_APP_NAME VITE_API_BASE_URL VITE_APP_ENV VITE_DEFAULT_LOCALE VITE_DEFAULT_CURRENCY VITE_ENABLE_MOCKS VITE_SENTRY_DSN VITE_LOG_LEVEL VITE_FEATURE_FLAGS"

log() {
  echo "docker-entrypoint: $*"
}

fail() {
  echo "docker-entrypoint: $*" >&2
  exit 1
}

# The body of a JSON string: control characters are dropped, backslashes and double quotes escaped.
json_escape() {
  printf '%s' "$1" | tr -d '\000-\037' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

# scheme://host[:port] of an absolute http(s) URL, without credentials. Prints nothing for a path such as /api.
origin_of() {
  printf '%s' "$1" | sed -nE 's|^(https?://)([^/@]*@)?([^/?#]+).*|\1\3|p'
}

# 1. Runtime configuration for the browser (read by src/config/env.ts).
{
  echo '// Generated by docker-entrypoint.sh at container start. PUBLIC: visible to every browser.'
  printf 'window.__APP_CONFIG__ = {'
  separator=''
  for key in $CONFIG_KEYS; do
    value=$(printenv "$key" || true)
    [ -n "$value" ] || continue
    printf '%s\n  "%s": "%s"' "$separator" "$key" "$(json_escape "$value")"
    separator=','
  done
  printf '\n};\n'
} > "$HTML_DIR/config.js"

# 2. nginx configuration.
API_PROXY_TARGET=${API_PROXY_TARGET:-}
API_PROXY_TARGET=${API_PROXY_TARGET%/}
if [ -n "$API_PROXY_TARGET" ]; then
  case "$API_PROXY_TARGET" in
    http://?* | https://?*) ;;
    *) fail "API_PROXY_TARGET must start with http:// or https:// (got '$API_PROXY_TARGET')" ;;
  esac
  case "${API_PROXY_TARGET#*://}" in
    */*) fail "API_PROXY_TARGET must be scheme://host[:port] with no path (got '$API_PROXY_TARGET')" ;;
  esac
fi

API_ORIGIN=$(origin_of "$(printenv VITE_API_BASE_URL || true)")
SENTRY_ORIGIN=$(origin_of "$(printenv VITE_SENTRY_DSN || true)")
SCRIPT_HASHES=$(cat "$APP_DIR/csp-script-hashes" 2>/dev/null || true)
DEFAULT_CSP="default-src 'self'; script-src 'self' $SCRIPT_HASHES; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' $API_ORIGIN $SENTRY_ORIGIN; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
CONTENT_SECURITY_POLICY=${CONTENT_SECURITY_POLICY:-$DEFAULT_CSP}
export API_PROXY_TARGET CONTENT_SECURITY_POLICY

if [ -n "$API_PROXY_TARGET" ]; then
  envsubst '${API_PROXY_TARGET} ${CONTENT_SECURITY_POLICY}' \
    < "$APP_DIR/nginx.conf.template" > /etc/nginx/conf.d/default.conf
  log "proxying /api/ to $API_PROXY_TARGET"
else
  sed '/# api-proxy:begin/,/# api-proxy:end/d' "$APP_DIR/nginx.conf.template" \
    | envsubst '${CONTENT_SECURITY_POLICY}' > /etc/nginx/conf.d/default.conf
  log "no API proxy (set API_PROXY_TARGET to forward /api/ to a backend)"
fi
log "Content-Security-Policy: $CONTENT_SECURITY_POLICY"

# 3. Serve.
exec nginx -g 'daemon off;'
```

The single quotes around `'${API_PROXY_TARGET} ${CONTENT_SECURITY_POLICY}'` are intentional. envsubst receives the variable *names*, so nginx's own `$uri`, `$host` and so on stay untouched.

Run: `pnpm exec vitest run src/test/docker-config.guard.test.ts`
Expected: PASS.

- [ ] **Step 3: Create `docker/nginx.conf.template`**

```nginx
# nginx server configuration for the production image (spec §10.4).
# docker/docker-entrypoint.sh renders it into /etc/nginx/conf.d/default.conf at every container start:
#   - envsubst fills in only the CONTENT_SECURITY_POLICY and API_PROXY_TARGET placeholders, so nginx's
#     own $variables are left alone;
#   - the block between the api-proxy markers is removed when API_PROXY_TARGET is empty.

# Cache rules (spec §10.4), applied through one variable. nginx drops inherited add_header directives in any
# location that declares its own, so every header is set once, at server level.
map $uri $app_cache_control {
    default        "";
    ~^/assets/     "public, max-age=31536000, immutable";
    /index.html    "no-store";
    /config.js     "no-store";
}

# Keep the original scheme when a TLS-terminating proxy sits in front (backends use it for Secure cookies).
map $http_x_forwarded_proto $app_forwarded_proto {
    default        $http_x_forwarded_proto;
    ""             $scheme;
}

server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    server_tokens off;
    # Redirects keep the host and port the browser used (the container's 8080 is usually mapped).
    absolute_redirect off;

    # gzip for every text asset. brotli is not built into the official nginx images (Deviation 10).
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/javascript application/javascript application/json image/svg+xml;

    add_header Cache-Control $app_cache_control always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    # Built at container start (docs/security.md): scripts only from this origin plus the hashes of the
    # inline scripts in index.html; API calls only to this origin plus the VITE_API_BASE_URL and
    # VITE_SENTRY_DSN origins. Set CONTENT_SECURITY_POLICY to replace the whole policy.
    add_header Content-Security-Policy "${CONTENT_SECURITY_POLICY}" always;

    location = /healthz {
        access_log off;
        default_type text/plain;
        return 200 "ok\n";
    }

    # A missing hashed file is a 404, never index.html (which the browser would then cache as that file).
    location /assets/ {
        try_files $uri =404;
    }

    # api-proxy:begin
    # Same-origin API: the browser calls /api/* on this server and nginx forwards the request unchanged,
    # so the backend needs no CORS setup and httpOnly session cookies just work.
    location /api/ {
        proxy_pass ${API_PROXY_TARGET};
        proxy_http_version 1.1;
        proxy_ssl_server_name on;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $app_forwarded_proto;
        proxy_set_header X-Forwarded-Host $host;
        proxy_read_timeout 60s;
    }
    # api-proxy:end

    # SPA fallback: client-side routes such as /items/42 get index.html.
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 4: Create `scripts/csp-script-hashes.mjs`**

```js
/**
 * Prints the CSP hash sources ('sha256-…') of every inline <script> in an HTML file, space-separated.
 * The Docker build stores them, so the container's Content-Security-Policy allows exactly those scripts.
 *
 *   node scripts/csp-script-hashes.mjs dist/index.html
 *   curl -s http://localhost:8080/ | node scripts/csp-script-hashes.mjs -
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const source = process.argv[2] ?? 'dist/index.html';
const html = readFileSync(source === '-' ? 0 : source, 'utf8');

// <script> elements without a src attribute. Browsers hash the text with line endings normalised to LF.
const INLINE_SCRIPT = /<script\b(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;

const hashes = [...html.matchAll(INLINE_SCRIPT)].map(([, body = '']) => {
  const digest = createHash('sha256').update(body.replace(/\r\n?/g, '\n'), 'utf8').digest('base64');
  return `'sha256-${digest}'`;
});

process.stdout.write(hashes.join(' '));
```

Run: `pnpm build && node scripts/csp-script-hashes.mjs dist/index.html`
Expected: exactly one value, `'sha256-…='`, for the theme bootstrap script. `config.js` and the bundle are external scripts, so they are covered by `'self'`.

- [ ] **Step 5: Create `.dockerignore`**

The TypeScript projects include `e2e/` and `.storybook/`, so both must stay in the build context.

```gitignore
# Build context for the Docker images: everything the build needs, nothing it produces.
.git
node_modules
dist
coverage
.vitest
playwright-report
test-results
blob-report
storybook-static
stats.html
*.log
.env
.env.*
!.env.example
.DS_Store
.idea
.vscode
Dockerfile
Dockerfile.dev
docker-compose.yml
.dockerignore
```

- [ ] **Step 6: Create `Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1

# Production image (spec §10.4): build once, configure at start-up (docs/docker.md).
#   docker build -t react-bedrock:local --build-arg APP_VERSION=1.2.3 --build-arg GIT_SHA="$(git rev-parse HEAD)" .
# The two Node stages run on the build machine's platform. Their output is static files, so images for other
# platforms (e.g. linux/arm64) need no emulation.

# ---- deps: install dependencies (cached until package.json or the lockfile change)
FROM --platform=$BUILDPLATFORM node:24-alpine AS deps
WORKDIR /app
ENV HUSKY=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# The exact pnpm version pinned in package.json#packageManager (installed with npm; Deviation 13).
RUN npm install -g "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1].split('+')[0]")"
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

# ---- build: compile the app. No environment-specific values are baked in; they arrive through config.js.
FROM deps AS build
ARG APP_VERSION
ARG GIT_SHA
COPY . .
RUN pnpm build && node scripts/csp-script-hashes.mjs dist/index.html > csp-script-hashes

# ---- runtime: static files served by unprivileged nginx
FROM nginxinc/nginx-unprivileged:stable-alpine-slim AS runtime
ARG APP_VERSION
ARG GIT_SHA
LABEL org.opencontainers.image.title="react-bedrock" \
      org.opencontainers.image.description="React single-page app served by unprivileged nginx, configured at start-up" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_SHA}"

COPY --from=build /app/dist /usr/share/nginx/html
# The entrypoint runs as UID 101 and rewrites config.js at every start. Every other file stays read-only.
COPY --from=build --chown=101:0 --chmod=664 /app/dist/config.js /usr/share/nginx/html/config.js
COPY --from=build /app/csp-script-hashes /etc/nginx/app/csp-script-hashes
COPY docker/nginx.conf.template /etc/nginx/app/nginx.conf.template
COPY --chmod=755 docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
```

The runtime stage deliberately has no `RUN` instruction. `RUN` is what needs emulation in multi-platform builds, and the base image already gives UID 101 ownership of `/etc/nginx/conf.d`.

- [ ] **Step 7: Build the image**

```bash
docker build -t react-bedrock:local --build-arg APP_VERSION=0.1.0 --build-arg GIT_SHA="$(git rev-parse HEAD)" .
docker image ls react-bedrock:local
```

Expected: the build succeeds, and `SIZE` is well under 50 MB (about 20 MB).

If the build fails in the `deps` stage with an "unreviewed build scripts" error, the package it names is missing from `allowBuilds` in `pnpm-workspace.yaml` (Task 1.1 Step 2).

- [ ] **Step 8: Create `scripts/docker-smoke-test.sh`**

```bash
#!/usr/bin/env bash
# Smoke test for the production image (spec §10.4). CI runs it after every image build. Locally:
#   docker build -t react-bedrock:local . && bash scripts/docker-smoke-test.sh react-bedrock:local
# It starts throwaway containers on ports 18080 and 18081 and checks the runtime contract end to end.
set -euo pipefail
export MSYS_NO_PATHCONV=1 # Git Bash on Windows: pass /paths to docker unchanged
cd "$(dirname "$0")/.."

IMAGE="${1:-react-bedrock:local}"
NAME="bedrock-smoke-$$"
BASE="http://127.0.0.1:18080"
PROXY_BASE="http://127.0.0.1:18081"

cleanup() {
  docker rm -f "$NAME" "$NAME-proxy" "$NAME-invalid" >/dev/null 2>&1 || true
}
trap cleanup EXIT

fail() {
  echo "FAIL: $*" >&2
  docker logs "$NAME" >&2 2>&1 || true
  exit 1
}

pass() {
  echo "ok:   $*"
}

# Succeeds when the text in $1 contains the literal string $2.
contains() {
  grep -qF -- "$2" <<<"$1"
}

wait_healthy() {
  for _ in $(seq 1 30); do
    if [ "$(curl -fsS "$1/healthz" 2>/dev/null || true)" = "ok" ]; then
      return 0
    fi
    sleep 1
  done
  fail "$1/healthz did not answer 'ok' within 30 seconds"
}

size=$(docker image inspect "$IMAGE" --format '{{.Size}}')
[ "$size" -lt $((50 * 1024 * 1024)) ] || fail "the image is $((size / 1024 / 1024)) MB; the target is under 50 MB"
pass "image size is $((size / 1024 / 1024)) MB"

docker run -d --name "$NAME" -p 18080:8080 \
  -e VITE_APP_NAME='Smoke "Test" \ App' \
  -e VITE_API_BASE_URL='http://api.example.test:3000' \
  -e VITE_FEATURE_FLAGS='itemsExport' \
  -e VITE_SENTRY_DSN= \
  "$IMAGE" >/dev/null
wait_healthy "$BASE"
pass "/healthz answers ok"

[ "$(docker exec "$NAME" id -u)" != "0" ] || fail "the container must not run as root"
pass "runs as a non-root user"

contains "$(curl -fsS "$BASE/")" '<div id="root">' || fail "/ must serve index.html"
contains "$(curl -fsS "$BASE/items/42")" '<div id="root">' || fail "client-side routes must fall back to index.html"
contains "$(curl -fsS "$BASE/api/items")" '<div id="root">' || fail "without API_PROXY_TARGET, /api/ must not be proxied"
pass "SPA fallback"

curl -fsS "$BASE/config.js" | node -e '
  const vm = require("node:vm");
  let source = "";
  process.stdin.on("data", (chunk) => (source += chunk));
  process.stdin.on("end", () => {
    const sandbox = { window: {} };
    vm.runInNewContext(source, sandbox);
    const config = sandbox.window.__APP_CONFIG__ ?? {};
    const expected = {
      VITE_APP_NAME: "Smoke \"Test\" \\ App",
      VITE_API_BASE_URL: "http://api.example.test:3000",
      VITE_FEATURE_FLAGS: "itemsExport",
    };
    for (const [key, value] of Object.entries(expected)) {
      if (config[key] !== value) {
        console.error(`${key} is ${JSON.stringify(config[key])}, expected ${JSON.stringify(value)}`);
        process.exit(1);
      }
    }
    if ("VITE_SENTRY_DSN" in config) {
      console.error("empty variables must be left out of config.js");
      process.exit(1);
    }
  });
' || fail "config.js must carry the runtime configuration, JSON-escaped"
pass "config.js carries the runtime configuration"

index_headers=$(curl -fsSI "$BASE/" | tr -d '\r')
config_headers=$(curl -fsSI "$BASE/config.js" | tr -d '\r')
asset=$(curl -fsS "$BASE/" | grep -o '/assets/[^"]*\.js' | sed -n '1p')
[ -n "$asset" ] || fail "index.html must load a hashed script from /assets/"
asset_headers=$(curl -fsSI "$BASE$asset" | tr -d '\r')
contains "$index_headers" 'Cache-Control: no-store' || fail "index.html must be sent with Cache-Control: no-store"
contains "$config_headers" 'Cache-Control: no-store' || fail "config.js must be sent with Cache-Control: no-store"
contains "$asset_headers" 'Cache-Control: public, max-age=31536000, immutable' || fail "hashed assets must be cached as immutable"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/assets/missing.js")" = "404" ] || fail "a missing asset must be a 404"
pass "caching"

for header in 'X-Content-Type-Options: nosniff' 'Referrer-Policy: strict-origin-when-cross-origin' 'X-Frame-Options: SAMEORIGIN'; do
  contains "$index_headers" "$header" || fail "missing header: $header"
done
csp=$(grep -i '^Content-Security-Policy:' <<<"$index_headers" || true)
contains "$csp" "connect-src 'self' http://api.example.test:3000" || fail "the CSP must allow the runtime API origin: $csp"
hashes=$(curl -fsS "$BASE/" | node scripts/csp-script-hashes.mjs -)
[ -n "$hashes" ] || fail "index.html must contain the inline theme script"
for hash in $hashes; do
  contains "$csp" "$hash" || fail "the CSP must allow the inline script $hash"
done
pass "security headers and CSP"

docker run -d --name "$NAME-proxy" -p 18081:8080 -e API_PROXY_TARGET=http://127.0.0.1:9 "$IMAGE" >/dev/null
wait_healthy "$PROXY_BASE"
status=$(curl -s -o /dev/null -w '%{http_code}' "$PROXY_BASE/api/items")
[ "$status" = "502" ] || fail "with API_PROXY_TARGET set, /api/ must be proxied (expected 502 from the closed port, got $status)"
pass "API proxy"

docker run -d --name "$NAME-invalid" -e API_PROXY_TARGET=backend:3000 "$IMAGE" >/dev/null
sleep 3
[ "$(docker inspect -f '{{.State.Running}}' "$NAME-invalid")" = "false" ] || fail "an invalid API_PROXY_TARGET must stop the container"
contains "$(docker logs "$NAME-invalid" 2>&1)" 'API_PROXY_TARGET must start with http://' || fail "the container must say why API_PROXY_TARGET is invalid"
pass "an invalid API_PROXY_TARGET is rejected"

echo "Smoke test passed: $IMAGE"
```

The script captures output and then searches it, rather than piping into `grep -q`. With `pipefail`, `grep -q` can end a pipe early and turn a pass into a failure.

- [ ] **Step 9: Run the smoke test**

Run (Git Bash): `bash scripts/docker-smoke-test.sh react-bedrock:local`
Expected: one `ok:` line per check, ending with `Smoke test passed: react-bedrock:local`.

When a check fails, the script prints the container logs, which include the effective CSP and proxy status. To inspect the rendered nginx config, start a container and read it:

```bash
docker run -d --name bedrock-debug -p 8080:8080 react-bedrock:local
MSYS_NO_PATHCONV=1 docker exec bedrock-debug cat /etc/nginx/conf.d/default.conf
docker rm -f bedrock-debug
```

`MSYS_NO_PATHCONV=1` is only needed in Git Bash, where it stops the path from being rewritten.

- [ ] **Step 10: Append these sections to `docs/security.md`**

```markdown
## HTTP headers and Content Security Policy (Docker image)

The nginx image (`docker/nginx.conf.template`) sends these headers on every response:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Content-Security-Policy` | built at container start, as described below |

The **default policy** (`docker/docker-entrypoint.sh`):
- `script-src 'self'` plus the SHA-256 hash of each inline script in `index.html` (the theme bootstrap). The hashes are computed during the image build by `scripts/csp-script-hashes.mjs`. There is no `unsafe-inline` or `unsafe-eval` for scripts, so injected `<script>` tags and inline event handlers don't run.
- `connect-src 'self'` plus the origins of `VITE_API_BASE_URL` and `VITE_SENTRY_DSN` when they are absolute URLs. Pointing the image at another API therefore needs no policy change.
- `style-src 'self' 'unsafe-inline'`, because toast styles are injected at runtime.
- `img-src 'self' data: blob:` and `font-src 'self' data:`.
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` and `frame-ancestors 'self'`.

**Changing it:** set `CONTENT_SECURITY_POLICY` to the full policy; it replaces the default.
- Start from the effective policy the container logs at start-up (`docker compose logs web`).
- Keep the `'sha256-…'` source. Without it the theme script is blocked: the app still works, but flashes the light theme while loading.
- The value must not contain double quotes or `$`.
- **Third-party services** (analytics, fonts, maps): add their origins to the matching directive (`script-src`, `connect-src`, `img-src`, …). Test with the browser console open, where blocked requests are reported.

`pnpm dev` and `pnpm preview` send no CSP, so check policy changes in the Docker image (`docker compose up --build`).

## Runtime configuration is public

- At start-up, the container writes the whitelisted `VITE_*` variables to `/config.js`, which every visitor downloads.
- Server-side settings (`API_PROXY_TARGET`, `CONTENT_SECURITY_POLICY`) are used by nginx and never reach the browser.
- Never pass secrets through `VITE_*` variables.

## Container image

- nginx runs as an unprivileged user (UID 101) on port 8080. The only files it can change are `config.js` and its own server config, which are rewritten at every start.
- The runtime image contains only nginx and the built static files: no Node.js, no source code, no dependencies.
- A `HEALTHCHECK` probes `/healthz`, and `scripts/docker-smoke-test.sh` checks the whole runtime contract in CI.
```

- [ ] **Step 11: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green.

Git on Windows doesn't record the executable bit, so set it explicitly for Linux and macOS clones:

```bash
git add -A
git update-index --chmod=+x docker/docker-entrypoint.sh scripts/docker-smoke-test.sh
git commit -m "build(docker): add production image with runtime config, security headers and smoke test" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 10.4: Docker Compose and the dev container

**Files:**
- Create: `docker-compose.yml`, `Dockerfile.dev`, `docs/docker.md`
- Modify: `src/test/docker-config.guard.test.ts`, `.env.example`, `package.json` (scripts)

**Interfaces:**
- Consumes: the image from Task 10.3; `CHOKIDAR_USEPOLLING` support (Task 10.2).
- Produces:
  - **Service `web`** (always on):
    - builds `Dockerfile` as `react-bedrock:local` and maps `${WEB_PORT:-8080}:8080`
    - gives every `VITE_*` variable a `${VAR:-default}` equal to the app's own default (guard-tested)
    - also passes `API_PROXY_TARGET` and `CONTENT_SECURITY_POLICY`
    - `restart: unless-stopped`, with a healthcheck
  - **Service `web-dev`** (profile `dev`):
    - builds `Dockerfile.dev` and maps `${DEV_PORT:-5173}:5173`
    - bind-mounts the source, with `node_modules` in a named volume
    - passes the `VITE_*` variables through without values: shell values win, otherwise Vite reads `.env*`
    - sets `CHOKIDAR_USEPOLLING` (default `true`)
  - Scripts:
    - `docker:up` = `docker compose up --build`
    - `docker:dev` = `docker compose --profile dev up --build web-dev`
    - `docker:down` = `docker compose --profile dev down`

- [ ] **Step 1: Extend the guard test (replace `src/test/docker-config.guard.test.ts`)**

```ts
import { describe, expect, it } from 'vitest';

import compose from '/docker-compose.yml?raw';
import entrypoint from '/docker/docker-entrypoint.sh?raw';

import { ENV_KEYS, parseEnv } from '@/config/env';

const PROD = { dev: false, prod: true, test: false };
const sorted = (values: readonly (string | undefined)[]) => [...values].sort();

describe('Docker configuration (spec §10.4)', () => {
  it('writes every supported variable, and only those, into config.js', () => {
    const keys = /^CONFIG_KEYS="([^"]*)"$/m.exec(entrypoint)?.[1]?.split(/\s+/) ?? [];
    expect(sorted(keys)).toEqual(sorted(ENV_KEYS));
  });

  it('gives the web service a default for every variable, equal to the app defaults', () => {
    const defaults = Object.fromEntries(
      [...compose.matchAll(/^\s+(VITE_[A-Z_]+): \$\{\1:-([^}]*)\}$/gm)].map(
        (match) => [match[1] ?? '', match[2] ?? ''] as const,
      ),
    );

    expect(sorted(Object.keys(defaults))).toEqual(sorted(ENV_KEYS));
    expect(parseEnv({ buildTime: defaults, mode: PROD }).env).toEqual(
      parseEnv({ buildTime: {}, mode: PROD }).env,
    );
  });

  it('passes every variable through to the dev container', () => {
    const passed = [...compose.matchAll(/^\s+- (VITE_[A-Z_]+)$/gm)].map((match) => match[1]);
    expect(sorted(passed)).toEqual(sorted(ENV_KEYS));
  });
});
```

Run: `pnpm exec vitest run src/test/docker-config.guard.test.ts`
Expected: FAIL with `Failed to resolve import "/docker-compose.yml?raw"`.

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
# Run the app with only Docker installed (docs/docker.md):
#   docker compose up                  production build on http://localhost:8080 (mock API, no .env needed)
#   docker compose --profile dev up    also starts the Vite dev server with hot reload on http://localhost:5173
#   docker compose down                stop everything
# Every setting has a default below. Override it in your shell or in an optional .env file (see .env.example).

services:
  web:
    build:
      context: .
      args:
        APP_VERSION: ${APP_VERSION:-}
        GIT_SHA: ${GIT_SHA:-}
    image: react-bedrock:local
    ports:
      - '${WEB_PORT:-8080}:8080'
    environment:
      # Written to /config.js at start: PUBLIC, visible to every browser. Empty = the app's own default.
      VITE_APP_NAME: ${VITE_APP_NAME:-React Bedrock}
      VITE_API_BASE_URL: ${VITE_API_BASE_URL:-/api}
      VITE_APP_ENV: ${VITE_APP_ENV:-}
      VITE_DEFAULT_LOCALE: ${VITE_DEFAULT_LOCALE:-en}
      VITE_DEFAULT_CURRENCY: ${VITE_DEFAULT_CURRENCY:-USD}
      VITE_ENABLE_MOCKS: ${VITE_ENABLE_MOCKS:-true}
      VITE_SENTRY_DSN: ${VITE_SENTRY_DSN:-}
      VITE_LOG_LEVEL: ${VITE_LOG_LEVEL:-}
      VITE_FEATURE_FLAGS: ${VITE_FEATURE_FLAGS:-}
      # Used by nginx only; never sent to the browser.
      API_PROXY_TARGET: ${API_PROXY_TARGET:-}
      CONTENT_SECURITY_POLICY: ${CONTENT_SECURITY_POLICY:-}
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'wget', '-q', '-O', '/dev/null', 'http://127.0.0.1:8080/healthz']
      interval: 30s
      timeout: 3s
      start_period: 5s
      retries: 3

  web-dev:
    profiles: ['dev']
    build:
      context: .
      dockerfile: Dockerfile.dev
    image: react-bedrock-dev:local
    ports:
      - '${DEV_PORT:-5173}:5173'
    environment:
      # No value: taken from your shell when set there; otherwise Vite reads .env / .env.local from the source.
      - VITE_APP_NAME
      - VITE_API_BASE_URL
      - VITE_APP_ENV
      - VITE_DEFAULT_LOCALE
      - VITE_DEFAULT_CURRENCY
      - VITE_ENABLE_MOCKS
      - VITE_SENTRY_DSN
      - VITE_LOG_LEVEL
      - VITE_FEATURE_FLAGS
      - API_PROXY_TARGET
      # Bind-mounted files emit no change events on Windows/WSL hosts, so poll instead.
      - CHOKIDAR_USEPOLLING=${CHOKIDAR_USEPOLLING:-true}
    volumes:
      - .:/app
      # The container's Linux dependencies stay in a volume and never mix with the host's node_modules.
      - node_modules:/app/node_modules

  # ── Your backend in this Compose project ─────────────────────────────────────────────
  # Uncomment, set the image and port, and add `depends_on: [backend]` to `web`. Then start with
  #   API_PROXY_TARGET=http://backend:3000 VITE_ENABLE_MOCKS=false docker compose up
  #
  # backend:
  #   image: your-registry/your-api:latest
  #   expose:
  #     - '3000'

volumes:
  node_modules:

# ── Your backend in another Compose project ─────────────────────────────────────────────
# Join that project's network (`docker network ls`) and use its service name, e.g.
#   API_PROXY_TARGET=http://their-api:3000 VITE_ENABLE_MOCKS=false docker compose up
#
# networks:
#   default:
#     name: other-project_default
#     external: true
```

Run: `pnpm exec vitest run src/test/docker-config.guard.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 3: Create `Dockerfile.dev`**

```dockerfile
# syntax=docker/dockerfile:1

# Development image (spec §10.4): the Vite dev server with hot reload, started by
#   docker compose --profile dev up web-dev    (or: pnpm docker:dev)
# docker-compose.yml bind-mounts the source into /app and keeps node_modules in a named volume,
# so the container's Linux dependencies never mix with the host's (important on macOS and Windows).
FROM node:24-alpine
WORKDIR /app
ENV HUSKY=0
COPY package.json ./
# The exact pnpm version pinned in package.json#packageManager (installed with npm; Deviation 13).
RUN npm install -g "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1].split('+')[0]")"
EXPOSE 5173
# Install at every start, so the volume follows the lockfile; this is a quick no-op when nothing changed.
# The package store lives inside the volume, so a rebuilt container reuses what was already downloaded.
CMD ["sh", "-c", "pnpm install --frozen-lockfile --store-dir /app/node_modules/.pnpm-store && exec pnpm dev --host 0.0.0.0 --port 5173 --strictPort"]
```

- [ ] **Step 4: Add the scripts and document the Docker settings**

1. Add these entries to the `package.json` scripts:

   ```json
   "docker:up": "docker compose up --build",
   "docker:dev": "docker compose --profile dev up --build web-dev",
   "docker:down": "docker compose --profile dev down"
   ```

2. Append to `.env.example`:

   ```dotenv
   # Poll for file changes in the dev server (bind mounts on Windows/WSL emit no change events).
   # The Docker dev container (docker compose --profile dev) turns this on by default.
   CHOKIDAR_USEPOLLING=

   # --- Docker only (docker compose reads .env, not .env.local; see docs/docker.md) ---
   # Replaces the whole Content-Security-Policy header. Empty = the image's built-in policy (docs/security.md).
   CONTENT_SECURITY_POLICY=
   # Host ports for `docker compose up` and `docker compose --profile dev up`.
   WEB_PORT=8080
   DEV_PORT=5173
   # Build metadata shown in the footer and stored as image labels (default: package.json version and "local").
   APP_VERSION=
   GIT_SHA=
   ```

- [ ] **Step 5: Verify the commands the README promises (spec §10.4)**

Compose reads a `.env` file in the repo root, so move any `.env` out of the way first.

1. Run: `docker compose up --build`
   Expected:
   - the log shows `docker-entrypoint: no API proxy …` and the CSP line
   - `docker compose ps` (in a second terminal) reports `healthy` within about 30 seconds
   - http://localhost:8080 shows the sign-in page with the demo-account hint
   - signing in as `admin@example.com` / `demo1234` works, and the Items list loads from the mock API
2. Stop it with Ctrl+C. Then run it pointed at a real API. In Git Bash:

   ```bash
   VITE_API_BASE_URL=http://my-api:3000 VITE_ENABLE_MOCKS=false docker compose up
   ```

   In PowerShell:

   ```powershell
   $env:VITE_API_BASE_URL = 'http://my-api:3000'; $env:VITE_ENABLE_MOCKS = 'false'; docker compose up
   ```

   Expected:
   - Compose recreates the container **without building**: it's the same image
   - `curl -s http://localhost:8080/config.js` shows both values
   - the sign-in page no longer shows the demo hint
   - `curl -sI http://localhost:8080/` lists `http://my-api:3000` in `connect-src`

   Afterwards, clear the variables. In PowerShell: `Remove-Item Env:VITE_API_BASE_URL, Env:VITE_ENABLE_MOCKS`.
3. Run: `docker compose down`
   Expected: the container and network are removed.
4. Run: `pnpm docker:dev`
   Expected:
   - the first start installs dependencies into the volume, which takes a minute or two; then Vite prints its URL
   - http://localhost:5173 works
   - changing `"emptyTitle"` under `"dashboard"` in `src/locales/en/common.json` updates the open dashboard without a reload (revert the change afterwards)
5. Run: `pnpm docker:down`

- [ ] **Step 6: Write `docs/docker.md`**

````markdown
# Docker

Run the app with **only Docker installed**: no Node.js, no pnpm, no `.env` file.

| Command | Result |
|---|---|
| `docker compose up` | Production build served by nginx at http://localhost:8080, mock API on, no backend or `.env` needed |
| `VITE_API_BASE_URL=http://my-api:3000 VITE_ENABLE_MOCKS=false docker compose up` | The same image, pointed at a real API |
| `docker compose --profile dev up` | Vite dev server with hot reload at http://localhost:5173, source mounted from your machine |
| `docker compose down` | Stops everything |

- **Shortcuts:**
  - `pnpm docker:up` rebuilds, then starts the production service.
  - `pnpm docker:dev` starts only the dev server. `docker compose --profile dev up` starts the production service too.
  - `pnpm docker:down` stops both.
- **After changing code,** add `--build` (`docker compose up --build`). Otherwise Compose reuses the image it built last time. Configuration changes never need a rebuild.
- **Windows PowerShell:** set variables first, then clear them when you're done:

  ```powershell
  $env:VITE_ENABLE_MOCKS = 'false'; docker compose up
  Remove-Item Env:VITE_ENABLE_MOCKS
  ```

- **Settings:** Compose reads an optional `.env` file next to `docker-compose.yml` (not `.env.local`). `.env.example` lists every setting.

## How runtime configuration works, and why

The image is built **once**, with no environment-specific values in it. At every container start, `docker/docker-entrypoint.sh`:
1. writes `/config.js` with the `VITE_*` variables that are set (whitelisted names only, values JSON-escaped);
2. renders the nginx config: the `/api` proxy when `API_PROXY_TARGET` is set, plus the Content-Security-Policy;
3. starts nginx.

`index.html` loads `/config.js` before the app bundle, and `src/config/env.ts` merges it over the built-in defaults and validates the result. Both files are served with `Cache-Control: no-store`, so a changed setting applies on the next page load.

The payoff: the exact image that passed QA runs in staging and production, and any team can point it at their own API with an environment variable, without rebuilding.

**Everything in `config.js` is public,** because every browser downloads it. Never put secrets in `VITE_*` variables.

## Runtime variables

| Variable | Default | Used by | Notes |
|---|---|---|---|
| `VITE_APP_NAME` | `React Bedrock` | browser | Name in the title and sidebar. Also namespaces browser storage keys |
| `VITE_API_BASE_URL` | `/api` | browser | The URL the **browser** calls. `/api` means this server (combine with `API_PROXY_TARGET`) |
| `VITE_APP_ENV` | `production` | browser | `development`, `staging` or `production` |
| `VITE_DEFAULT_LOCALE` | `en` | browser | `en` or `es` |
| `VITE_DEFAULT_CURRENCY` | `USD` | browser | ISO 4217 code |
| `VITE_ENABLE_MOCKS` | `true` | browser | The mock API. Set `false` for real deployments |
| `VITE_SENTRY_DSN` | (empty) | browser | Turns on error reporting to Sentry |
| `VITE_LOG_LEVEL` | `warn` | browser | `debug`, `info`, `warn` or `error` |
| `VITE_FEATURE_FLAGS` | (empty) | browser | Comma-separated flags, e.g. `itemsExport` |
| `API_PROXY_TARGET` | (empty) | nginx | The backend that `/api/*` is forwarded to, as reachable **from the container**, e.g. `http://backend:3000` |
| `CONTENT_SECURITY_POLICY` | built-in policy | nginx | Replaces the whole CSP header (docs/security.md) |
| `WEB_PORT` / `DEV_PORT` | `8080` / `5173` | Compose | Host ports |
| `CHOKIDAR_USEPOLLING` | `true` in the dev container | Vite | Poll for file changes (needed for Windows bind mounts) |
| `APP_VERSION` / `GIT_SHA` | package version / `local` | image build | Shown in the footer and stored as image labels |

With `docker run`, pass the same names, for example `docker run -p 8080:8080 -e VITE_ENABLE_MOCKS=false -e API_PROXY_TARGET=http://api.internal:3000 react-bedrock:local`.

## The API proxy (recommended for real backends)

```bash
API_PROXY_TARGET=http://backend:3000 VITE_ENABLE_MOCKS=false docker compose up
```

- The browser calls `/api/*` on the frontend's own origin, and nginx forwards each request **unchanged**. The backend receives `/api/items`, just like with `pnpm dev`'s proxy.
- Same origin means no CORS configuration, and the httpOnly session cookie works without `SameSite=None`. Leave `VITE_API_BASE_URL` at `/api`.
- **Target format:** `http(s)://host[:port]`, with no path. The container refuses to start otherwise.
- **DNS:** nginx resolves the host when the container starts, so the backend must be running by then. Use `depends_on` in the same Compose project.
- **Headers:** nginx adds `X-Forwarded-For`, `X-Forwarded-Proto` and `X-Forwarded-Host`, so the backend can build correct URLs and Secure cookies. Configure the backend to trust the proxy.

**Calling an API directly** (`VITE_API_BASE_URL=https://api.example.com`) works too, and the CSP allows that origin automatically. But:
- The API must allow CORS from the frontend's origin, with credentials and the `X-Request-Id` and `Accept-Language` headers.
- A cookie session only works when both share a site, or when the cookie is `SameSite=None; Secure`.
- The URL must be reachable from the user's browser, not just from the container.

## A backend in the same Compose file

Uncomment the `backend` example at the bottom of `docker-compose.yml`, set its image and port, and add `depends_on: [backend]` to `web`. Then start with:

```bash
API_PROXY_TARGET=http://backend:3000 VITE_ENABLE_MOCKS=false docker compose up
```

## A backend in another Compose project

Services reach each other by name when they share a network.
1. Find the other project's network with `docker network ls`; it is usually `<folder>_default`.
2. Uncomment the `networks` example at the bottom of `docker-compose.yml` and set that name.
3. Use the other project's service name:

   ```bash
   API_PROXY_TARGET=http://their-api:3000 VITE_ENABLE_MOCKS=false docker compose up
   ```

## The dev container

`docker compose --profile dev up web-dev` (or `pnpm docker:dev`) runs `pnpm dev` inside Node 24:
- Your source is bind-mounted, so edits hot-reload.
- `node_modules` lives in a named volume, so the container's Linux dependencies never mix with your machine's.
- `pnpm install` runs at every start. It is quick when nothing changed; the first start takes a minute or two.
- Settings come from your `.env` / `.env.local` files, exactly as with `pnpm dev`. Variables set in your shell win.

## Troubleshooting

| Problem | Fix |
|---|---|
| `port is already allocated` | Another program uses 8080 or 5173. Use another port: `WEB_PORT=8081 docker compose up` (or `DEV_PORT`) |
| Hot reload ignores edits | Polling is on by default in the dev container, so check that `CHOKIDAR_USEPOLLING` isn't set to `false`. With Docker Desktop on WSL, a project stored inside the WSL filesystem gets native file events |
| High CPU in the dev container | On macOS and Linux, file events work without polling: `CHOKIDAR_USEPOLLING=false pnpm docker:dev` |
| A changed setting doesn't show up | Check what the container serves: `curl http://localhost:8080/config.js`. If that is right, something in front (a CDN or proxy) is caching `config.js` or `index.html` and must pass `Cache-Control: no-store` through. Then hard-reload |
| Code changes don't show up | Rebuild: `docker compose up --build` |
| API calls return HTML or `405` | Mocks are off, `VITE_API_BASE_URL` is `/api` and no `API_PROXY_TARGET` is set, so nginx answers `/api/*` with the app itself. Set `API_PROXY_TARGET`, or an absolute `VITE_API_BASE_URL` |
| The container exits with `host not found in upstream` | nginx can't resolve the `API_PROXY_TARGET` host at start. Start the backend first (`depends_on`) and check the name and network |
| The container exits with `API_PROXY_TARGET must …` | Use `http(s)://host[:port]` without a path |
| The mock API doesn't start when the app is opened from another computer | Service workers need a secure context: `localhost` or HTTPS. Use `localhost`, put HTTPS in front, or use a real backend with `VITE_ENABLE_MOCKS=false` |
| The browser console reports a CSP violation | Allow the blocked origin with `CONTENT_SECURITY_POLICY` (docs/security.md). The effective policy is in `docker compose logs web` |
| `pnpm install --frozen-lockfile` fails during the build | The lockfile is out of date. Run `pnpm install` locally and commit `pnpm-lock.yaml` |

The image is under 50 MB (`docker image ls react-bedrock`), runs as a non-root user and reports its health: `docker compose ps` shows `healthy`.
````

- [ ] **Step 7: Run the checks and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all green. `prettier --check` also validates the YAML.

```bash
git add -A
git commit -m "build(docker): add compose services for production and hot-reload development" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 10.5: GitHub Actions, Dependabot and repository conventions (spec §10.3)

**Files:**
- Create:
  - `.github/actions/setup/action.yml`
  - `.github/workflows/ci.yml`, `deploy.yml`, `storybook.yml`, `docker-publish.yml`
  - `.github/dependabot.yml`, `.github/pull_request_template.md`
  - `docs/deployment.md`
- Modify: `docs/contributing.md`

**Interfaces:**
- Consumes: every script from the earlier phases, and `scripts/docker-smoke-test.sh` (Task 10.3).
- Produces:
  - **CI jobs**, whose names are what branch protection selects:
    - `Lint, typecheck, test, build`
    - `End-to-end (Playwright)`
    - `Generators produce lint-clean code`
    - `Docker image`
  - Artifacts `coverage` and `playwright-report`
  - Repository variables that switch on the optional workflows: `DEPLOY_ENABLED`, `STORYBOOK_PAGES`

- [ ] **Step 1: Create the shared setup action `.github/actions/setup/action.yml`**

```yaml
name: Set up pnpm and Node.js
description: Installs pnpm (version from package.json#packageManager) and Node.js (from .nvmrc), then the dependencies.
runs:
  using: composite
  steps:
    - uses: pnpm/action-setup@v6
    - uses: actions/setup-node@v7
      with:
        node-version-file: .nvmrc
        cache: pnpm
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
      shell: bash
      env:
        HUSKY: '0'
```

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: Lint, typecheck, test, build
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:coverage
      - run: pnpm build
      - name: Check that src/api/generated matches openapi/openapi.yaml
        run: |
          pnpm codegen:api
          if [ -n "$(git status --porcelain -- src/api/generated)" ]; then
            echo "::error::src/api/generated is out of date. Run pnpm codegen:api and commit the result."
            git status --porcelain -- src/api/generated
            exit 1
          fi
      - name: Upload the coverage report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v7
        with:
          name: coverage
          path: coverage/
          if-no-files-found: ignore
          retention-days: 14

  e2e:
    name: End-to-end (Playwright)
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup
      - run: pnpm exec playwright install --with-deps chromium
      # Builds, then tests against `vite preview` with the mock API on (spec §10.3).
      - run: pnpm test:e2e
      - name: Upload the Playwright report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v7
        with:
          name: playwright-report
          path: playwright-report/
          if-no-files-found: ignore
          retention-days: 14

  generators:
    name: Generators produce lint-clean code
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup
      - name: Run every generator
        run: |
          pnpm gen feature purchase-orders purchase-order y
          pnpm gen component status-pill ui
          pnpm gen page reports Reports
          pnpm gen hook window-size
          pnpm gen store filters
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build

  docker:
    name: Docker image
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: docker/setup-buildx-action@v4
      - name: Build the production image
        uses: docker/build-push-action@v7
        with:
          context: .
          load: true
          tags: react-bedrock:ci
          build-args: |
            APP_VERSION=0.0.0-ci
            GIT_SHA=${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: Smoke test
        run: bash scripts/docker-smoke-test.sh react-bedrock:ci
```

- [ ] **Step 3: Create `.github/workflows/deploy.yml`**

The deploy step is a clearly marked placeholder (spec §10.3, decision 5).

```yaml
name: Deploy

# Staging on every push to main, production on every published release (spec §10.3).
# PLACEHOLDER: the template assumes no hosting provider. The job is skipped until the repository
# variable DEPLOY_ENABLED is 'true'. Replace the "Deploy" step first (docs/deployment.md).
on:
  push:
    branches: [main]
  release:
    types: [published]

permissions:
  contents: read

jobs:
  deploy:
    name: Deploy
    if: ${{ vars.DEPLOY_ENABLED == 'true' }}
    runs-on: ubuntu-latest
    timeout-minutes: 20
    environment: ${{ github.event_name == 'release' && 'production' || 'staging' }}
    concurrency:
      group: deploy-${{ github.event_name == 'release' && 'production' || 'staging' }}
      cancel-in-progress: false
    env:
      TARGET: ${{ github.event_name == 'release' && 'production' || 'staging' }}
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup
      - name: Build once for every environment (settings are applied where it is deployed)
        run: pnpm build
        env:
          GIT_SHA: ${{ github.sha }}
      - name: Deploy (placeholder)
        run: |
          echo "::warning::No deployment is configured for $TARGET. Replace this step in .github/workflows/deploy.yml (docs/deployment.md)."
          # Static hosting: upload dist/, then write config.js for $TARGET next to index.html.
          # Containers: deploy ghcr.io/${{ github.repository }} (pushed by docker-publish.yml)
          #             and set the VITE_* variables on the $TARGET service.
```

- [ ] **Step 4: Create `.github/workflows/storybook.yml`**

```yaml
name: Storybook

# Builds the component catalogue on every push to main. Publishing to GitHub Pages is opt-in:
# set the repository variable STORYBOOK_PAGES to 'true' and choose "GitHub Actions" as the Pages source.
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: storybook
  cancel-in-progress: true

jobs:
  build:
    name: Build Storybook
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup
      - run: pnpm storybook:build
      - uses: actions/upload-pages-artifact@v5
        with:
          path: storybook-static

  publish:
    name: Publish to GitHub Pages
    needs: build
    if: ${{ vars.STORYBOOK_PAGES == 'true' }}
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 5: Create `.github/workflows/docker-publish.yml`**

```yaml
name: Publish Docker image

# Pushes the production image to GitHub Container Registry for every published release:
#   ghcr.io/<owner>/<repo>:<version>, :<major>.<minor>, :latest and :sha-<commit>  (docs/deployment.md)
# Run it manually to push a sha-tagged image of any branch.
on:
  release:
    types: [published]
  workflow_dispatch:

permissions:
  contents: read
  packages: write

jobs:
  publish:
    name: Build and push
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v7
      - uses: docker/setup-buildx-action@v4
      - uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - id: meta
        uses: docker/metadata-action@v6
        with:
          images: ghcr.io/${{ github.repository }}
          flavor: latest=auto
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha
      # The Node stages run on the build platform, so arm64 needs no emulation (see the Dockerfile).
      # If an arm64 build ever fails with "exec format error", a RUN step was added to the runtime stage:
      # add docker/setup-qemu-action before buildx.
      - uses: docker/build-push-action@v7
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          build-args: |
            GIT_SHA=${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

The app footer shows the `package.json` version, which the release process sets (docs/deployment.md). The image labels come from `metadata-action`.

- [ ] **Step 6: Create `.github/dependabot.yml`**

```yaml
# Weekly dependency updates (spec §10.3). npm minor and patch updates arrive as one grouped pull request;
# every major update gets its own.
version: 2
updates:
  - package-ecosystem: npm # covers pnpm-lock.yaml too
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
    groups:
      minor-and-patch:
        update-types: [minor, patch]
    ignore:
      # Held back until eslint-plugin-react, eslint-plugin-jsx-a11y and typescript-eslint support them
      # (docs/contributing.md → Dependency updates).
      - dependency-name: eslint
        update-types: ['version-update:semver-major']
      - dependency-name: '@eslint/js'
        update-types: ['version-update:semver-major']
      - dependency-name: typescript
        update-types: ['version-update:semver-major', 'version-update:semver-minor']
      # The Node.js types follow the major version in .nvmrc.
      - dependency-name: '@types/node'
        update-types: ['version-update:semver-major']
    commit-message:
      prefix: chore
      include: scope

  - package-ecosystem: github-actions
    directories: ['/', '/.github/actions/*']
    schedule:
      interval: weekly
    groups:
      actions:
        patterns: ['*']
    commit-message:
      prefix: ci

  - package-ecosystem: docker
    directory: /
    schedule:
      interval: weekly
    commit-message:
      prefix: build
```

- [ ] **Step 7: Create `.github/pull_request_template.md`**

```markdown
## What and why

<!-- One or two sentences. Link the issue if there is one. -->

## Checklist

- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass locally
- [ ] New UI text exists in every locale (`src/locales/*`)
- [ ] Async views handle loading, empty, error and success states
- [ ] No new direct imports of wrapped libraries (ESLint enforces this)
- [ ] Docs in `docs/` updated for any new module or convention
```

- [ ] **Step 8: Validate the workflows and replay CI locally**

1. Run: `pnpm format && pnpm lint`
   Expected: exits 0. `prettier --check` parses every YAML file, so a syntax error fails here.
2. Replay what the jobs run:
   - **verify:**

     ```bash
     pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build
     pnpm codegen:api && git status --porcelain -- src/api/generated
     ```

     Expected: the last command prints nothing.
   - **e2e:** `pnpm test:e2e`
   - **generators:** start from a clean tree, then run the five `pnpm gen` commands from `ci.yml` and `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Throw the output away with `git restore . && git clean -fd -- src`.
   - **docker:**

     ```bash
     docker build -t react-bedrock:ci . && bash scripts/docker-smoke-test.sh react-bedrock:ci
     ```
3. Optional: lint the workflows with actionlint through Docker. It downloads a third-party image, so ask the owner first:

   ```bash
   docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest -color
   ```

   Expected: no findings.

The workflows first run for real when the owner pushes the repository (Task 11.3).

- [ ] **Step 9: Write `docs/deployment.md`**

````markdown
# Deployment

## Pipelines (`.github/workflows/`)

| Workflow | Runs on | What it does |
|---|---|---|
| `ci.yml` | every pull request and every push to `main` | Lint, typecheck, tests with coverage, build, generated-client drift check, every generator, Playwright E2E, and the Docker build with smoke test. Uploads coverage and the Playwright report (docs/contributing.md) |
| `docker-publish.yml` | every published release, or manually | Builds the image for `linux/amd64` and `linux/arm64` and pushes it to GitHub Container Registry |
| `deploy.yml` | push to `main` → staging; published release → production | **Placeholder.** Builds, then warns where the deploy step goes. Skipped until the repository variable `DEPLOY_ENABLED` is `true` |
| `storybook.yml` | push to `main`, or manually | Builds Storybook, and publishes it to GitHub Pages when the repository variable `STORYBOOK_PAGES` is `true` |
| `dependabot.yml` | weekly | Grouped updates for dependencies, GitHub Actions and base images |

The shared setup lives in `.github/actions/setup`: pnpm from `package.json`, Node.js from `.nvmrc`, and a cached install.

## One build, every environment

Builds contain no environment-specific values. Each deployment supplies its settings at runtime:

| Deployed as | Where the settings come from |
|---|---|
| The Docker image | Environment variables on the container, written to `config.js` at start (docs/docker.md) |
| Static files (object storage + CDN, …) | A `config.js` that your deploy step writes next to `index.html` |

So the artifact that passed QA on staging is exactly the one that goes to production. Typical settings:

| Variable | Staging | Production |
|---|---|---|
| `VITE_APP_ENV` | `staging` | `production` |
| `VITE_ENABLE_MOCKS` | `false` | `false` |
| `VITE_API_BASE_URL` | `/api` with `API_PROXY_TARGET`, or the staging API URL | the same, for production |
| `VITE_SENTRY_DSN` | your DSN | your DSN |
| `VITE_LOG_LEVEL` | `info` | `warn` |

## Images (GitHub Container Registry)

Publishing the GitHub release `v1.4.0` pushes `ghcr.io/<owner>/<repo>` with the tags `1.4.0`, `1.4`, `latest` and `sha-<commit>`. Run one anywhere:

```bash
docker run -p 8080:8080 -e VITE_ENABLE_MOCKS=false -e API_PROXY_TARGET=http://api.internal:3000 ghcr.io/<owner>/<repo>:1.4.0
```

- The workflow needs no secret: it uses the built-in `GITHUB_TOKEN`.
- New container packages can start out private. Check the visibility in the package settings, or run `docker login ghcr.io` before pulling.

## Releasing

1. Set `version` in `package.json` (e.g. `1.4.0`) and commit `chore(release): 1.4.0`. The app footer shows this version.
2. Publish a GitHub release tagged `v1.4.0`.
3. `docker-publish.yml` pushes the image, and `deploy.yml` deploys it to production once it is configured.

**Rollback:** redeploy the previous version's image or build. Published versions never change.

## Wiring up `deploy.yml`

1. Replace the placeholder step with your platform's deploy command.
2. Store the platform's credentials as environment secrets under Settings → Environments (`staging` and `production`).
3. Set the repository variable `DEPLOY_ENABLED` to `true` (Settings → Secrets and variables → Actions → Variables).
4. Optionally, add required reviewers to the `production` environment, so releases wait for an approval.

**Containers** (Kubernetes, ECS, Cloud Run, a VM with Docker, …): deploy the image from `docker-publish.yml`. Set the `VITE_*` variables on the service, plus `API_PROXY_TARGET` if you use the proxy.

**Static hosting:** upload `dist/`, then write the environment's `config.js` next to `index.html`:

```js
window.__APP_CONFIG__ = {
  "VITE_APP_ENV": "staging",
  "VITE_API_BASE_URL": "https://api.staging.example.com",
  "VITE_ENABLE_MOCKS": "false"
};
```

Then configure the host to:
- serve `index.html` and `config.js` with `Cache-Control: no-store`, and `/assets/*` with `Cache-Control: public, max-age=31536000, immutable`;
- answer unknown paths with `index.html` (client-side routing);
- send the security headers from `docker/nginx.conf.template`, including a Content-Security-Policy (docs/security.md). There is no entrypoint to compute the inline-script hash, so get it with `node scripts/csp-script-hashes.mjs dist/index.html`.
````

- [ ] **Step 10: Append these sections to `docs/contributing.md`**

```markdown
## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

| Job | Checks |
|---|---|
| Lint, typecheck, test, build | `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` (with thresholds) and `pnpm build`, plus a check that `src/api/generated` matches `pnpm codegen:api` |
| End-to-end (Playwright) | `pnpm test:e2e`, against the preview build with the mock API |
| Generators produce lint-clean code | Runs every `pnpm gen` generator, then lint, typecheck, test and build |
| Docker image | Builds the production image and runs `scripts/docker-smoke-test.sh` |

Every run keeps the coverage and Playwright reports as downloadable artifacts for 14 days. New pull requests start from the checklist in `.github/pull_request_template.md`.

## Branch protection (recommended)

In Settings → Rules → Rulesets, add a branch ruleset for `main`:
- **Pull requests:** require a pull request before merging, with at least one approval. Dismiss stale approvals when new commits are pushed, and require all conversations to be resolved.
- **Status checks:** require the four CI jobs above to pass (you can select them once CI has run once), and require branches to be up to date before merging.
- **History:** block force pushes and deletions, and require linear history.

In Settings → General → Pull Requests, allow only **squash merging**, with the pull-request title as the commit message. Write that title as a Conventional Commit, so `main` reads as one Conventional Commit per change.

## Dependency updates

Dependabot (`.github/dependabot.yml`) opens pull requests every week:
- one grouped pull request for npm minor and patch updates
- one per npm major update
- one for GitHub Actions
- one per Docker base image

Review the changelog before merging a major update; CI checks the rest.

- **Held back on purpose:** ESLint majors, and TypeScript minor and major releases. They wait until `eslint-plugin-react`, `eslint-plugin-jsx-a11y` and `typescript-eslint` support them. Remove the matching `ignore` entry when they do.
- If Dependabot reports that it doesn't support the pinned pnpm version, update by hand until it does: `pnpm outdated`, then `pnpm update --interactive --latest`.
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "ci: add github actions workflows, dependabot and pull request template" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Phase 10 gate

- [ ] Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, then `pnpm test:coverage` and `pnpm test:e2e`. Expected: all green, and the coverage thresholds are met.
- [ ] Run `docker build -t react-bedrock:local . && bash scripts/docker-smoke-test.sh react-bedrock:local`. Expected: `Smoke test passed`.
- [ ] Task 10.4 Step 5 was completed: all four README commands behave as promised.
- [ ] Post the **Phase 10 report**. Include:
  - the image size, the `src/core` and `src/lib` coverage figures, and the number of E2E tests
  - the runtime CSP (Deviation 17)
  - that the workflows have only been replayed locally, until the owner pushes the repository in Task 11.3

  Then **STOP** until the owner approves.

---

# Phase 11 — Documentation

Scope (spec §11, §12):
- `README.md`
- the remaining `docs/` files: `starting-a-new-project.md` and the finished `security.md`
- the project `CLAUDE.md`, written last (spec §0.7)
- a final review against the spec and the Definition of Done (spec §14)

Every other `docs/` file was written together with its module in Phases 1–10.

### Task 11.1: README

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: every script in `package.json` and every file in `docs/`.
- Produces: the entry point for humans. It gets a `License` section in Task 11.3, once the owner has chosen a licence.

- [ ] **Step 1: Write `README.md`**

````markdown
# React Bedrock

A neutral, ready-to-use starter for React + TypeScript single-page apps. Design tokens, a component library, data fetching, authentication, translations, error handling, logging, tests, code generators, Docker and CI are already wired up. Clone it and start on your features.

## What's inside

| Area | Choice |
|---|---|
| Language and build | TypeScript 6 (strict), React 19, Vite 8, pnpm 12 |
| UI | Tailwind CSS v4 with every design token in one file, shadcn/ui (Radix), lucide icons, Sonner toasts, Storybook |
| Data | TanStack Query, one Axios client with interceptors, Zod validation, Orval code generation, MSW mocks |
| State | TanStack Query for server data, Zustand for UI and session state, the URL for filters and pages |
| App | React Router (lazy routes, guards), cookie-session auth with permissions, i18next (English and Spanish), locale-aware formatting, error boundaries, a redacting logger with optional Sentry |
| Quality | ESLint (type-aware, with architecture rules), Prettier, Vitest + Testing Library, Playwright + axe, Husky + commitlint |
| Delivery | Docker (nginx, runtime configuration, one image for every environment), GitHub Actions, Dependabot |

A complete reference feature, "Items" in `src/features/example`, shows every pattern end to end: list, detail, create, edit and delete.

## Quick start

**Prerequisites:** Node.js 24 LTS (24.15 or newer) and pnpm 12 (`npm install -g pnpm@12`). Or only Docker; see below.

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173 and sign in with a demo account. The mock API is on by default, so no backend is needed.

| Email | Password | Permissions |
|---|---|---|
| admin@example.com | demo1234 | everything |
| viewer@example.com | demo1234 | read only |

**Configuration is optional.**
- Copy `.env.example` to `.env.local` and change what you need (docs/architecture.md → Configuration).
- To use a real backend during development, set `VITE_ENABLE_MOCKS=false` and `API_PROXY_TARGET=http://localhost:3000`.

## Run with Docker only

No Node.js, no pnpm, no `.env` file:

| Command | Result |
|---|---|
| `docker compose up` | Production build served by nginx at http://localhost:8080, mock API on |
| `VITE_API_BASE_URL=http://my-api:3000 VITE_ENABLE_MOCKS=false docker compose up` | The same image, pointed at a real API |
| `docker compose --profile dev up` | Vite dev server with hot reload at http://localhost:5173, source mounted from your machine |
| `docker compose down` | Stops everything |

Add `--build` after changing the code. [docs/docker.md](docs/docker.md) covers every runtime variable, connecting a backend, and troubleshooting.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Dev server with hot reload at http://localhost:5173 |
| `pnpm build` | Type-check, then build to `dist/` |
| `pnpm preview` | Serve the production build at http://localhost:4173 |
| `pnpm typecheck` | Type-check every project: app, tooling and E2E |
| `pnpm lint` | ESLint (zero warnings), then a Prettier check |
| `pnpm lint:fix` | Auto-fix ESLint and Prettier issues |
| `pnpm format` | Format everything with Prettier |
| `pnpm test` / `pnpm test:watch` | Unit, component and integration tests (Vitest) |
| `pnpm test:coverage` | Tests with a coverage report in `coverage/`, enforcing the thresholds |
| `pnpm test:e2e` / `pnpm test:e2e:ui` | Build, then run the Playwright end-to-end and accessibility tests |
| `pnpm storybook` / `pnpm storybook:build` | Component catalogue at http://localhost:6006, or a static build |
| `pnpm analyze` | Build and open a treemap of the bundle (`stats.html`) |
| `pnpm codegen:api` | Generate typed API hooks from `openapi/openapi.yaml` |
| `pnpm gen` | Code generators: feature, component, page, hook, store |
| `pnpm ui:add <name>` | Add a shadcn/ui component, adjusted to this repo's rules |
| `pnpm docker:up` / `pnpm docker:dev` / `pnpm docker:down` | Docker shortcuts: rebuild and run production, run the dev server, stop |

Git hooks install themselves on `pnpm install`: lint-staged on commit, and commitlint on the message.

## Project structure

```
src/
├── app/          composition root: providers, router, thin route pages, navigation
├── config/       validated env, constants, typed paths, permissions, feature flags
├── core/         infrastructure: api, auth, errors, i18n, logger, notify, storage
├── components/   ui/ (design system), feedback/ (async states), layout/ (app shell)
├── features/     business features, e.g. example/ (the reference "Items" feature)
├── hooks/  lib/  stores/  locales/  mocks/  styles/  test/  types/
docs/             developer documentation
e2e/              Playwright tests
docker/           container entrypoint and nginx template
openapi/          the API spec used by `pnpm codegen:api`
plop/             generator templates
scripts/          repository tooling (shadcn import, CSP hashes, Docker smoke test)
```

ESLint enforces which layer may import which; see [docs/architecture.md](docs/architecture.md).

## Documentation

| Topic | Read |
|---|---|
| Layers, folders and import rules | [architecture.md](docs/architecture.md) |
| Design tokens, rebranding, components, Storybook | [design-system.md](docs/design-system.md) |
| HTTP client, TanStack Query, query keys, `QueryState` | [data-fetching.md](docs/data-fetching.md) |
| Generating API clients with Orval | [api-codegen.md](docs/api-codegen.md) |
| Where state lives: Query, Zustand, URL or local | [state-management.md](docs/state-management.md) |
| Routes, guards and the paths helper | [routing.md](docs/routing.md) |
| Authentication and permissions | [auth.md](docs/auth.md) |
| Translations and formatting | [i18n.md](docs/i18n.md) |
| Forms and server errors | [forms.md](docs/forms.md) |
| Errors, logging and notifications | [error-handling-and-logging.md](docs/error-handling-and-logging.md) |
| What to test where; MSW; E2E | [testing.md](docs/testing.md) |
| Code generators | [generators.md](docs/generators.md) |
| Security decisions | [security.md](docs/security.md) |
| Docker | [docker.md](docs/docker.md) |
| CI/CD, images and environments | [deployment.md](docs/deployment.md) |
| Branching, commits and pull requests | [contributing.md](docs/contributing.md) |
| Creating a project from this template | [starting-a-new-project.md](docs/starting-a-new-project.md) |

## Starting a new project

Follow [docs/starting-a-new-project.md](docs/starting-a-new-project.md): name it, brand it, connect your API, and remove the example feature.

## Contributing

Branching, the commit convention and the pull-request checklist are in [docs/contributing.md](docs/contributing.md).
````

- [ ] **Step 2: Check the README against reality, then commit**

1. Confirm every script in the table exists in `package.json`, and every link opens an existing file. Task 11.3 Step 1 automates the script check.
2. On a fresh clone (`git clone . "$TEMP/bedrock-readme"` in Git Bash), follow the Quick start exactly. Sign in, then delete the clone.

```bash
git add README.md
git commit -m "docs: add readme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 11.2: The new-project guide and the finished security doc

**Files:**
- Create: `docs/starting-a-new-project.md`
- Modify: `docs/security.md`

**Interfaces:**
- Produces: a checklist that Task 11.3 Step 4 follows end to end in a throwaway clone, as the Definition of Done requires.

- [ ] **Step 1: Write `docs/starting-a-new-project.md`**

````markdown
# Starting a new project from this template

Work through this list from top to bottom. Each step ends with something you can check.

## 1. Create the repository

- On GitHub, click **Use this template** on the template repository. That gives you a fresh history; the template must be marked under Settings → General → Template repository.
- Or clone it without history:

  ```bash
  git clone --depth 1 <template-url> my-app
  cd my-app
  rm -rf .git docs/superpowers
  git init -b main
  ```

- `docs/superpowers/` holds the plan the template was built from. New projects don't need it.
- Before you change anything, check that everything works:

  ```bash
  pnpm install
  pnpm lint && pnpm typecheck && pnpm test
  ```

## 2. Name the app

1. In `package.json`, set `name`, and set `version` back to `0.1.0`.
2. Set `VITE_APP_NAME` in your `.env` files and in each environment's settings. That alone changes the tab title, the sidebar and the browser-storage prefix.
3. To change the built-in default name as well, replace every "React Bedrock" and "react-bedrock":

   ```bash
   git grep -n -i -e "react bedrock" -e "react-bedrock"
   ```

   - The matches include `src/config/env.ts`, `index.html` (the title and the theme script's fallback), `.env.example`, `docker-compose.yml`, the `Dockerfile` label, `openapi/openapi.yaml`, the workflows, tests and docs.
   - `src/stores/theme-bootstrap.test.ts` fails until `index.html` and `src/config/env.ts` agree.
4. Replace `public/favicon.svg`.

Check: `pnpm dev` shows your name in the tab and in the sidebar, and `pnpm test` passes.

## 3. Brand it

Edit only `src/styles/tokens.css` (docs/design-system.md → How to rebrand):
- `--primary` and `--primary-foreground`, in the light, dark and fallback blocks
- `--radius`
- the font

Keep text contrast at 4.5:1 or more, and `--ring` at 3:1 or more.

Check: `pnpm storybook` shows every component in the new look, in light and dark. `pnpm test:e2e` passes, and its axe checks catch contrast problems.

## 4. Languages and currency

- Set the defaults with `VITE_DEFAULT_LOCALE` and `VITE_DEFAULT_CURRENCY`.
- To add a language, follow docs/i18n.md → Adding a language. To remove one, reverse those steps; `pnpm typecheck` lists every leftover reference.

Check: the language switcher lists exactly your languages.

## 5. Connect your API

1. **Development:** in `.env.local`, set `API_PROXY_TARGET=http://localhost:<port>` (your backend) and `VITE_ENABLE_MOCKS=false`. Leave `VITE_API_BASE_URL=/api`, so calls stay same-origin.
2. **Error format:** the template expects `{ code, message, details? }`, with field errors in `details.fields`. If your backend's error body differs, adapt `errorBodySchema` and `getFieldErrors` in `src/core/api/errors.ts`; nothing else parses error bodies. Translate your backend's error codes under `errors:codes.<CODE>`.
3. **Auth:** the template calls `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` and `POST /auth/refresh` (docs/auth.md). Adjust the paths in `src/core/auth/cookie-strategy.ts`. For a different scheme, write another `AuthStrategy` and switch the one export in `src/core/auth/strategy.ts`.
4. **Typed client:** replace `openapi/openapi.yaml` with your spec, or point `input.target` in `orval.config.ts` at its URL. Then run `pnpm codegen:api`.
5. **Mocks:** tests and E2E run against `src/mocks`. As you build features, replace the demo handlers with ones shaped like your API.

Check: with mocks off, you can sign in against your backend.

## 6. Remove the example feature

"Items" is a reference. Generate your first feature before deleting it, so you keep a working example of your own:

```bash
pnpm gen feature <plural> <singular> y
```

Then remove the example:

1. **Delete these files and folders:**
   - `src/features/example/`
   - `src/app/routes/items/`
   - `src/locales/en/items.json` and `src/locales/es/items.json`
   - `src/mocks/handlers/items.ts`, `src/mocks/handlers/items.test.ts` and `src/mocks/fixtures/items.ts`
   - `e2e/items.spec.ts`
2. **Remove the registrations:**
   - `src/core/i18n/resources.ts`: the `items` imports and entries
   - `src/mocks/handlers.ts`: `itemHandlers`
   - `src/mocks/db.ts`: `items` and `createItemFixtures`
   - `src/config/paths.ts`: `items`
   - `src/config/features.ts`: `itemsExport`
   - `src/app/router.tsx`: the four items routes
   - `src/app/navigation.ts`: the Items entry and its `PackageIcon` import
   - `src/app/routes/dashboard.tsx`: the "Browse items" link
   - `openapi/openapi.yaml`: the `/items` paths and item schemas. Then run `pnpm codegen:api`.
3. **Permissions:** replace `items.*` in `src/config/permissions.ts` with your feature's permissions. Give the demo users in `src/mocks/fixtures/users.ts` the new ones.
4. **Let the tools list the rest:**

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   git grep -n -e "'items\." -e "features/example" -e "item-0" -- src e2e
   ```

   `pnpm typecheck` finds every reference to a deleted path, permission, translation key or module. The `git grep` finds text references the compiler can't see. Fix each hit:
   - The core tests use `items.*` as sample permissions; switch them to one of yours.
   - `src/app/router.test.tsx` clicks through Items; point it at your feature.
   - `src/api/generated-client.test.tsx` uses the generated items hooks; point it at one of your generated hooks.
   - Update the `e2e/*.spec.ts` files that visit `/items`.
   - Remove `nav.items`, `dashboard.goToItems` and `errors:codes.ITEM_LOCKED` from every locale.

Check: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e` all pass.

## 7. Error monitoring (optional)

Set `VITE_SENTRY_DSN` per environment to turn on the Sentry transport (docs/error-handling-and-logging.md).

## 8. The repository, CI and deployment

1. Push to GitHub, and check that the **CI** workflow passes.
2. Set up branch protection (docs/contributing.md).
3. Fill in the deploy step in `.github/workflows/deploy.yml`, then set the repository variable `DEPLOY_ENABLED=true` (docs/deployment.md).
4. Optional:
   - Images are published on every release by `docker-publish.yml`, which works with GitHub Container Registry as is.
   - To publish Storybook on GitHub Pages, set `STORYBOOK_PAGES=true`.

## 9. Documentation

- Update `README.md` (name, description, links), and `CLAUDE.md` wherever your conventions differ.
- Remove or rewrite the passages in `docs/` that describe the example feature.

## 10. Final check

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
docker compose up --build
```

Open http://localhost:8080, sign in, and click through your first feature.
````

- [ ] **Step 2: Finish `docs/security.md`**

1. Insert this directly below the `# Security` heading:

   ```markdown
   Decisions at a glance:

   | Topic | Decision | Details |
   |---|---|---|
   | Auth token storage | An httpOnly session cookie set by the server. No tokens in JavaScript or browser storage | [Browser storage](#browser-storage), docs/auth.md |
   | CSRF | `SameSite=Lax` cookie, plus a custom header on every request | [Authentication, CSRF and redirects](#authentication-csrf-and-redirects) |
   | XSS | React escaping, no raw HTML, and a strict script CSP in the Docker image | [XSS](#xss), [HTTP headers](#http-headers-and-content-security-policy-docker-image) |
   | Secrets | None in the frontend: `VITE_*` values are public | [Secrets and configuration](#secrets-and-configuration) |
   | Logging | User ids only, with automatic redaction | [Logging and privacy](#logging-and-privacy) |
   ```

2. Append these sections:

   ```markdown
   ## XSS

   - React escapes every value it renders. Never use `dangerouslySetInnerHTML` with data you don't control. If you must render user-supplied HTML, sanitise it first; a sanitiser such as DOMPurify is a new dependency, so flag it.
   - i18next runs with `escapeValue: false` because React already escapes. Translations are rendered as text, never as HTML.
   - Check the scheme before building an `href` or `src` from user input, because `javascript:` URLs execute. Internal links use `paths.*`.
   - The Docker image's CSP allows only this origin's scripts plus the hashed theme script, so injected `<script>` tags and inline event handlers don't run.

   ## Secrets and configuration

   - The frontend holds **no secrets**. Every `VITE_*` value, whether built in or written to `config.js` at container start, is downloaded by every visitor.
   - API keys for third-party services belong on the backend: the frontend calls your API, and your API calls the service.
   - `.env` and `.env.*` files are git-ignored (except `.env.example`) and excluded from the Docker build context.
   - CI and deployment credentials live in GitHub, as repository or environment secrets. Never in the repository.

   ## Dependencies and supply chain

   - `pnpm-lock.yaml` is committed, and CI and Docker install with `--frozen-lockfile`, so builds use exactly the reviewed versions.
   - Dependency install scripts run only when allowed in `pnpm-workspace.yaml` (`allowBuilds`). pnpm fails the install on any new one, so each is reviewed before it runs.
   - pnpm waits a day before installing a newly published version (`minimumReleaseAge`). This blocks most attacks that rely on a compromised release.
   - Dependabot proposes updates weekly. Read the changelog before merging a major update.
   - Add dependencies deliberately: prefer the existing wrappers, and check a package's maintenance and its size (`pnpm analyze`) first.
   ```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: add new-project guide and complete the security notes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 11.3: Final review against the spec and the Definition of Done (spec §14)

**Files:**
- Create: `LICENSE` (only with the owner's answer in Step 5)
- Modify: whatever the review finds wrong (most likely `docs/starting-a-new-project.md`), and `README.md` (the License section)

**Interfaces:**
- Consumes: everything.
- Produces: a verified template, with every §14 item checked and its evidence recorded for the final report.

- [ ] **Step 1: Documentation inventory and a command check**

1. Check that `docs/` holds all 17 files spec §11.2 lists:
   `architecture`, `design-system`, `data-fetching`, `api-codegen`, `state-management`, `routing`, `auth`, `i18n`, `forms`, `error-handling-and-logging`, `testing`, `generators`, `security`, `docker`, `deployment`, `contributing`, `starting-a-new-project`.
2. Check that every `pnpm` command the docs mention exists. Run in Git Bash:

   ```bash
   node --input-type=module <<'EOF'
   import { readdirSync, readFileSync } from 'node:fs';

   const scripts = new Set(Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts));
   const builtins = new Set(['add', 'dlx', 'exec', 'install', 'outdated', 'remove', 'update']);
   const files = [
     'README.md',
     'CLAUDE.md',
     ...readdirSync('docs')
       .filter((name) => name.endsWith('.md'))
       .map((name) => `docs/${name}`),
   ];
   const unknown = [];
   for (const file of files) {
     let text;
     try {
       text = readFileSync(file, 'utf8');
     } catch {
       continue; // CLAUDE.md is written in Task 11.4
     }
     for (const [, name] of text.matchAll(/(?:^\s*|[`;&|(]\s*)pnpm ([a-z][\w:-]*)/gm)) {
       if (!scripts.has(name) && !builtins.has(name)) unknown.push(`${file}: pnpm ${name}`);
     }
   }
   if (unknown.length > 0) {
     console.error(`Commands in the docs that don't exist:\n${unknown.join('\n')}`);
     process.exit(1);
   }
   console.log(`Every pnpm command in ${files.length} files exists.`);
   EOF
   ```

   Expected: `Every pnpm command in … files exists.`
3. Read each doc once against the code as it now stands: file paths, exported names, defaults, and commands. Fix what drifted during execution.

- [ ] **Step 2: Walk the spec section by section**

For each row, confirm the "Check" and note the evidence (a test name, command output or screenshot) for the report.

| Spec | Delivered in | Check |
|---|---|---|
| §1 Tech stack | `package.json` | Every library in §1 is installed; React Router v8 and MSW 3 per the owner decisions |
| §2 Principles 1–8 | 2.3, 1.3, 5.5, 3.x, 1.5 / 8.x, 3.2 / 4.3, 10.1 | Token guard test; wrapper and layer lint rules; `QueryState` everywhere; Zod at every boundary; dev details vs prod messages; axe |
| §3 Folder structure | whole repo | The tree matches §3; the additions are listed in Deviation 5 |
| §4 Configuration | 1.5, 10.3 | `env.test.ts`; the config error screen; runtime `config.js` in Docker |
| §5.1–5.2 Tokens, theme | 2.3, 2.5 | Rebrand test (Step 3); no theme flash (`e2e/theme.spec.ts`) |
| §5.3 Primitives | 2.4, 2.6, 3.5, 6.5 | Storybook has a story for every primitive, plus DataTable and DatePicker |
| §5.4 Async states | 3.1–3.4 | Feedback tests and stories |
| §5.5 Layout | 7.6 | Layout tests; mobile sheet; skip link |
| §6.1–6.5 Data layer | 5.1–5.5, 2.1, 9.1 | HTTP, query client, store and storage tests; generated-client test |
| §7.1–7.9 Infrastructure | 4.x, 6.x, 7.x | The router, auth, logger, notify, i18n, forms and hooks tests |
| §8 Reference feature | 8.1–8.5 | Feature tests and `e2e/items.spec.ts` |
| §9 Generators | 9.2 | The CI generators job |
| §10.1–10.3 Quality, testing, CI | 1.2–1.4, 10.1, 10.2, 10.5 | Hooks fire; coverage thresholds; the workflows run (Task 11.4) |
| §10.4 Docker | 10.3, 10.4 | Smoke test; the four README commands |
| §10.5 Performance | 7.7, 10.2 | Lazy route chunks in the build output; `pnpm analyze`; the image guidance in docs/architecture.md |
| §11 Documentation | every task, 11.1–11.4 | Step 1 |

- [ ] **Step 3: Check the Definition of Done**

1. **Lint, typecheck, tests, E2E and build pass.** Locally:

   ```bash
   pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
   ```

   In CI, after the push in Task 11.4.
2. **Tokens restyle everything.**
   1. Run `pnpm dev`. In `src/styles/tokens.css` only, set `--primary: oklch(0.55 0.2 260);` in `:root` and in `.dark`, and set `--radius: 0rem;`.
   2. Check sign-in, the dashboard, the Items list, detail and form, a dialog and a toast, in light and dark.
   3. Revert with `git checkout src/styles/tokens.css`.
3. **Every async view uses the shared states.**
   1. Run `git grep -n -e "isPending" -e "isLoading" -e "isError" -- src/features src/app`. Every hit must feed `QueryState`, `DataTable` or a button's busy state.
   2. In DevTools, throttle to "Slow 4G" and open each page to see its skeleton. Visit `/items?q=error` and `/items/nope` for the error and not-found states.
4. **No direct imports of wrapped libraries.** `pnpm lint` passes. Then run:

   ```bash
   git grep -n -E "from '(axios|sonner|js-cookie|date-fns[^']*|@sentry/[a-z-]+)'" -- src
   ```

   Hits may appear only in `src/core/api`, `src/core/notify`, `src/core/storage`, `src/core/logger` and `src/lib/format.ts`, including the tests there.
5. **The app runs fully on the mock API:** the E2E suite, and `docker compose up`.
6. **`pnpm gen feature` is lint-clean:** Task 9.2 Step 6, and the CI generators job.
7. **Generated hooks use the interceptors:** `pnpm exec vitest run src/api`.
8. **All UI text is translated.**
   - The resource tests and `react/jsx-no-literals` pass.
   - Attribute strings aren't covered by that rule, so this must print nothing:

     ```bash
     git grep -n -E "(aria-label|placeholder|title|alt)=\"[A-Za-z]" -- "src/**/*.tsx" ":!src/**/*.stories.tsx" ":!src/**/*.test.tsx"
     ```

   - Click through every page in Español.
9. **Nothing company-specific.**
   - Ask the owner for their organisation, product and domain names (don't write them into the repo), and search for each: `git grep -n -i -e "<term>"`. Expected: no matches.
   - `git log --format='%an <%ae>' | sort -u` must show only the identity confirmed in Task 0.1.
10. **Docker only, no `.env`, no backend.**
    1. Move any `.env` away, then run `docker compose down --rmi local --volumes && docker builder prune -f`.
    2. Run `docker compose up`, without `--build`: Compose must build by itself, because the image is gone.
    3. The app works at http://localhost:8080.

    If a machine with only Docker installed is available (a colleague's, or a VM), repeat it there.
11. **The same image works against another API** by changing only environment variables: Task 10.4 Step 5, and the smoke test.
12. **Keyboard and axe pass on key pages.**
    - `e2e/a11y.spec.ts` and `e2e/navigation.spec.ts` pass.
    - Manual pass with the keyboard only: sign in, then the dashboard, then the Items list (search, filter, sort, paging, row actions), then a dialog. Focus must stay inside the dialog; Escape must close it and return focus.
13. **README, docs and CLAUDE.md are complete:** Step 1 here, and Task 11.4.
14. **The new-project guide was followed end to end:** Step 4.

- [ ] **Step 4: Follow `docs/starting-a-new-project.md` end to end in a throwaway clone**

```bash
git clone . "${TEMP:-/tmp}/bedrock-trial"
cd "${TEMP:-/tmp}/bedrock-trial"
```

1. Work through every section, using example values: name the app "Trial App", pick a new `--primary`, generate `pnpm gen feature projects project y`, then remove the example feature.
2. Skip the GitHub parts of section 8, and note that you did.
3. Stop at every place where the guide is wrong, unclear or incomplete. Fix the guide **in the real repository**, then carry on in the clone.
4. The guide passes when section 10's final check is green in the clone.
5. Clean up:

   ```bash
   cd - && rm -rf "${TEMP:-/tmp}/bedrock-trial"
   ```

- [ ] **Step 5: Ask the owner about the licence**

Ask which licence to publish under:
- **MIT:** the usual choice for starter templates.
- **Apache-2.0:** permissive, and adds a patent grant.
- **None:** all rights reserved. Others may read the code but not reuse it.

For MIT or Apache-2.0:
1. Add `LICENSE` with the standard text and the copyright holder the owner names. Never guess a name.
2. Append to `README.md`: `## License` followed by `MIT — see [LICENSE](LICENSE).` (or the Apache-2.0 equivalent).

For no licence, add nothing, and say so in the final report.

- [ ] **Step 6: Commit the fixes**

```bash
git add -A
git commit -m "docs: correct the guides after the final review" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

If a licence was added, commit it separately first with `chore: add license`.

### Task 11.4: The project `CLAUDE.md` (written last), publishing and the final report

**Files:**
- Create: `CLAUDE.md`
- Modify: `docs/superpowers/plans/2026-09-30-react-bedrock-template.md` (the final version of this plan)

**Interfaces:**
- Produces: the guide for AI agents working in projects built from this template (spec §11.3), and the final report.

- [ ] **Step 1: Write `CLAUDE.md`**

This is written after everything else, per spec §0.7, so that it describes the finished template.

````markdown
# CLAUDE.md

Guidance for AI coding agents working in this repository. Humans: start with README.md.

## Stack

A React 19 + TypeScript 6 (strict) single-page app, built with Vite 8 and pnpm 12:
- **Routing:** React Router v8, data mode, lazy routes.
- **Data:** TanStack Query v5 for all server state, through one Axios client. Zustand for UI and session state only.
- **Forms and validation:** React Hook Form + Zod 4.
- **UI:** Tailwind CSS v4 + shadcn/ui (Radix), styled only through design tokens.
- **Translations:** i18next (en, es).
- **Tooling:** MSW mocks, Vitest + Testing Library, Playwright + axe, Storybook 10, Orval, Plop, Docker + nginx.

## Map

| Path | What lives there |
|---|---|
| `src/app/` | Providers, the router (`router.tsx`), thin route pages (`routes/`), the sidebar config (`navigation.ts`) |
| `src/config/` | `env.ts` (the only reader of the environment), constants, `paths.ts` (every URL), permissions, feature flags |
| `src/core/` | api (`http`, `AppError`, query client), auth, errors, i18n, logger, notify, storage. Never imports features, layout or app |
| `src/components/` | `ui/` primitives, `feedback/` async states, `layout/` app shell |
| `src/features/<name>/` | Business code. Other code imports only the feature's `index.ts` |
| `src/hooks/`, `src/lib/`, `src/stores/` | Shared hooks, pure utilities (`cn`, formatters), Zustand stores |
| `src/locales/<lang>/<ns>.json` | Translations. `en` is the source of truth |
| `src/mocks/` | MSW handlers and fixtures, used by dev, tests and E2E |
| `src/styles/tokens.css` | Every colour, radius, font, shadow, z-index and duration |
| `docs/` | How each part works. Read the matching doc before changing a module |

## Rules

ESLint or a test enforces most of these.

1. **Design values** come from `src/styles/tokens.css`, through token utilities (`bg-primary`, `z-modal`). No hex colours, palette classes, arbitrary pixel values or raw z-index numbers.
2. **Use the wrappers:**
   - `http` from `@/core/api`
   - `notify` and `useConfirm` from `@/core/notify`
   - `logger` from `@/core/logger`
   - `localStore`, `sessionStore` and `cookies` from `@/core/storage`
   - the formatters from `@/lib/format`
   - `env` from `@/config/env`

   Never import axios, sonner, date-fns, js-cookie or `@sentry/*`, and never use `console`, `localStorage` or `import.meta.env` directly.
3. **State:** server data lives in TanStack Query; never copy it into a Zustand store. Filters, search, sort and page go in the URL (`useUrlState`, `usePagination`).
4. **Async views** handle loading, empty, error and success, using `QueryState` or `AsyncBoundary` and the skeleton presets.
5. **Imports:** import a feature only through `@/features/<name>`, and a core module only through `@/core/<module>`.
6. **Validation:** use Zod at the boundaries: API responses, forms and env.
7. **Text:** no user-facing string literals in JSX or in attributes such as `aria-label`. Use `t('…')`, with the key in every locale.
8. **Links and permissions:** links use `paths.*`. Permissions are checked with `<Can>` or `RequirePermission`. These checks only decide what the UI shows; the API is the authority.
9. **Accessibility:** labelled controls, full keyboard support, and exactly one `h1` per page (`PageHeader`).

## Before you finish a task

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Also run `pnpm build` after dependency or config changes, and `pnpm test:e2e` after changing a user flow. `pnpm lint:fix` repairs import order and formatting.

## Common tasks

| Task | How |
|---|---|
| New feature | `pnpm gen feature <plural> <singular> y`, then add permissions and the real API calls (docs/generators.md) |
| New page, component, hook or store | `pnpm gen page`, `pnpm gen component`, `pnpm gen hook` or `pnpm gen store` |
| New shadcn primitive | `pnpm ui:add <name>` |
| The API changed | Update `openapi/openapi.yaml` (or the Orval input), then run `pnpm codegen:api` |
| New translation | Add the key to `src/locales/en/<ns>.json` and to every other locale |
| New env variable | The schema in `src/config/env.ts`, `.env.example`, `CONFIG_KEYS` in `docker/docker-entrypoint.sh` and both services in `docker-compose.yml`. A guard test lists what's missing |

## Conventions

- **Tests** sit next to the code they test (`*.test.ts(x)`). Import render helpers from `@/test/render`. Mock HTTP with MSW: `server.use(...)`, with URLs built by `apiUrl()`.
- **Commits** follow Conventional Commits (commitlint enforces this).
- **Docs:** when you change a module or a convention, update its file in `docs/`.
````

- [ ] **Step 2: Store the final plan in the repository**

Copy this plan over `docs/superpowers/plans/2026-09-30-react-bedrock-template.md`, including every correction recorded during execution, so the published plan matches what was built.

- [ ] **Step 3: Run the final gate**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
docker build -t react-bedrock:local . && bash scripts/docker-smoke-test.sh react-bedrock:local
```

Then run the command check from Task 11.3 Step 1 again; it now covers `CLAUDE.md` too.
Expected: all green.

```bash
git add -A
git commit -m "docs: add CLAUDE.md for agents working in projects built from the template" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4 (owner approval required): Publish the repository and watch CI**

Pushing publishes the code, so get an explicit yes first, and confirm the repository name and its visibility (public or private).

1. With the owner's go-ahead, create the repository and push. Either create it on github.com and run:

   ```bash
   git remote add origin <repository-url>
   git push -u origin main
   ```

   Or, if the owner prefers the GitHub CLI:

   ```bash
   gh repo create <name> --private --source . --push
   ```

   Use `--public` instead of `--private` if that is what the owner chose.
2. Watch the first run with `gh run watch`, or in the Actions tab. All four CI jobs must pass. `deploy.yml` stays skipped until `DEPLOY_ENABLED` is set, and `storybook.yml` builds.

   If a job fails, fix it locally, run the gate, and push the fix. Never skip a hook or a check.
3. Owner settings:
   - the branch ruleset (docs/contributing.md)
   - Settings → General → **Template repository**, so others can click "Use this template"
   - optionally, the GitHub Pages source for Storybook

- [ ] **Step 5: Post the Phase 11 report and the final summary**

Use the Phase Report template, and add:
- **The Definition of Done:** every §14 item, with its evidence from Task 11.3 Step 3, and the CI run URL.
- **All deviations:** Deviations 1–17 from this plan, plus every difference recorded in earlier phase reports.
- **Follow-ups for the owner:**
  - **Node.js 26** becomes LTS on 2026-10-28: move `.nvmrc`, `engines`, `@types/node` and the Docker base images to it.
  - **ESLint 10 and TypeScript 6.1+:** lift the version pins (Deviation 12) once the plugins support them.
  - **MSW:** if Task 5.2 fell back to MSW 2, return to MSW 3 when the blocking defect is fixed.
  - Fill in the deploy step, and set `DEPLOY_ENABLED` (docs/deployment.md).

Then **STOP**: the template is complete.

---

## Execution handoff

Once the owner approves this plan, execute it phase by phase and stop at every phase gate. There are two ways to do it:

1. **Subagent-driven (recommended).** A fresh subagent executes each task, and the result is reviewed before the next task starts (superpowers:subagent-driven-development). The tasks here are self-contained, and they list their `Interfaces`, so this works well and keeps each context small.
2. **Inline.** Execute the tasks in one session, with checkpoints at the phase gates (superpowers:executing-plans).

Owner actions come first: Task 0.1, Steps 1–3 (Node.js 24, pnpm 12, and confirming the git identity).

---

## Execution record

The plan above is the text the template was built from, kept as it was written. This record lists where the build differed from it: decisions taken during the build, deviations beyond Deviations 1-17, corrections to the plan's own text, the limitations that shipped, and the follow-ups left to the owner.

### How it was executed

- Phases 0 and 1 were run directly by the controlling session. From Phase 2 on, every phase followed the same loop, and each decision was written to a ledger as a ruling:
  1. A read-only pre-flight scan replayed the phase's tasks in a scratch copy with the real tools and graded what would block, fail or be wrong; its verified fixes went into the task briefs.
  2. One fresh implementer per task, then a task review (spec compliance, then quality); an Important finding got a fix round and a scoped re-review.
  3. The phase gate, a whole-phase review, one fix wave and a scoped re-review of that wave.
- Implementers and task reviewers ran on Sonnet; whole-phase reviews (and the task reviews of the image and the workflows) ran on Opus.
- The owner got a report at the Phase 2 gate. From Phase 3 on they had the phases run without stopping, except for the pauses they asked for (after Phase 7, at the start of Phase 9 and after Phase 10). Phase 11 added two pre-flight scans (one checked every claim in the README, guide, security and CLAUDE.md texts; one triaged every deferred minor), a fix wave of four dispatches, two read-only verification passes, and then the same whole-phase review, fix wave and scoped re-review as the other phases.
- Gates: every phase ran `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` (plus `pnpm storybook:build` when stories changed) and the plan's manual browser steps.
  Later gates added the `pnpm codegen:api` drift check and `pnpm audit --audit-level high` (Phase 9), then `pnpm test:coverage`, the Playwright E2E suite, the image build and `scripts/docker-smoke-test.sh` (Phase 10).
- Last full local run before this record: 101 test files / 693 tests, coverage thresholds met, 25 E2E tests on Edge, Storybook build, entry chunk 213.25 kB. The image was 31.4 MB (UID 101, port 8080) at the Phase 10 gate.
- Every ruling (207, each with its reason and its cost if wrong) is listed in [2026-09-30-react-bedrock-template-rulings.md](2026-09-30-react-bedrock-template-rulings.md).

### Owner decisions taken during the build

- **Commit trailer:** `Co-Authored-By: Claude Sonnet 5.5`, as its own paragraph, instead of the Opus trailer in the Global Constraints.
- **Git identity:** a repository-local identity with a GitHub no-reply address, so no personal or work e-mail address appears in the history.
- **No stop at phase gates (2026-10-01):** after the Phase 2 report the owner had the remaining phases run straight through, overriding "STOP and post the Phase Report"; the public push still needed an explicit yes. The owner paused the work three times: after Phase 7, at the start of Phase 9 and after Phase 10.
- **Differences reported at the Phase 2 gate,** after which the owner approved Phase 3: the protocol-based `Secure` cookie flag (Deviation 20), the Sheet opening in 300 ms (Deviation 23), and primitives keeping shadcn's size names and data-attribute variants (Deviation 26).
- **E2E locally through the installed Microsoft Edge**, through a git-excluded local Playwright config, with no Chromium download. The committed `playwright.config.ts` keeps the Chromium project that CI uses, and Chromium ran only there: the GitHub CI runs the whole E2E suite on it.
- **Docker:** the owner approved pulling exactly the two base images. The build created and removed only `react-bedrock*` objects and never pruned; Docker Desktop itself is the owner's to manage (they restarted it by hand when it stopped). Because of the no-prune rule, the plan's `docker builder prune -f` (Task 11.3) was skipped.
- **Licence:** MIT, with the GitHub account name that will own the repository as copyright holder.
- **Final Docker checks skipped:** the Docker engine was stopped during the final verification pass, and the owner asked to skip the Docker-only checks rather than start it. They had passed earlier: the image build and smoke test at the Phase 10 gate and again after the entrypoint fix of Phase 11, and compose-from-nothing plus the README's Docker commands in the Phase 11 pre-flight. The local image was not rebuilt after the pager commits of Phase 11, but the GitHub CI built that code into the image and passed the smoke test.
- **Neutrality scan:** no organisation names were added to the scan beyond those the build already knew.
- **Publishing target:** the repository existed as a private GitHub repository during the build, where the owner pushed and the CI ran. At the end the owner kept it private for now and chose to push the final commits themselves; making it public, and the template-repository setting, are left to the owner.
- **Specification published:** the owner asked for `TEMPLATE_BUILD_SPEC.md` to be added next to the plan, as `docs/superpowers/TEMPLATE_BUILD_SPEC.md`, so the `spec §N` references in code comments and the plan's header path `../TEMPLATE_BUILD_SPEC.md` resolve inside the repository.

### Deviations 18 and up

The numbering continues the Deviations list above. Each entry says what the plan or the spec said, what was built, and why.

18. **Library behaviour found while building.** The toolchain table was right about the versions but missed these behaviours:
    - React 19.3 holds a Suspense reveal for about 300 ms after the fallback mounts (Deviation 28).
    - MSW 3.0.0 does forward a mocked `Set-Cookie` into jsdom, so the MSW addendum above is wrong; `src/test/setup.ts` clears cookies after each test.
    - Vitest 5 blanks CSS module ids, `?raw` included, unless `test.css.include` lists them.
    - Testing Library's helper is `waitForElementToBeRemoved`; the snippets of Phases 3, 5 and 7 misspell it.
    - Sentry 11's `dataCollection` does not cover URL queries, fragments or console breadcrumbs (Deviation 34).
    - Zod 4 probes for `eval` (`Function('')`) when it builds its first object schema, which a CSP without `unsafe-eval` reports (Deviation 74).
    - TanStack Table v9 sorts a numeric column descending on the first click.
    - Axios with `allowAbsoluteUrls: false` rebases an absolute URL onto `baseURL` instead of rejecting it.
    - In Vite 8.3, Rolldown's `advancedChunks` is deprecated in favour of `output.codeSplitting.groups`.
    - The shadcn CLI cannot answer its overwrite question without a terminal, and plop cannot bypass a conditional prompt.
    - `pnpm add` resolved Orval 8.40.0 (the table says 8.38).
19. **Files added beyond Deviation 5:** `docs/hooks.md` (Deviation 58); `src/app/routes/page-boundary.tsx` (Deviation 55); `src/core/logger/transports/sentry-sdk.ts` and `strip-url.ts` (Deviation 34); `src/lib/summarise-cause.ts`, `safe-string.ts`, `focus.ts` and `format-locale.ts`; `src/features/example/hooks/use-row-focus.ts` (Deviation 70); `src/test/plop-anchors.guard.test.ts`, `src/test/e2e-fixtures.guard.test.ts` (the E2E accounts match the mock users) and `src/test/hostile-values.ts`; stories for Calendar, ForbiddenState, NotFoundState and AuthLayout; `LICENSE`. The plop template `locale.en.json.hbs` became `locale.json.hbs` (used for every locale), with `locale.es.json.hbs` kept as an optional per-language override.

#### Phase 2: tokens, primitives, theme

20. **The `Secure` cookie flag follows the protocol** (Task 2.1). Spec §6.5: `Secure` in production. Built: `Secure` whenever the page is served over https (the plan's code). Why: in browsers that refuse `Secure` cookies over plain http, a production build served that way (such as the Docker demo on localhost:8080) could not set the cookie at all; https deployments still get it.
21. **Tooltip provides its own `TooltipProvider`** (Phase 2 review). Plan: shadcn's Tooltip, which throws without a provider, and no provider anywhere. Built: the primitive wraps itself in one (a hand fix that `pnpm ui:add tooltip --overwrite` discards, documented). Why: a provider in `AppProviders` would have been dropped by the later tasks that replace `providers.tsx`.
22. **Persisted preferences are validated when read back** (Phase 2 review, Task 5.5). Plan: the stores trust what they read back. Built: a persist `merge` guard resets an unknown theme mode to `system` and keeps only a valid `sidebarCollapsed`. Why: a stale or hand-edited value made `ThemeToggle` throw on render.
23. **Overlay durations come from the duration tokens** (Phase 2 review). Plan: shadcn's raw `duration-200/300/500`. Built: Dialog and AlertDialog use `duration-normal` and Sheet `duration-slow`, so the Sheet opens in 300 ms instead of 500 ms; `ui-add.mjs` rewrites them and the token guard refuses a raw `duration-<n>`. Why: every duration is a token (Principle 1); no new token was added.
24. **Invalid controls keep a full-strength focus ring** (Phase 2 review). Plan: shadcn's `aria-invalid:ring-destructive/20` (`/40` in dark), which beat the focus ring. Built: `aria-invalid:focus-visible:ring-destructive` in six primitives and in `ui-add.mjs`. Why: a focused invalid field showed only a faint ring.
25. **Tailwind does not scan `docs/` and `scripts/`** (Phase 2 review). Built: `@source not` lines in `globals.css`. Why: the scan of Markdown generated stale utility rules (built CSS 66.8 kB to 56.7 kB).
26. **Sizes and variants follow shadcn outside Button, Badge and Tabs** (Task 2.4). Spec §5.3: `cva` variants and `sm | md | lg` sizes. Built: Button, Badge and Tabs use `cva`; Avatar, Switch, SelectTrigger and AlertDialogContent keep shadcn's `default` size and data-attribute variants (documented in `docs/design-system.md`). Why: put to the owner in the Phase 2 report and left as shadcn ships them.
27. **Every visual prop of a primitive has a story** (Task 2.6). Plan: stories that left some variants out. Built: extra stories for Avatar sizes and groups, Switch sizes, the Tabs variants and vertical orientation, the small AlertDialog and a few more. Why: spec §5.3 asks for every variant in Storybook.

#### Phase 3: feedback states and DataTable

28. **Suspense fallbacks wait 350 ms** (Phase 3 review). Plan: `AsyncBoundary` shows `PageLoader` (200 ms delay) as the Suspense fallback. Built: `<Delayed delayMs={SUSPENSE_FALLBACK_DELAY_MS}>` (350 ms, a new constant) around `<PageLoader delayMs={0} />`; `loading={null}` renders nothing. Why: React holds the reveal about 300 ms, so the 200 ms loader still flashed (spec §5.4: loading states must not flash on fast responses). `QueryState` keeps 200 ms.
29. **`ErrorBoundary` auto-resets only an error already on screen** (Task 3.4). Plan: reset whenever `resetKeys` change while an error is caught. Built: `componentDidUpdate` also requires the previous state to hold the error. Why: a key change in the render that threw reset the boundary at once, fired `onReset` and reported one failure twice.
30. **DataTable's pager is a labelled `nav` with safe buttons** (Task 3.5). Plan: a bare `div`, buttons without `type`, page sizes only from `pageSizeOptions`. Built: `<nav aria-label>`, `type="button"` on all five buttons, and the options are the sorted union of `pageSizeOptions` and the current `pageSize`. Why: buttons inside a form submitted it, and a URL-driven `?pageSize=25` left the select blank.
31. **`ErrorState`'s retry button has `type="button"`; the `Button` primitive still has no default `type`** (Phase 3 review). Plan: no `type` on the retry button. Why: a primitive-wide default would change every consumer, so each button inside a form sets its own type.
32. **`describeError` keeps the message on Firefox and Safari stacks** (Phase 3 review). Plan: `error.stack` alone when there is one. Why: those stacks lack the "Name: message" line that V8 prepends.

#### Phase 4: errors, logging, notifications

33. **The logger de-duplicates by severity** (Task 4.1). Plan: an error object is reported once. Built: it is reported again only at a higher severity. Why: a cache's `warn` would otherwise swallow the boundary's later `error`, which is what reaches Sentry.
34. **Sentry gets no URL queries, fragments or console breadcrumbs, and a smaller SDK chunk** (Phase 4 review). Plan: Sentry 11's `dataCollection` flags only. Built: `beforeSend`/`beforeBreadcrumb` strip query and fragment from every URL and drop console breadcrumbs; the transport loads a local `sentry-sdk.ts` that re-exports only the five functions it uses (446 kB to 88 kB raw). Why: `docs/security.md` promised the privacy, and the chunk is fetched at start-up whenever a DSN is set.
35. **`useConfirm` returns focus** (Phase 4 review, Task 8.4). Plan: no focus handling. Built: the dialog refocuses the element that was active when `confirm()` was called, unless focus has already moved to another element outside it; a pending confirm resolves `false` when the provider unmounts; `destructive` uses `AlertDialogAction`'s `variant` prop. Why: focus fell to `body` (WCAG 2.4.3), and the plan's `className` variant lost to `bg-primary`.
36. **The logger never throws** (Phase 4 review). Plan: no guard, and an unbounded queue. Built: a throwing context getter or a failed redaction is caught, and the Sentry queue is capped at 100 with a `try/catch` per send. Why: a logging failure must not break error handling.

#### Phase 5: HTTP, query client, stores

37. **An error's `cause` is logged and shown as a summary only** (Phases 4-5). Plan: `describeError` omitted `cause`, and the logger had no policy for it. Built: `{ name, message, code?, status? }` in both places through one guarded helper (`@/lib/summarise-cause`), with leak tests. Why: `AppError` wraps the Axios error as `cause`, and its config holds the request body (a login password) and headers.
38. **Logged URLs never carry a query string or fragment** (Task 5.3). Plan: the request URL as it is. Built: the interceptor cuts the URL at the first `?` or `#` in its debug message and in every failure log. Why: tokens in query strings would reach the console and Sentry; a regex missed queries containing a line break.
39. **Only `SCREAMING_SNAKE` server codes become translation keys** (Task 5.1; plan: any code), and an ESLint zone keeps `core/api` from importing components or `core/errors`. Why: codes such as `constructor` or `__proto__` returned functions from i18next.
40. **The query and mutation caches normalise and classify failures** (Task 5.4). Plan: both handlers logged and toasted the raw thrown value at `warn`, and retried everything but 4xx. Built: `toAppError` first; cancellations are never toasted, logged or retried; failures that were not already an `AppError` are logged at `error`; `meta.silent` on a query skips only the cache's own log, on a mutation only the toast. Why: cancellations were toasted, raw Axios errors leaked their config into logs, and unexpected failures were invisible in production.
41. **`toAppError` and `describeError` never throw** (Phase 5 review). Plan: they assumed well-formed thrown values. Why: both run while rendering the root error fallback and inside the query retryer, where an odd thrown value left a blank page or a query loading forever.
42. **A transient refresh failure keeps the session** (Phase 5 review). Plan: any failed refresh ends the session. Built: a network error, timeout, cancellation or 5xx during the refresh is logged at `warn` and rethrown, so the request that triggered the refresh fails with that error; only other failures end the session. Why: a network blip would sign the user out.
43. **`http` never sends credentials to another origin** (Phase 5 review). Plan: Axios's default, which follows absolute URLs. Built: `allowAbsoluteUrls: false`. Why: once an auth adapter attaches credentials, an absolute URL must not leak them.
44. **`userMessage` is kept only below status 500** (Phase 5 review). Plan: for every status. Why: a 5xx body is raw server text, not copy for users.
45. **The test config pins the environment** (Tasks 5.2, 5.4, 6.1). Plan: no pins. Built: `test.env` in `vite.config.ts` sets `VITE_API_BASE_URL`, `VITE_LOG_LEVEL` and `TZ`, next to the test-only `server.fs.deny` relaxation and `test.css.include`. Why: suites failed under a developer's `.env.local` or outside UTC.

#### Phase 6: translations, formatting, forms

46. **date-fns is imported by subpath and kept out of the start-up graph** (Phase 6 review, Task 8.4). Plan: barrel imports in `@/lib/format`, which `core/i18n` imports. Built: subpath imports, and `setFormatLocale`/`getFormatLocale` live in `src/lib/format-locale.ts`. Why: the barrels loaded in every test file, about doubling the test run (61 s before the fix, 32 s after), and the i18n import pulled date-fns into the eager bundle.
47. **The DatePicker announces its value** (Task 6.5, Phase 6 review). Plan: the date as plain trigger text and English day labels. Built: the trigger's value or placeholder sits in a span named first in `aria-describedby`; day labels and the dialog name are translated; a `formatISODate` helper gives a local `yyyy-MM-dd`. Why: a labelled DatePicker announced only its label (WCAG 4.1.2), and `toISOString()` shifts the picked day across time zones.
48. **Locale handling is stricter** (Tasks 6.1-6.3). Plan: three copies of `isLocale`, a crash on a non-string saved locale, a warning on every missing lookup. Built: one `isLocale` in `src/config/constants.ts`; a non-string saved locale falls back instead of crashing start-up; `navigator.languages ?? [navigator.language]`; a missing translation key is warned once per `ns:key`.
49. **The Zod error map formats date bounds with `Intl.DateTimeFormat`** and gives exclusive bounds their own keys (Task 6.4). Plan: bounds formatted through `@/lib/format`. Why: going through `@/lib/format` would have pushed date-fns into the main chunk (509 kB).

#### Phase 7: routing and authentication

50. **Same-tick URL-state writes are merged** (Task 7.5). Plan: each write starts from the rendered URL. Built: `useUrlState` collects writes made in one tick in a module-level snapshot cleared by `queueMicrotask`. Why: two writes in one handler lost the first. Documented limit: compute the whole update first, and do not write across an `await`.
51. **The session ends once, and a late 401 does not refresh twice** (Task 7.4). Plan: each refused request ended the session, and any 401 started a refresh. Built: `endSession` returns when already anonymous; each request carries the refresh epoch (`_refreshEpoch`), so a 401 for a request sent before a completed refresh retries without refreshing again. Why: concurrent refusals and rotating refresh tokens caused spurious sign-outs.
52. **A failed sign-out still signs out locally and warns until the user closes the warning** (Task 7.4, Phase 7 review, Task 11.3). Plan: `logout()` let a failed `/auth/logout` through. Built: the failure is logged, the session ends locally, and `auth.signOutIncomplete` says the server session may survive; since Phase 11 the notice stays until closed. Why: the httpOnly cookie may still be valid, so a reload could sign the previous user back in (a shared computer).
53. **`safeReturnTo` checks the origin** (Task 7.4). Plan: string checks only. Built: `new URL(value, location.origin).origin` must equal the current origin, and only `RequireGuest` reads `returnTo`. Why: values such as `/<TAB>/evil.example` passed the string checks (an open redirect).
54. **Focus moves to the main content on navigation** (Tasks 7.6, 7.7). Plan: no focus handling on route changes. Built: `RootLayout` focuses `#main-content` after every non-REPLACE route change; the auth layout's `main` can take focus. Why: keyboard and screen-reader users otherwise stay on the old link.
55. **Page errors land in a `PageBoundary` with Try again** (Phase 7 review). Plan (Deviation 7): layouts wrap `<Outlet/>` in `AsyncBoundary`. Built: the `errorElement` route renders `PageBoundary` (an `AsyncBoundary` keyed on the pathname, `ErrorState` with Try again and Reload page) below the router's own boundary, and `app-layout.tsx` no longer wraps the outlet. Why: the router's boundary sat between them, so a failed suspense query showed only "Reload page".
56. **The mobile navigation sheet behaves like a dialog** (Task 7.6, Task 10.1). Plan: a store flag opens the sheet, with no focus return. Built: closing it returns focus to "Open navigation"; a link click, a route change or widening past `md` closes it without taking focus from the page; a modified (new-tab) click keeps it open; the desktop sidebar is sticky. Why: focus fell to `body`, and the sheet stayed open after navigating.
57. **Shell accessibility details** (Tasks 7.6, 7.7): avatar initials use `text-foreground` (AA contrast); logical `border-e`/`start-*` utilities; the user-menu button's name includes the user's name; stories for ForbiddenState, NotFoundState and AuthLayout.
58. **`docs/hooks.md` documents the shared hooks** (Task 7.7), an 18th docs file next to the 17 of spec §11.2. Why: the Global Constraint "every module ships a short docs entry" was not met for them.

#### Phase 8: the reference feature

59. **Mock handlers read a feature's `schemas/` and `types/` directly** (Task 8.2). Plan: features are imported only through their index. Built: an ESLint override for `src/mocks/**` allows exactly those two folders. Why: the index exports the pages and the test setup loads every handler, so the whole UI loaded into every test file (+22 s) and a chunk reached 509 kB.
60. **The Items list keeps the URL honest** (Task 8.5). Plan: none of this. Built: a page past the end redirects (replace) to the last page; "No items yet" shows only when `total === 0`; the search box follows Back and Forward. Why: a stale `?page=N` showed an empty page, and Back left the box out of step with the list.
61. **Deleting from the detail page does not flash "Item not found"** (Tasks 8.3, 8.5). Plan: remove every detail query of the deleted item. Built: `useDeleteItem` removes only inactive detail queries and marks the active one stale without refetching. Cost, documented: Back to the deleted item shows it for one round trip.
62. **Server errors for fields the form does not have are toasted** (Task 8.4). Plan: `applyServerErrors` alone, which dropped them silently.

#### Phase 9: code generation

63. **Orval generates mutation hooks for writes and encodes path parameters** (Task 9.1, Phase 9 review). Plan: `override.query.useQuery: true` and raw path parameters. Built: no `useQuery: true` (reads get `useX`/`useXSuspense`, writes get mutation hooks), `urlEncodeParameters: true`, and `override.operations` gives login, logout and refresh the cookie strategy's options (`skipAuthRefresh`, `silent`). Why: `useQuery: true` sent POST, PATCH and DELETE on mount (`useLogout()` signed the user out), `a/b?x=1` split the path, and a wrong password through the generated `useLogin` ended the session.
64. **The OpenAPI fixture matches the mocks** (Task 9.1): 401 and 403 on every items operation, `maximum: 1000000` on price and quantity.
65. **The generators refuse instead of half-writing** (Task 9.2, Phase 9 review). Plan: plop's actions alone. Built: a `guard` action runs first and refuses, writing nothing, when an anchor is missing or duplicated, a file exists, or a name collides in `paths.ts`, `resources.ts`, the handlers or the translations; `src/test/plop-anchors.guard.test.ts` fails the suite when an anchor is deleted. Why: plop skips a `modify` whose pattern does not match, and does not undo earlier actions.
66. **The generators follow `src/locales`** (Phase 9 review). Plan: templates for `en` and `es`. Built: one translation file per locale folder, a `// plop:resources-<code>` anchor per locale, and a refusal that says what to add. Why: after adding or removing a language (an expected first change) `pnpm gen feature` produced code that failed typecheck.
67. **Generator details** (Task 9.2). Plan: `component <name> feature <feature>`, `titleCase` labels, a `^use-?` filter, Prettier before ESLint through a shell. Built: `pnpm gen component <name> feature:<feature>` (plop cannot bypass a conditional prompt); JSON-escaped titles and dash-free labels ("Purchase Orders"); the hook generator strips only a leading `use-`; the format action runs ESLint, then Prettier, through `node` without a shell, from any folder; story titles stay unique across features; the store generator does not touch `src/test/setup.ts` (documented: add the store to the reset list by hand).
68. **`src/api` has a layer rule** (Phase 9 review): the shared layers (`core`, `components`, `hooks`, `stores`, `config`, `lib`) may not import the generated clients.

#### Phase 10: E2E, coverage, Docker, CI

69. **E2E builds its own server with pinned settings** (Task 10.1). Plan: `reuseExistingServer: !CI` and a build made from the developer's `.env*`. Built: the `webServer` builds and previews with every `VITE_*` pinned to its default (`BUILD_ENV`) and never reuses a server; `test:e2e` is `playwright test`; the a11y spec also covers the edit, 404, Spanish and dark pages and open menus, with only `aria-hidden-focus` disabled for open Radix menus and selects. Why: a developer's `.env.local` failed 15 of 17 tests, and a stale preview served an old build.
70. **Focus after deletes, and an `h1` on every whole-page state** (Task 10.1). Plan: none of this (items carried from earlier phases). Built: after a confirmed row delete focus goes to the next row's link, else the previous one, else the list heading; a refused delete returns focus to its Delete button; `EmptyState` and `ErrorState` take `headingLevel` (default 2), and `RequirePermission`, `PageBoundary`, `RouteError` and `AppErrorBoundary` render an `h1`. Focus after sign-in stays at the document start, where the skip link is the first stop (documented). Why: WCAG items carried from Phases 3-8.
71. **A test may run for 15 s** (Phase 10 review). Plan: Vitest's 5 s default. Built: `testTimeout: 15_000` and a fake-timer debounce test. Why: six load-sensitive tests failed on the 5 s default and would have turned the required CI check red.
72. **`pnpm analyze` and the demo accounts** (Task 10.2). Plan: the visualizer opens a browser on every run; `docs/architecture.md` says components never import `@/mocks`, yet the plan's login page imports the demo accounts. Built: the browser opens only outside CI; the import is documented, not gated (a 0.36 kB chunk with the demo credentials ships in every build). No vendor chunk split was needed: the build has no size warning, and `docs/architecture.md` names `output.codeSplitting.groups`.
73. **The image's entrypoint and nginx are hardened beyond the plan** (Task 10.3 and the Phase 10/11 fix waves). Plan: one cache header for every `/assets` response, no check that `config.js` was written, a loose `API_PROXY_TARGET` check, no upstream TLS verification, no `CONTENT_SECURITY_POLICY` validation. Built: `/assets` responses are cached for a year only when successful (a 404 is never `immutable`); the container stops when it cannot write `config.js`; `API_PROXY_TARGET` must be a whole-string `http(s)://host[:port]`, line breaks included; `https` upstreams are verified (`proxy_ssl_verify on` with the image's CA bundle; a private CA is mounted over it, documented); `CONTENT_SECURITY_POLICY` may not contain `"`, `$`, `\` or control characters; the CSP's API origin is derived as a browser would (credentials dropped, a backslash ends the host). The smoke test checks each one. Why: each was reproduced as an injected nginx directive, a silently ignored configuration, an unverified hop that carries session cookies, or a wrong CSP origin.
74. **Zod runs without its JIT probe** (Task 10.3). Plan: Zod's default. Built: `z.config({ jitless: true })` at the top of `src/config/env.ts`, before the first schema is built. Why: the probe broke the image's CSP on every page load.
75. **No `# syntax=` line in the Dockerfiles** (Task 10.3). Plan: `# syntax=docker/dockerfile:1` at the top of both. Why: it made BuildKit fetch a third, unapproved image, and nothing needs it.
76. **`docker compose down` is not "stop everything"** (Task 10.4). Spec §10.4: it stops everything. Built: the README and `docs/docker.md` say that plain `docker compose down` stops the production service only and `pnpm docker:down` also stops the dev profile. Why: Compose leaves a started profile running.
77. **Audit advisories are settled in `pnpm-workspace.yaml`** (Task 10.5). Plan: no decision. Built: `overrides` for `seroval` (`^1.6.3`) and `source-map-js` (`^1.2.2`), and `auditConfig.ignoreGhsas: [GHSA-vfj7-8cjw-p6xm]` for `braces` (dev-only through plop, no patched release). Why: four advisories in dev and test dependencies, and the plan had no decision for them.
78. **CI adjustments** (Tasks 10.5, 11.3). Plan: `cancel-in-progress: true` for CI and Storybook, no concurrency group for Docker publishing, one shared cache scope. Built: `cancel-in-progress` only for pull requests; `actions/deploy-pages@v4` kept; Storybook publishing is never cancelled and has a 10-minute limit; Docker publishing is serialised per ref; the two image builds use separate `gha` cache scopes; Dependabot ignores Node major versions of the base image. Why: the plan's settings cancelled runs on `main` and in-flight Pages deploys, and Docker publishing had no concurrency control at all.
79. **The Compose guard test also checks that the defaults are valid** (Task 10.4). Plan: it compared the defaults only. Why: `parseEnv` falls back to the app defaults, so an invalid Compose default compared as equal.

#### Phase 11: documentation and release

80. **The DataTable pager uses `aria-disabled`** (Task 11.3). Plan: `disabled` pager buttons. Built: an unavailable button stays focusable, does nothing and dims only its content, so its focus ring keeps full strength. Why: a button disabled while focused dropped keyboard focus to the page on the last page.
81. **The README, guide, security notes and CLAUDE.md differ from the plan's texts** (Tasks 11.1-11.4). A scan checked 236 claims (5 wrong, 25 stale, 16 missing). The shipped texts add `src/api/`, the `docker compose down` row (Deviation 76), "an unset `VITE_ENABLE_MOCKS` means mocks on", the cost of the first commit (the hooks lint every file), the exact split between what ESLint, the tests and convention enforce (`react/jsx-no-literals` checks JSX text, not attributes), a "Dependencies" row in the security table, and "CI does not run `pnpm audit`".
82. **Docs no longer cite the spec or the plan** (Task 11.3). Plan: docs and comments that cite spec sections, owner decisions and Deviations. Built: the "spec §N" references left the docs, and "owner decision N" and "Deviation N" left the source. About 100 code comments still cite "spec §N" (see the follow-ups).

### Corrections to the plan's text

Defects in the plan's own steps and snippets, found by the pre-flight scans and reviews and fixed during the build.

| Phase | Task | What the plan text got wrong | What was done |
|---|---|---|---|
| 1 | 1.5 | `env.test.ts` imports `/.env.example?raw`, which Vite's default `server.fs.deny` refuses | A test-mode relaxation in `vite.config.ts`, kept by every later rewrite |
| 2-11 | all | Many snippets and docs are not Prettier-clean; the Tailwind plugin sorts classes | `pnpm format` before `pnpm lint` in every task |
| 2 | 2.1, 2.2 | Expected test counts 12 and 6 | 13 and 8, counted from the plan's tests |
| 2 | 2.2 | Deviation 1 puts the `errors` namespace in 2.2; the task adds it in Phase 3 | Followed the task |
| 2 | 2.3 | No `test.css.include`, so `tokens.css?raw` loads empty | `css: { include: [/tokens\.css\?raw/] }` |
| 2 | 2.4 | shadcn output needs more hand fixes than Steps 13-14 list | Tabs height, table offset, pagination role and Form context check fixed by hand |
| 2 | 2.4 | The button size test always matches (`size-4` is in the base classes) | Size-specific assertions |
| 2 | 2.5 | The `eslint-disable` for the bootstrap script test is too narrow; the test failed with a custom `VITE_APP_NAME` | Two more rules; the test no longer depends on the name |
| 2 | 2.2-2.6 | Tests depended on the developer's default locale | Language reset in `beforeEach`; suites run under `es` and a custom app name |
| 3 | 3.3, 5.4, 7.x | `waitForElementToBeRemoval` | `waitForElementToBeRemoved`, with `act` still exported |
| 3 | 3.4 | React 19 does not retry a `use()` suspend begun in a synchronous `act` | `await act(() => { render(...); return Promise.resolve(); })` |
| 3 | 3.2 | `JSON.stringify(...) ?? String(value)` fails `no-unnecessary-condition` | Typed as possibly `undefined` |
| 3 | 3.4 | The boundary reset in the render that threw | Deviation 29 |
| 3 | 3.5 | The ServerDriven story shows a blank page-size select; the pager is a bare `div` | `pageSizeOptions: [5, 10, 20]`; Deviation 30 |
| 3 | 3.5, review | Docs say DataTable skeletons are delayed; the example unmounts the table on each page change | Reworded; `placeholderData: keepPreviousData` |
| 4 | 4.3 | An unhandled `ErrorEvent` after uninstall fails the Vitest run | An `error` listener around the dispatch |
| 4 | 4.3, gate | React calls the root `onCaughtError` first, so the entry is "React error caught by a boundary", not "Unhandled render error" | Docs, gate and an integration test use the real entry |
| 4 | 4.2 | `className={buttonVariants(...)}` on `AlertDialogAction` loses to `bg-primary` | The `variant` prop |
| 4 | 4.1 | `logger.test.ts` assumes `VITE_APP_ENV=development` | Asserts against `env.VITE_APP_ENV` |
| 4 | 4.3 | Docs said API errors are logged by caches that did not exist yet; a `console.error` mock hid React's act warning | Marked planned; the test asserts no `console.error` |
| 4 | review | The carried "add `error.cause` to the logger" would copy the request body | Deviation 37 |
| 5 | 5.2, 5.4 | `setup.ts` and `render.tsx` replaced wholesale, dropping earlier lines | Edited in place |
| 5 | 5.5 | The store-reset loop over a union fails `tsc` | A generic `resetStore<State>()` |
| 5 | 5.2 | `api-url.test` fails under a developer's `VITE_API_BASE_URL`; docs describe the Docker demo, E2E and generators as present | `test.env` pin; "(planned)" until they existed |
| 5 | 5.3 | The 401 branches threw without logging; nothing tested the anti-loop guard | `warn` before each throw; an anti-loop test |
| 5 | 5.4, 5.5 | `meta.silent` and the auth layer documented as doing what the code does not (yet) do | Docs corrected; Deviation 40 |
| 6 | 6.1 | A second `env` key in the test config (TS1117) loses `TZ` | One merged `test.env` |
| 6 | 6.5 | `pnpm ui:add calendar` waits for an answer; the generated `z-10` fails the token guard; DayPicker's `autoFocus` fails jsx-a11y | An "n" piped in; `z-sticky`; a reasoned disable |
| 6 | 6.4, gate | The Form story's own error strings beat the Spanish messages the gate checks | Removed |
| 6 | 6.1, 6.2 | Format tests assume `en`/`USD`; a non-string saved locale crashes start-up; missing-key warnings repeat | Assert against `env`; Deviation 48 |
| 6 | 6.4 | `form-errors.test` deletes the real validation bundle; date bounds through `@/lib/format` | Real strings asserted; Deviation 49 |
| 6 | 6.1-6.3, 6.6 | Three copies of `isLocale`; `docs/i18n.md` cites plan phases | One `isLocale`; neutral wording |
| 7 | 7.3 | The MSW addendum says a mocked `Set-Cookie` does not reach jsdom | `clearCookies()` after each test |
| 7 | 7.x | Untyped `renderHook` generics, async `act` callbacks (`require-await`), import order; 31 snippets not Prettier-clean | Typed, `Promise.resolve()`, `lint:fix`, format |
| 7 | 7.2, 7.7 | Title tests assume the default app name; jsdom prints `scrollTo` errors | Assert against `env.VITE_APP_NAME`; a `scrollTo` stub |
| 7 | 7.4, 7.5 | Overwritten same-tick writes; a session ended per request; a second refresh; a rejecting logout; an open redirect | Deviations 50-53, about 11 tests |
| 7 | 7.6 | Initials below AA contrast; physical utilities; no focus return from the mobile sheet | Deviations 56-57 |
| 7 | 7.2 | No docs entry for the shared hooks; a 101-character commit subject (commitlint allows 100) | Deviation 58; shortened |
| 7 | review | The "refresh again later" half of the epoch logic had no test; docs said a failed logout ends the server session | A converse test; Deviation 52 |
| 8 | 8.1 | `errors.test.ts` uses `ITEM_LOCKED`, which 8.1 translates, as an untranslated code | `ACCOUNT_FROZEN` |
| 8 | 8.3-8.5 | The optimistic-delete test does not hold the request; the clipboard fake comes before `userEvent.setup()`; the sort test expects ascending first | Held DELETE; setup first; descending first |
| 8 | 8.x | Lint and type errors in `csv.ts`, `items-api.ts` and the export test | `safeString`, a type-guard filter, a typed `vi.fn` |
| 8 | 8.4, 8.5 | Tests depend on `VITE_FEATURE_FLAGS` and on `$` literals | An explicit flag source; `formatCurrency(...)` |
| 8 | 8.2-8.5 | Handlers import the feature index; no past-the-end redirect; a not-found flash after delete; dropped field errors; physical `left-3`/`pl-9` in the toolbar | Deviations 59-62; `start-3`/`ps-9` |
| 8 | review | The redirect, debounce, Clear and per-route 403s had no test | Tests, each mutation-checked |
| 9 | 9.2 | Step 6's cleanup reverts the uncommitted edits of Steps 1-2 | Step 6 runs after the commit |
| 9 | 9.2 | The format action runs Prettier before `eslint --fix`, leaving unformatted imports | ESLint first |
| 9 | 9.1 | `useQuery: true`; raw path parameters; the fixture lacks 401/403 and maxima | Deviations 63-64 |
| 9 | 9.2 | No bypass for the feature component; silent anchor misses; half-written collisions; unescaped titles; dashed labels; the handler template imports the feature index; `shell: true` on Windows | Deviations 65-67 |
| 9 | 9.2 | The hook filter `^use-?` turns `user-prefs` into `r-prefs` | Strip only `use-` |
| 9 | 9.1, 9.2 | Docs promise CI checks and a drop-in switch to the generated hooks | Planned until Phase 10; the switch claim removed |
| 10 | 10.2 | The new `vite.config.ts` drops `server.fs`, two `test.env` pins and `css.include` | All kept |
| 10 | 10.2 | The coverage bite check on `lines` cannot fail (lib lines are 100%) | `branches` |
| 10 | 10.3 | A global `MSYS_NO_PATHCONV=1` makes curl exit 23 in Git Bash | Set for `docker` only |
| 10 | 10.1 | Substring link locators, an axe scan during a closing menu and a sign-out race fail 5 of 17 specs | `exact: true`; wait for the close and for `/login` |
| 10 | 10.1 | E2E depends on `.env.local` and reuses stale servers | Deviation 69 |
| 10 | 10.3 | 404s cached as immutable; ignored `config.js` write failures; the Zod probe against the CSP; a third image via `# syntax=` | Deviations 73-75 |
| 10 | 10.3 | "About 20 MB" image | 31.4 MB |
| 10 | 10.4 | `docker compose down` "stops everything" | Deviation 76 |
| 10 | 10.5 | No decision for four audit advisories; docs still call Docker and E2E planned | Deviation 77; docs updated |
| 10 | reviews | A line break passes the proxy check; `https` upstreams unverified; an invalid Compose default passes the guard; load-sensitive tests | Deviations 73, 79, 71 |
| 11 | 11.1-11.4 | Texts written before Phases 2-10 changed things | Deviation 81 |
| 11 | 11.2 | The appended "Secrets and configuration" repeats an existing section | One sentence and a link |
| 11 | 11.3 Step 1 | The command check's `builtins` lack `audit` | Added |
| 11 | 11.3 Step 3 | Item 2 changes `:root` and `.dark` only, but the tokens test also checks the `prefers-color-scheme` fallback block | All three changed (the guide already says so) |
| 11 | 11.3 Steps 3-4 | `docker builder prune -f`; a `bedrock-trial` clone outside the `react-bedrock*` names | No prune; the slug `react-bedrock-trial` |
| 11 | 11.4 Step 2 | Copying a corrected plan over this one | This record, appended |

### Known limitations (shipped as known)

1. **Right-to-left layouts are not supported:** about 36 physical-direction utilities remain in 17 shipped primitives (the dropdown menu most of all), the Sheet's left side is fixed and the PanelLeft icons do not mirror.
2. **Loading live regions are unverified with a screen reader:** `PageLoader` mounts `role="status"` together with its text, and skeletons use `aria-busy`.
3. **A 4xx server message shows only for a code without a translation:** a body without `code` gets one from its status, and each of those has a translation (documented).
4. **A transient `/auth/me` failure at start-up shows the login page** (no Retry); a reload restores the session.
5. **Mocks are on by default:** an unset `VITE_ENABLE_MOCKS` means the mock API, every build carries the mock chunk and the demo accounts, and a production console prints no warning when a deployment forgets `VITE_ENABLE_MOCKS=false` (documented prominently).
6. **Sentry integration gaps:** HTTP `AppError`s share one stack (one issue), exceptions lose the log message, Sentry's own global handlers duplicate the template's, `ResizeObserver` noise is reported, and ids reach the `route` tag.
7. **Optimistic delete limits:** a refused earlier delete brings back a row deleted later, and Back to a deleted item shows it for one round trip (both documented).
8. **Parts of the automation have never run.** CI (all four jobs, including the Chromium E2E project with `playwright install --with-deps`, the buildx `gha` cache and the image smoke test), the Storybook build and Dependabot (with pnpm 12.8.1 and the `overrides`) ran on GitHub while the repository was private. The multi-arch GHCR publish, the Pages publish job and a real deploy have not. `latest` follows the most recently published stable release.
9. **One ignored advisory:** `auditConfig.ignoreGhsas: [GHSA-vfj7-8cjw-p6xm]` (`braces` through plop, dev-only, no patched release) silences it for the whole tree.
10. **Test and guard gaps:** thin spots across storage, the logger and Sentry, the interceptors, hooks, DataTable, the mock handlers and the generators' pure logic; the design-token guard misses `border-s/e` palette colours, `rgb()`/`hsl()` and non-px arbitrary values; the built `index.html` keeps a literal `%VITE_APP_NAME%` meta when the variable is unset.

Also known: the manual browser passes ran on Microsoft Edge (CI runs the E2E suite on Chromium); the base images are floating tags (no digest); axe reports one "needs review" item (a form control's `aria-describedby` names a description that is not rendered, as in shadcn's `FormControl`); and the Docker-only checks were not repeated locally at the final commit (see the owner decisions).

The full deferred list was triaged before publishing: 234 items, of which 26 were fixed, 65 were already fixed or obsolete, and 143 ship as known minors.

### Follow-ups for the owner

- **Node.js 26** becomes LTS on 2026-10-28: move `.nvmrc`, `engines`, `@types/node` and the Docker base images to it.
- **ESLint 10 and TypeScript 6.1 or newer:** lift the version pins of Deviation 12 once the plugins support them.
- **MSW:** Task 5.2 did not fall back to MSW 2; the template runs MSW 3, so there is nothing to return to. After an MSW upgrade, run `pnpm exec msw init public` again.
- **Deploy:** fill in the deploy step in `.github/workflows/deploy.yml`, then set the repository variable `DEPLOY_ENABLED=true` (`docs/deployment.md`).
- **Add an audit job to CI:** CI does not run `pnpm audit`; `docs/security.md` asks for it before a release and after every major update.
- **Pulling later template updates:** a repository made with GitHub's "Use this template" has an unrelated history and no link to the template, so GitHub offers no way to pull later template changes into it. The options are to clone with history and keep the template as a second remote (merges conflict once the app is renamed and the example feature removed), or to extract `src/core` into a shared package (spec §13, decision 10), which is the intended answer to template drift.
- **Windows-friendly Docker examples:** the README and most of `docs/docker.md` set variables in POSIX form (`VAR=value docker compose up`), with a single PowerShell note, and the private-CA recipe in `docs/security.md` redirects with `>`, which in Windows PowerShell 5.1 writes UTF-16.

### Final verification

What was run on the finished template, and where. The first verification pass covered the static checks and the local runs; the second covered the browser and Docker items.

- **GitHub CI,** on the last pushed commit (the application code in it is final): all four jobs passed. They are `verify` (lint, typecheck, 693 tests, the coverage thresholds, the build and the generated-client drift check), the Chromium end-to-end suite (25 tests), the generators job, and the Docker image build with the smoke test. Everything after that commit is documentation, the licence, the plan record and ignore-file housekeeping.
- **Local runs:** lint, typecheck, tests (101 files, 693 tests), build (entry chunk 213.25 kB), coverage (`src/core`: 96.63% lines, 98.14% functions, 90.89% branches; `src/lib`: 100% lines and functions, 92.86% branches), Storybook build, end-to-end on Edge (25 tests), and `pnpm audit --audit-level high` (exit 0, one advisory ignored on purpose). Coverage, the Edge end-to-end run, the Storybook build and the audit ran on the last pushed commit; lint, typecheck and the unit tests were re-run on the final tree.
- **Definition of Done (spec §14),** one line per item:
  1. **Lint, typecheck, tests, E2E and build pass:** the local runs above, and all four CI jobs.
  2. **Tokens restyle the whole app:** second pass. `--primary` and `--radius` were changed in `src/styles/tokens.css` only (in the light, dark and fallback blocks; the tokens test requires all three). Sign-in, the dashboard, the Items list, detail and form, a dialog and a toast were captured in light and dark (14 captures): every primary control changed colour and no element kept a rounded corner other than circles. The edit was made in a scratch clone and discarded.
  3. **Every async view uses the shared state components:** first pass (every `isPending`, `isLoading` and `isError` hit feeds `QueryState`, `DataTable` or a button's busy state) and second pass on a throttled network (loader, skeleton, error state with "Try again", not-found state).
  4. **No direct imports of wrapped libraries:** `pnpm lint`, and the first pass's search (hits only inside the wrappers).
  5. **Runs fully on the mock API, with no backend:** the E2E suite on Edge and, in CI, on Chromium; second pass on the dev server and on a production preview (an admin creates, edits and deletes an item; a viewer is read-only).
  6. **`pnpm gen feature` produces working, lint-clean code:** the CI generators job, and the first pass, which replayed that job in a scratch clone (105 test files, 701 tests).
  7. **Generated hooks use the shared interceptors:** the `src/api` tests, and the generated-client drift check in CI.
  8. **All UI text is translated:** first pass (the attribute and object-property scans print nothing; the i18n tests pass) and second pass (24 views clicked through in Español: no English UI string, apart from the development-only label of the third-party Query devtools button).
  9. **Nothing company-specific:** the first pass searched the tree for the neutrality terms (no match), and found one commit identity, no local paths and only `example.com` addresses; the whole-phase review repeated the search over the whole history. The copyright holder named in `LICENSE` is the owner's choice.
  10. **Docker only, no `.env`, no backend:** verified earlier in the build (the image build and smoke test at the Phase 10 gate and again after the entrypoint fix of Phase 11, and compose from nothing with a sign-in in the Phase 11 pre-flight) and by CI's image build and smoke test on the final application code. The last local re-run was skipped at the owner's request because the Docker engine was stopped.
  11. **The same image works against another API, by environment variables only:** verified the same way (the smoke test checks `config.js` and the `connect-src` origin rows; the Phase 11 pre-flight ran the four Docker commands of the README), and by CI's smoke test on the final application code. The last local re-run was skipped for the same reason.
  12. **Keyboard and axe pass on key pages:** second pass (a keyboard-only walk from sign-in through the dashboard and the Items list to a dialog, where focus stayed inside and Escape returned it; 24 axe scans in English and Español, light and dark, with no violation) and the a11y E2E specs on Chromium in CI.
  13. **README, `docs/` and `CLAUDE.md` are complete:** first pass (the 17 files the spec lists, plus `hooks.md`; every `pnpm` command in the docs exists; every relative link resolves) and a review of each document.
  14. **The new-project guide was followed end to end:** the Phase 11 pre-flight walked it in a scratch clone (tests, build, E2E on Edge, `docker compose up --build`, sign-in, and `pnpm codegen:api` leaving the tree unchanged); the first pass found only wording changes in the guide since, so the walk was not repeated.
- **Reviews:** Phases 0 and 1 were run directly by the controlling session. From Phase 2 on, every task had a task review, and every phase had a whole-phase review with one fix wave and a scoped re-review. The whole-phase review of Phase 11 also found that this record understated what CI had verified, and its fix wave corrected the record.
