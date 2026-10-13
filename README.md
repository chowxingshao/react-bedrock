# React Bedrock

A neutral, ready-to-use starter for React + TypeScript single-page apps. Design tokens, a component library, data fetching, authentication, translations, error handling, logging, tests, code generators, Docker and CI are already wired up. Clone it and start on your features.

## What's inside

| Area               | Choice                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language and build | TypeScript 6 (strict), React 19, Vite 8, pnpm 12                                                                                                                                            |
| UI                 | Tailwind CSS v4 with every design token in one file, shadcn/ui (Radix), lucide icons, Sonner toasts, Storybook                                                                              |
| Data               | TanStack Query, one Axios client with interceptors, Zod validation, Orval code generation, MSW mocks                                                                                        |
| State              | TanStack Query for server data, Zustand for UI and session state, the URL for filters and pages                                                                                             |
| App                | React Router (lazy routes, guards), cookie-session auth with permissions, i18next (English and Spanish), locale-aware formatting, error boundaries, a redacting logger with optional Sentry |
| Quality            | ESLint (type-aware, with architecture rules), Prettier, Vitest + Testing Library, Playwright + axe, Husky + commitlint                                                                      |
| Delivery           | Docker (nginx, runtime configuration, one image for every environment), GitHub Actions, Dependabot                                                                                          |

A complete reference feature, "Items" in `src/features/example`, shows every pattern end to end: list, detail, create, edit and delete.

## Quick start

**Prerequisites:** Node.js 24 LTS (24.15 or newer) and pnpm 12 (`npm install -g pnpm@12`). Or only Docker; see below.

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173 (if that port is taken, Vite uses the next free one and prints the address) and sign in with a demo account. The mock API is on by default, so no backend is needed.

| Email              | Password | Permissions |
| ------------------ | -------- | ----------- |
| admin@example.com  | demo1234 | everything  |
| viewer@example.com | demo1234 | read only   |

**Configuration is optional.**

- Copy `.env.example` to `.env.local` and change what you need ([docs/architecture.md → Configuration](docs/architecture.md#configuration-srcconfigenvts)).
- To use a real backend during development, set `VITE_ENABLE_MOCKS=false` and `API_PROXY_TARGET=http://localhost:3000`.
- An unset `VITE_ENABLE_MOCKS` means the mock API is **on**: in `pnpm dev`, in the production build and in the Docker image. Set it to `false` on every real deployment.

## Run with Docker only

No Node.js, no pnpm, no `.env` file:

| Command                                                                          | Result                                                                                                                                           |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docker compose up`                                                              | Production build served by nginx at http://localhost:8080, mock API on                                                                           |
| `VITE_API_BASE_URL=http://my-api:3000 VITE_ENABLE_MOCKS=false docker compose up` | The same image, pointed at a real API                                                                                                            |
| `docker compose --profile dev up`                                                | The production service plus the Vite dev server with hot reload at http://localhost:5173, source mounted from your machine                       |
| `docker compose down`                                                            | Stops the production service. It leaves the dev server running: use `docker compose --profile dev down` or `pnpm docker:down` to stop everything |

Add `--build` after changing the code. [docs/docker.md](docs/docker.md) covers every runtime variable, connecting a backend, and troubleshooting.

## Scripts

| Script                                                    | What it does                                                                                                                                    |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                                | Dev server with hot reload at http://localhost:5173                                                                                             |
| `pnpm build`                                              | Type-check, then build to `dist/`                                                                                                               |
| `pnpm preview`                                            | Serve the production build at http://localhost:4173                                                                                             |
| `pnpm typecheck`                                          | Type-check every project: app, tooling and E2E                                                                                                  |
| `pnpm lint`                                               | ESLint (zero warnings), then a Prettier check                                                                                                   |
| `pnpm lint:fix`                                           | Auto-fix ESLint and Prettier issues                                                                                                             |
| `pnpm format`                                             | Format everything with Prettier                                                                                                                 |
| `pnpm test` / `pnpm test:watch`                           | Unit, component and integration tests (Vitest)                                                                                                  |
| `pnpm test:coverage`                                      | Tests with a coverage report in `coverage/`, enforcing the thresholds                                                                           |
| `pnpm test:e2e` / `pnpm test:e2e:ui`                      | Build, then run the Playwright end-to-end and accessibility tests. The first time, install the browser: `pnpm exec playwright install chromium` |
| `pnpm storybook` / `pnpm storybook:build`                 | Component catalogue at http://localhost:6006, or a static build                                                                                 |
| `pnpm analyze`                                            | Build and open a treemap of the bundle (`stats.html`)                                                                                           |
| `pnpm codegen:api`                                        | Generate typed API hooks from `openapi/openapi.yaml`                                                                                            |
| `pnpm gen`                                                | Code generators: feature, component, page, hook, store                                                                                          |
| `pnpm ui:add <name>`                                      | Add a shadcn/ui component, adjusted to this repo's rules                                                                                        |
| `pnpm docker:up` / `pnpm docker:dev` / `pnpm docker:down` | Docker shortcuts: rebuild and run production, run the dev server, stop everything                                                               |

Git hooks install themselves on `pnpm install`: lint-staged on commit, and commitlint on the message.

## Project structure

```
src/
├── api/          generated API clients (Orval), never edited by hand; plus the hand-written generated-client.test.tsx
├── app/          composition root: providers, router, thin route pages, navigation
├── config/       validated env, constants, typed paths, permissions, feature flags
├── core/         infrastructure: api, auth, errors, i18n, logger, notify, storage
├── components/   ui/ (design system), feedback/ (async states), layout/ (app shell)
├── features/     business features, e.g. example/ (the reference "Items" feature)
├── hooks/  lib/  stores/  locales/  mocks/  styles/  test/  types/
docs/             developer documentation
                  (docs/superpowers/ holds the plan the template was built from; the new-project guide removes it)
e2e/              Playwright tests
docker/           container entrypoint and nginx template
openapi/          the API spec used by `pnpm codegen:api`
plop/             generator templates (the generators are defined in plopfile.js)
public/           static files: favicon, the runtime-config stub, the mock service worker
scripts/          repository tooling (shadcn import, CSP hashes, Docker smoke test)
.github/          workflows, Dependabot, the shared setup action, the pull request template
.husky/           Git hook scripts: lint-staged on commit, commitlint on the message
.storybook/       Storybook configuration
Dockerfile, Dockerfile.dev, docker-compose.yml
                  the production image, the dev container and the Compose services
pnpm-workspace.yaml
                  package-manager settings: allowed install scripts, overrides, the audit exception
CLAUDE.md         guide for AI coding agents
```

ESLint enforces which layer may import which; see [docs/architecture.md](docs/architecture.md).

## Documentation

| Topic                                                 | Read                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| Layers, folders and import rules                      | [architecture.md](docs/architecture.md)                             |
| Design tokens, rebranding, components, Storybook      | [design-system.md](docs/design-system.md)                           |
| HTTP client, TanStack Query, query keys, `QueryState` | [data-fetching.md](docs/data-fetching.md)                           |
| Generating API clients with Orval                     | [api-codegen.md](docs/api-codegen.md)                               |
| Where state lives: Query, Zustand, URL or local       | [state-management.md](docs/state-management.md)                     |
| Shared hooks                                          | [hooks.md](docs/hooks.md)                                           |
| Routes, guards and the paths helper                   | [routing.md](docs/routing.md)                                       |
| Authentication and permissions                        | [auth.md](docs/auth.md)                                             |
| Translations and formatting                           | [i18n.md](docs/i18n.md)                                             |
| Forms and server errors                               | [forms.md](docs/forms.md)                                           |
| Errors, logging and notifications                     | [error-handling-and-logging.md](docs/error-handling-and-logging.md) |
| What to test where; MSW; E2E                          | [testing.md](docs/testing.md)                                       |
| Code generators                                       | [generators.md](docs/generators.md)                                 |
| Security decisions                                    | [security.md](docs/security.md)                                     |
| Docker                                                | [docker.md](docs/docker.md)                                         |
| CI/CD, images and environments                        | [deployment.md](docs/deployment.md)                                 |
| Branching, commits and pull requests                  | [contributing.md](docs/contributing.md)                             |
| Creating a project from this template                 | [starting-a-new-project.md](docs/starting-a-new-project.md)         |

## Starting a new project

Follow [docs/starting-a-new-project.md](docs/starting-a-new-project.md): name it, brand it, connect your API, and remove the example feature.

## Contributing

Branching, the commit convention and the pull-request checklist are in [docs/contributing.md](docs/contributing.md).

## License

MIT — see [LICENSE](LICENSE).
