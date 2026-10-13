# Contributing

## Workflow

1. Branch from `main`: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`.
2. Keep commits small and focused. Each commit message follows [Conventional Commits](https://www.conventionalcommits.org/):
   `type(optional-scope): summary`, where type is one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
3. Before pushing, run `pnpm lint && pnpm typecheck && pnpm test`.
4. Open a pull request and fill in the checklist below.

## Git hooks (installed automatically by `pnpm install`)

| Hook         | Runs                                                             |
| ------------ | ---------------------------------------------------------------- |
| `pre-commit` | `lint-staged`: ESLint `--fix` + Prettier on staged files only    |
| `commit-msg` | `commitlint`: rejects messages that are not Conventional Commits |

Set `HUSKY=0` to skip installing hooks (CI images, Docker builds).

## Pull request checklist

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass locally
- [ ] New UI text exists in every locale (`src/locales/*`)
- [ ] Async views handle loading, empty, error and success states
- [ ] No new direct imports of wrapped libraries (ESLint enforces this)
- [ ] Docs in `docs/` updated for any new module or convention

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

| Job                                | Checks                                                                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint, typecheck, test, build       | `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` (with thresholds) and `pnpm build`, plus a check that `src/api/generated` matches `pnpm codegen:api` |
| End-to-end (Playwright)            | `pnpm test:e2e`, against the preview build with the mock API                                                                                             |
| Generators produce lint-clean code | Runs every `pnpm gen` generator, then lint, typecheck, test and build                                                                                    |
| Docker image                       | Builds the production image and runs `scripts/docker-smoke-test.sh`                                                                                      |

Every run uploads the coverage and Playwright reports it produced as downloadable artifacts (`coverage` and `playwright-report`), kept for 14 days. A newer push to a pull request cancels its older run; a run on `main` is never cancelled once it has started. New pull requests start from the checklist in `.github/pull_request_template.md`.

## Branch protection (recommended)

In Settings → Rules → Rulesets, add a branch ruleset for `main`:

- **Pull requests:** require a pull request before merging, with at least one approval. Dismiss stale approvals when new commits are pushed, and require all conversations to be resolved.
- **Status checks:** require the four CI jobs above to pass (you can select them once CI has run once), and require branches to be up to date before merging.
- **History:** block force pushes and deletions, and require linear history.

In Settings → General → Pull Requests, allow only **squash merging**, with the pull-request title as the commit message. Write that title as a Conventional Commit, so `main` reads as one Conventional Commit per change.

## Dependency updates

Dependabot (`.github/dependabot.yml`) opens pull requests every week, grouped where it can:

- one grouped pull request for npm minor and patch updates
- one per npm major update
- one for GitHub Actions
- none for the Docker base images as shipped: `node:24-alpine` names only a Node.js major, and Node.js majors are held back (below), while `stable-alpine-slim` has no version at all. Rebuild the image to pick up a new release of either base image, or pin both by digest (docs/security.md) and Dependabot proposes digest updates

Review the changelog before merging a major update; CI checks the rest. One exception: an update of Orval changes the code in `src/api/generated`, so the `codegen:api` check of the CI fails that pull request until you run `pnpm codegen:api` and commit the result.

- **Held back on purpose:** ESLint majors, and TypeScript minor and major releases, wait until `eslint-plugin-react`, `eslint-plugin-jsx-a11y` and `typescript-eslint` support them; remove the matching `ignore` entry when they do. Node.js majors (`@types/node` and the `node` image of both Dockerfiles) are never proposed: move `.nvmrc`, `engines`, `@types/node` and both Dockerfiles to a new major together, by hand.
- If Dependabot reports that it doesn't support the pinned pnpm version, update by hand until it does: `pnpm outdated`, then `pnpm update --interactive --latest`.
- **Audit exceptions:** `pnpm-workspace.yaml` holds two version overrides and one ignored advisory that keep `pnpm audit --audit-level high` at exit 0 (the comments there say why). Remove an entry when the package that needs it ships a fixed release, and run `pnpm audit` after every major update.
