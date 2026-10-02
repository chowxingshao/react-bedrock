# Routing

React Router v8, in data mode (`createBrowserRouter`). The tree lives in `src/app/router.tsx`:

```
/ (RootLayout: document title, scroll restoration, navigation progress, focus; errorElement)
├── index → redirect to /dashboard
├── guest layout (RequireGuest + AuthLayout)
│   └── /login
└── app layout (RequireAuth + AppShell)
    └── page group (element: PageBoundary = AsyncBoundary; errorElement: RouteError, inside the shell)
        ├── /dashboard
        ├── /items, /items/new, /items/:itemId, /items/:itemId/edit (the reference feature, src/features/example)
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

## Where to fetch data

Fetch in components, through TanStack Query (docs/data-fetching.md), not in route `loader`s. `createBrowserRouter` runs when `router.tsx` is imported, before the mock worker starts and before `AuthProvider` registers the HTTP auth adapter, so a loader's request would skip the mocks, `withCredentials` and the refresh flow.

## Adding a page

The page generator (`pnpm gen page`, planned) will do this for you. By hand:

1. Add a builder to `src/config/paths.ts`.
2. Create `src/app/routes/<name>.tsx` that exports `function Component()`, the lazy-route convention. Keep it thin and delegate to a feature.
3. Add the route under `// plop:routes` in `router.tsx`, with `lazy: () => import('./routes/<name>')` and `handle: titled((i18n) => i18n.t('…'))` for the translated tab title.
4. Optionally, add a sidebar entry to `src/app/navigation.ts` (label key, icon, path, required permission).

## Guards

| Guard                                           | Effect                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `<RequireAuth>`                                 | Signed-out users go to `/login?returnTo=<where they were>` and come back after signing in   |
| `<RequireGuest>`                                | Signed-in users are sent from login to `returnTo` (only same-origin paths) or the dashboard |
| `<RequirePermission permission="items.create">` | Renders the 403 state without the permission                                                |

Guards wrap an `<Outlet />` by default, or take children. `returnTo` always goes through `safeReturnTo` before anyone navigates to it (docs/security.md); the login page does not navigate by itself, `<RequireGuest>` does it once the session is set.

## Tab title, scroll and focus

`RootLayout` handles these for every page:

- **Title:** the deepest route with a `handle.title` sets the tab title to `<title> · <app name>`. The title is a function of the i18next instance, so it follows the language.
- **Scroll:** `<ScrollRestoration />` scrolls to the top on a new page and restores the position on back and forward.
- **Focus:** after a link click, a `navigate()` call or the back button to a different path, focus moves to the new page's `<main id="main-content">` (`AppShell` and `AuthLayout` both render it with `tabIndex={-1}`), so keyboard and screen reader users start at the content. The first load and redirects (`replace`) leave focus alone, which keeps "Skip to main content" the first Tab stop. A change that only touches the query string does not move focus.

## Loading and errors

- **Lazy chunks:** the first page load shows `PageLoader`; later navigations show a thin progress bar.
- **Suspense:** pages may call `useSuspenseQuery`. `PageBoundary` (`src/app/routes/page-boundary.tsx`), the element of the page group, wraps every page in an `AsyncBoundary` that resets on navigation.
- **Page errors:** a page that throws while it renders, or a `useSuspenseQuery` that fails, shows `ErrorState` inside the shell with **Try again** (it resets the failed queries and renders the page again) and **Reload page**. The error clears when the user navigates to another page.
- **Router errors:** the page group's `errorElement` (`RouteError`) handles what only the router sees: a page chunk that fails to load, a thrown `Response` (a 404 renders the "not found" state) and a loader or action error. It is logged, and shows **Reload page**, which also fixes chunks that went stale after a deploy.

The boundary has to sit below the router's `errorElement`: the router wraps the subtree of a route that has an `errorElement` in its own boundary, which would otherwise catch page errors before `PageBoundary` could offer **Try again**.

## URL state

Put filters, search, sort, page and tab in the URL, not in component state (the other shared hooks are listed in docs/hooks.md):

- `useUrlState(shape)`: typed search params, with invalid values falling back to defaults. Define `shape` at module level, with one Zod schema per parameter (`z.coerce.number()` for numbers); `setState(update, { replace })` replaces the history entry by default.
- `usePagination()`: `?page=&pageSize=` ↔ DataTable pagination; call `resetPage()` when filters or search change.

A search box keeps its own text and writes `q` to the URL once typing pauses (`useDebouncedCallback`, `SEARCH_DEBOUNCE_MS`). Typing adds no history entries for two reasons: the debounce turns a burst of keystrokes into one write, and `setState` replaces the current entry by default. That one write also resets the page, in the same `setState` call, so `q` and the page can never be out of step. When the URL changes by other means (Back, Forward, a link), show the URL's value in the box. A list also has to cope with a page past the end (a stale link, or the last row of the last page was just deleted): move to the last page that exists, as `ItemsListPage` does.

Writes made in the same tick build on each other, even from different hook instances, so `setState({ q })` followed by `resetPage()` in one handler keeps both. Compute the whole update first and call `setState` once; a write made after an `await` in the same handler starts from the last rendered URL and can drop an earlier write.

## Unsaved changes

`useUnsavedChangesWarning(when)` asks for confirmation before the user leaves a page with unsaved changes: in-app navigation to another path shows a Leave / Stay dialog, and closing or reloading the tab shows the browser's own prompt. Changes that keep the same path (a tab in the query string) pass.

```tsx
useUnsavedChangesWarning(form.formState.isDirty);
```

After **Leave**, focus goes to the new page's main content, like any other navigation; **Stay** returns focus to the link that was clicked. (`ConfirmProvider` gives focus back to the element that opened a dialog only if nothing else has taken it meanwhile.) Signing out does not ask: it unmounts the page before any navigation, so unsaved changes are lost.

The guard blocks for as long as `when` is `true`, so a save that ends in a navigation has to turn it off first. The reference form does not use the snippet above: it passes `isDirty && !isSubmitting` and navigates from inside its submit handler, because `isSubmitting` has already rendered by then and the guard is off (the pattern is in docs/forms.md, "Server errors, submitting, and leaving with unsaved changes"). With a plain `isDirty`, set `when` to `false` after the save and navigate once that has rendered (from an effect or the next event): navigating in the same handler that clears it still sees the old value and opens the dialog.
