# Architecture

React Bedrock is a single-page app built with Vite. Code is organised by **layer**; business code by **feature**.

## Layers and dependency rules

```
config  →  lib  →  core  →  components / hooks / stores  →  features  →  app
(leaf)                                                                  (composition root)
```

An arrow means "may be imported by everything to its right". These rules are enforced by ESLint (`import-x/no-restricted-paths`, `no-restricted-imports`):

| Folder                    | Purpose                                                              | May import                                                                                                                                                                        |
| ------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/config`              | Validated env, constants, typed paths, feature flags                 | `config`, `lib`                                                                                                                                                                   |
| `src/lib`                 | Pure utilities (`cn`, formatters, ids)                               | `config`, `lib`                                                                                                                                                                   |
| `src/core`                | App infrastructure: api, auth, logger, notify, storage, i18n, errors | `config`, `lib`, `core`, `stores`, `components/ui`, `components/feedback`, `locales` — never `features`, `components/layout` or `app` (so it can be extracted to a package later) |
| `src/components`          | Design system (`ui`), async states (`feedback`), layout (`layout`)   | anything except `features` and `app`                                                                                                                                              |
| `src/hooks`, `src/stores` | Shared hooks; Zustand stores (UI/session state only)                 | anything except `features` and `app`                                                                                                                                              |
| `src/features/<name>`     | Business features                                                    | anything except `app` and **other features' internals**                                                                                                                           |
| `src/app`                 | Providers, router, route pages                                       | everything                                                                                                                                                                        |

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

## Tooling

- `pnpm lint` runs ESLint (type-aware, zero warnings) and then `prettier --check`.
- `pnpm lint:fix` applies auto-fixes. Import order is auto-fixable.
