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

| Path                                    | What lives there                                                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`                              | Providers, the router (`router.tsx`), thin route pages (`routes/`), the sidebar config (`navigation.ts`)                                      |
| `src/config/`                           | `env.ts` (the only reader of the environment), constants, `paths.ts` (every URL), permissions, feature flags                                  |
| `src/core/`                             | api (`http`, `AppError`, query client), auth, errors, i18n, logger, notify, storage. Never imports features, layout or app                    |
| `src/components/`                       | `ui/` primitives, `feedback/` async states, `layout/` app shell                                                                               |
| `src/features/<name>/`                  | Business code. Other code imports only the feature's `index.ts`                                                                               |
| `src/api/`                              | Orval-generated clients (`generated/`). Never edit by hand: change the spec and run `pnpm codegen:api`. Only features and `src/app` import it |
| `src/hooks/`, `src/lib/`, `src/stores/` | Shared hooks, pure utilities (`cn`, formatters), Zustand stores                                                                               |
| `src/locales/<lang>/<ns>.json`          | Translations. `en` is the source of truth                                                                                                     |
| `src/mocks/`                            | MSW handlers and fixtures, used by dev, tests and E2E                                                                                         |
| `src/styles/tokens.css`                 | Every colour, radius, font, shadow, z-index and duration                                                                                      |
| `src/test/`, `src/types/`               | Test setup, the provider-aware `render` and the guard tests; ambient type declarations                                                        |
| `e2e/`, `plop/`                         | Playwright tests (with axe); generator templates (the generators are in `plopfile.js`)                                                        |
| `docs/`                                 | How each part works. Read the matching doc before changing a module                                                                           |

## Rules

Rules 1, 2 and 5, and rule 7 except for attributes, are enforced: a violation fails `pnpm lint`, `pnpm typecheck` or `pnpm test` (rule 1 by `src/test/design-tokens.guard.test.ts`, a missing locale key by `pnpm typecheck` and `src/core/i18n/resources.test.ts`, the others by ESLint). The rest are conventions that nothing checks, so follow them anyway.

1. **Design values** come from `src/styles/tokens.css`, through token utilities (`bg-primary`, `z-modal`). No hex colours, palette classes, arbitrary pixel values, or raw z-index and duration numbers.
2. **Use the wrappers:**
   - `http` from `@/core/api`
   - `notify` and `useConfirm` from `@/core/notify`
   - `logger` from `@/core/logger`
   - `localStore`, `sessionStore` and `cookies` from `@/core/storage`
   - the formatters from `@/lib/format`
   - `env` from `@/config/env`

   Never import axios, sonner, date-fns, js-cookie or `@sentry/*`, and never use `console`, `localStorage`, `sessionStorage`, `document.cookie`, `import.meta.env` or `window.__APP_CONFIG__` directly.

3. **State:** server data lives in TanStack Query; never copy it into a Zustand store. Filters, search, sort and page go in the URL (`useUrlState`, `usePagination`).
4. **Async views** handle loading, empty, error and success, using `QueryState` or `AsyncBoundary` and the skeleton presets.
5. **Imports:** import a feature only through `@/features/<name>`, and a core module only through `@/core/<module>` (inside `src/core` a module may import its siblings' files). ESLint also enforces the layers in docs/architecture.md: `config` and `lib` import nothing above them, `core` never imports features, layout or app, and shared code never imports features.
6. **Validation:** use Zod at the boundaries: API responses, forms and env.
7. **Text:** no user-facing string literals in JSX (ESLint) or in attributes such as `aria-label`, `title`, `placeholder` and `alt` (a convention: the lint rule does not see attributes). Use `t('…')`, with the key in every locale (`pnpm typecheck` and `src/core/i18n/resources.test.ts` fail otherwise).
8. **Links and permissions:** links use `paths.*`. Permissions are checked with `<Can>` or `RequirePermission` (both from `@/core/auth`). These checks only decide what the UI shows; the API is the authority.
9. **Accessibility:** labelled controls, full keyboard support, and exactly one `h1` per page (`PageHeader`). The E2E suite runs axe on the key pages.

## Before you finish a task

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Also run `pnpm build` after dependency or config changes, and `pnpm test:e2e` after changing a user flow (the first time, `pnpm exec playwright install chromium`; port 4173 must be free). `pnpm lint:fix` repairs import order and formatting.

## Common tasks

| Task                               | How                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New feature                        | `pnpm gen feature <plural> <singular> y`, then add permissions and the real API calls (docs/generators.md)                                                                                                                                                                                                                                                                                                                                   |
| New page, component, hook or store | `pnpm gen page <name> "<Title>"`, `pnpm gen component <name> <ui\|feedback\|feature:<feature>>`, `pnpm gen hook <name>` or `pnpm gen store <name>`. Pass every answer on the command line: without a terminal a prompt cannot be answered                                                                                                                                                                                                    |
| New shadcn primitive               | `pnpm ui:add <name>`. Answer `n` if it offers to overwrite an existing component (docs/design-system.md)                                                                                                                                                                                                                                                                                                                                     |
| The API changed                    | Update `openapi/openapi.yaml` (or the Orval input), run `pnpm codegen:api`, and commit `src/api/generated`: CI fails when it is stale                                                                                                                                                                                                                                                                                                        |
| New translation                    | Add the key to `src/locales/en/<ns>.json` and to every other locale                                                                                                                                                                                                                                                                                                                                                                          |
| New env variable                   | The schema in `src/config/env.ts`, `.env.example`, `CONFIG_KEYS` in `docker/docker-entrypoint.sh`, and both services in `docker-compose.yml` (`web` with a default, `web-dev` as a pass-through). A guard test lists what's missing (`src/config/env.test.ts`, `src/test/docker-config.guard.test.ts`). Nothing checks two more places: pin the variable in `BUILD_ENV` in `playwright.config.ts`, and add it to the table in docs/docker.md |

## Conventions

- **Tests** sit next to the code they test (`*.test.ts(x)`). Import render helpers from `@/test/render`. Mock HTTP with MSW: `server.use(...)` (from `@/mocks/server`), with URLs built by `apiUrl()` (from `@/mocks/api-url`).
- **Generators** insert code at the `// plop:…` comments in `src/core/i18n/resources.ts`, `src/mocks/handlers.ts`, `src/config/paths.ts`, `src/app/router.tsx` and `src/app/navigation.ts`, and into the `nav` and `pages` objects of each locale's `common.json`. Don't delete or rename them: a guard test fails when one is missing.
- **Commits** follow Conventional Commits (commitlint enforces this).
- **Docs:** when you change a module or a convention, update its file in `docs/`.
