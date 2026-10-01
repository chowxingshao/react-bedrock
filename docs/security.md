# Security

## Browser storage

- Use `localStore` / `sessionStore` from `@/core/storage`, never `localStorage` or `sessionStorage` directly. ESLint enforces this.
- Every key is declared in `src/core/storage/storage-keys.ts` and namespaced with the app prefix, e.g. `react-bedrock:theme`.
- Values are JSON, optionally with a TTL (`{ ttlMs }`) and optionally validated on read (`{ schema }`). Corrupt, expired or mismatched values read as `null`. An unavailable storage (private mode, quota) never throws.
- **Never store auth tokens or personal data in localStorage or sessionStorage.** Any script on the page can read them, so one XSS bug would leak every token. This template authenticates with an **httpOnly session cookie** that JavaScript cannot read at all (docs/auth.md). Only non-sensitive UI preferences are stored: theme, language, sidebar state.

## Cookies

- `cookies` from `@/core/storage` wraps js-cookie with secure defaults: `SameSite=Lax`, `Path=/`, and `Secure` whenever the page is served over HTTPS.
- The auth session cookie is set by the server as `HttpOnly; Secure; SameSite=Lax`. The frontend never reads or writes it.

## Logging and privacy

- Log user **ids** only, never names, emails or other personal data. `logger.setUser()` accepts an id.
- The logger redacts sensitive keys automatically (docs/error-handling-and-logging.md), but don't log secrets on purpose.
- The Sentry transport turns off Sentry's collection of cookies, headers, request bodies and IP addresses, and it strips the query string and fragment from the page and request URLs in events and breadcrumbs. It drops console breadcrumbs, which carry raw arguments the redactor never sees. Nothing else is collected automatically beyond a normal crash report (the error, its stack trace, browser and OS, and the URL path), plus the log context you pass, with sensitive keys redacted. URL paths are sent, so keep secrets and personal data out of them.
- **Server error bodies reach Sentry.** An HTTP failure carries the server's own error `message` as its message, and `details` and `userMessage` travel in the log context, so Sentry receives them in the exception message and in the extras (and as breadcrumb data for warnings), next to the URL path and the rest of the redacted context. The backend must not put personal data or secrets in error bodies.
- The only user info Sentry receives is the id passed to `logger.setUser()`.

## Authentication, CSRF and redirects

- **Session cookie:** the server must set it as `HttpOnly; Secure; SameSite=Lax` (or `Strict`). The frontend can't read it, so XSS can't steal it.
- **CSRF:** `SameSite=Lax` blocks cross-site form posts from carrying the cookie. For defence in depth, have the backend also require a custom header on state-changing requests; every request from the shared client carries `X-Request-Id`, which a cross-site form cannot send. For a double-submit CSRF token instead, Axios's `xsrfCookieName` / `xsrfHeaderName` options work with the shared instance.
- **Open redirects:** `returnTo` is honoured only for same-origin relative paths (`safeReturnTo`).
- **Permissions in the UI are cosmetic.** The API must enforce them.
- **After logout,** the query cache and sessionStorage are cleared, so the next user of a shared computer sees nothing of the previous one.
