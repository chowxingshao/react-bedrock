# Authentication and permissions

## Flow (httpOnly cookie session)

1. **App start:** `AuthProvider` calls `GET /auth/me` and shows a full-page loader until it answers. 200 fills the session store with the user and permissions; 401 means "signed out".
   An anonymous visitor costs one extra request: the 401 from `/auth/me` triggers one `POST /auth/refresh` (it restores a user whose short-lived session cookie expired but who can still refresh), which is refused too. The visitor sees the login page, and the logger records two `warn` entries. In development, StrictMode runs the start-up effect twice, so you will see two of each request and four `warn` entries; a production build makes one of each and logs two.
2. **Login:** `POST /auth/login`. The server sets an **httpOnly** session cookie; the frontend never sees a token. The user returns to `returnTo`.
3. **Every request:** the browser attaches the cookie. The strategy sets `withCredentials`, which lets a cross-origin API receive it, but only a same-site one (the `/api` proxy, or a sibling subdomain) gets a `SameSite=Lax` cookie. A cross-site API needs the cookie set with `SameSite=None; Secure`, and must answer with `Access-Control-Allow-Credentials: true` and an explicit `Access-Control-Allow-Origin` (not `*`); see docs/security.md for what that does to CSRF protection.
4. **401:** the HTTP layer calls `POST /auth/refresh` **once**, even for many concurrent requests (and not again for a request that was already in flight when it finished), then retries each request once. If the refresh is refused, the session is cleared once and `<RequireAuth>` redirects to login. If it fails for a transient reason (offline, timeout, a 5xx), the session is kept and the request fails with that error.
5. **Logout:** `POST /auth/logout`, then the session store, the whole query cache and the app's sessionStorage keys are cleared. If the logout request itself fails (offline, timeout, a 5xx), the app still forgets the user and logs a warning, and it shows a warning toast (`auth.signOutIncomplete`): "You're signed out here, but we couldn't reach the server." The server never heard about the logout, so the httpOnly session cookie stays valid until it expires, and a reload signs the user back in. Keep server session lifetimes short (docs/security.md). There is no automatic retry of the logout request.

Backend endpoints the template expects (the MSW mocks implement them):

- `POST /auth/login {email,password}` → 200 user, or 401 `{code:'INVALID_CREDENTIALS'}`
- `POST /auth/logout` → 204
- `GET /auth/me` → 200 user, or 401
- `POST /auth/refresh` → 204, or 401
- A user is `{ id, name, email, permissions: string[] }`.
- **Reserve 401 for "not signed in".** The HTTP layer treats every 401 from an ordinary endpoint as an expired session: it refreshes, retries once, and if the retry is a 401 too it signs the user out. An endpoint that answers 401 for another reason (say a wrong current password when changing a password) would therefore end the session. Answer 403 or 422 there, or send that one request with `{ skipAuthRefresh: true }` (docs/data-fetching.md).

## Using auth in components

```tsx
const { user, isAuthenticated, hasPermission, login, logout } = useAuth();

<Can permission="items.create">
  <Button>{t('items:actions.create')}</Button>
</Can>;
```

- Guards: see docs/routing.md.
- Sidebar entries take a `permission` and are hidden without it.
- Permissions are listed in `src/config/permissions.ts` (`<resource>.<action>`). Permissions the server sends that the frontend doesn't know are ignored.
- **The server is the real authority.** Frontend checks only decide what to show.

## Switching strategy (e.g. bearer tokens)

Everything strategy-specific is behind `AuthStrategy` (`src/core/auth/types.ts`). To switch:

1. Write `src/core/auth/token-strategy.ts` implementing `login`, `logout`, `fetchCurrentUser`, `refresh` and `prepareRequest`. `prepareRequest` sets `Authorization: Bearer <token>` from an in-memory variable, never localStorage (docs/security.md). `refresh` exchanges the refresh token.
2. Change the one export in `src/core/auth/strategy.ts`.

Guards, `useAuth` and the interceptors use only the interface, so they do not change. The tests do: `src/test/render.tsx` and the mock handlers (`src/mocks/handlers`) sign users in through the session cookie and `mockDb`, so a token strategy needs matching changes there (for example, handlers that read the `Authorization` header).

## Demo accounts (mock API only)

| Email              | Password | Permissions          |
| ------------------ | -------- | -------------------- |
| admin@example.com  | demo1234 | all item permissions |
| viewer@example.com | demo1234 | items.read           |
