# Security

## Browser storage

- Use `localStore` / `sessionStore` from `@/core/storage`, never `localStorage` or `sessionStorage` directly. ESLint enforces this.
- Every key is declared in `src/core/storage/storage-keys.ts` and namespaced with the app prefix, e.g. `react-bedrock:theme`.
- Values are JSON, optionally with a TTL (`{ ttlMs }`) and optionally validated on read (`{ schema }`). Corrupt, expired or mismatched values read as `null`. An unavailable storage (private mode, quota) never throws.
- **Never store auth tokens or personal data in localStorage or sessionStorage.** Any script on the page can read them, so one XSS bug would leak every token. This template authenticates with an **httpOnly session cookie** that JavaScript cannot read at all (docs/auth.md). Only non-sensitive UI preferences are stored: theme, language, sidebar state.

## Cookies

- `cookies` from `@/core/storage` wraps js-cookie with secure defaults: `SameSite=Lax`, `Path=/`, and `Secure` whenever the page is served over HTTPS.
- The auth session cookie is set by the server as `HttpOnly; Secure; SameSite=Lax`. The frontend never reads or writes it.
