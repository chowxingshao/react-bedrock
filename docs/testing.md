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
- `src/test/setup.ts` runs before every test file. It registers the jest-dom matchers and stubs the browser APIs jsdom lacks but Radix primitives and the theme code use (`ResizeObserver`, `matchMedia`, the pointer-capture methods and `scrollIntoView`). Before each test it resets the i18n language to `en`, because the app starts in `VITE_DEFAULT_LOCALE` and Vitest loads your `.env.local`; a test therefore never depends on that setting. After each test it unmounts rendered trees and clears `localStorage` / `sessionStorage`, so a test may change any of them without cleaning up.

## The provider-aware `render`

Prefer `@/test/render` when the component needs providers (it wraps a `QueryClientProvider` and a `ConfirmProvider`, so components that call `useConfirm()` work). Earlier tests import Testing Library directly, and that stays valid for components that need no providers:

```tsx
import { render, screen } from '@/test/render';

const { queryClient } = render(<ItemsPage />); // wrapped in QueryClientProvider (retries off) and ConfirmProvider
```

`createTestQueryClient()` gives you a client with retries off and no garbage collection, for tests that need one directly.
