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
