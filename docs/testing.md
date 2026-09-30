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
- Mocks are cleared and restored after every test (`clearMocks` is on by default in Vitest 5, and `restoreMocks: true` is set).
- `src/test/setup.ts` runs before every test file. It registers the jest-dom matchers and unmounts rendered trees after each test.
