# State management

Pick the home for a piece of state with this table (spec Principle 3):

| Kind of state                              | Where it lives                                                | Examples                                      |
| ------------------------------------------ | ------------------------------------------------------------- | --------------------------------------------- |
| Server data                                | **TanStack Query** (docs/data-fetching.md)                    | lists, details, anything from the API         |
| View state someone might bookmark or share | **The URL**: `useUrlState`, `usePagination` (docs/routing.md) | filters, search, page, sort, active tab       |
| App-wide UI and session state              | **Zustand**, in `src/stores/`                                 | theme, sidebar collapsed, the signed-in user  |
| Form state                                 | **React Hook Form** (docs/forms.md)                           | field values, dirty and touched state, errors |
| Everything else                            | `useState` / `useReducer` in the component                    | open/closed, hover, a local draft             |

## Rules

- **Never copy query data into a store.** Read it with `useQuery` where you need it; the cache is the store.
- **Subscribe through selector hooks** (`useThemeMode()`, `useSidebarCollapsed()`), never to a whole store. Each store file exports its selectors.
- **Persist only what must survive a reload**, through the storage wrapper: `persist(..., { storage: createZustandStorage(localStore), partialize })`. Never persist tokens or personal data (docs/security.md).
- **Validate what you read back.** Browser storage is user-editable and outlives releases, so give a persisted store a `merge` function that accepts each stored field only if it has the right type and falls back to the default otherwise (see `theme-store` and `ui-store`).
- Stores use the Redux DevTools extension in development (the `devtools` middleware).
- Tests start from a clean slate: `src/test/setup.ts` resets every store to its initial state after each test. Add a new store to that list (docs/testing.md).

## The stores

| Store           | Holds                                                                                      | Persisted                      |
| --------------- | ------------------------------------------------------------------------------------------ | ------------------------------ |
| `theme-store`   | light / dark / system                                                                      | yes (`theme`)                  |
| `ui-store`      | sidebar collapsed, mobile nav open                                                         | only `sidebarCollapsed` (`ui`) |
| `session-store` | status (`unknown` / `authenticated` / `anonymous`) and the signed-in user with permissions | **no**                         |

**Why the user lives in a store:** it is the identity of the current session, not cached server data. `AuthProvider` sets the store after `/auth/me` or login and clears it on logout or expiry; route guards and `hasPermission()` (from `useAuth()`) read it synchronously. On reload, the httpOnly cookie plus `/auth/me` rebuild it, so it never touches browser storage.

## Permissions

`src/config/permissions.ts` lists every permission the UI checks, named `<resource>.<action>` (`items.read`). `SessionUser.permissions` is typed with it, so a typo fails `pnpm typecheck`. The server decides what is really allowed; these only decide what the UI shows.

## Adding a store

Run `pnpm gen store <name>` (docs/generators.md): it creates `src/stores/<name>-store.ts` with selector hooks, and a test. Then add the new store to the reset list in `src/test/setup.ts`; the generator does not touch that file. To persist the store, follow `src/stores/ui-store.ts`.
