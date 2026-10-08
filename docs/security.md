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

- **Session cookie:** the server must set it as `HttpOnly; Secure; SameSite=Lax` (or `Strict`). The frontend can't read it, so XSS can't steal it. This assumes an API that is same-site with the app (the `/api` proxy, or a sibling subdomain). A cross-site API needs `SameSite=None; Secure` and `Access-Control-Allow-Credentials: true` with an explicit allowed origin (not `*`), and then `SameSite` no longer keeps the cookie off cross-site requests, so the CSRF measures below become required.
- **CSRF:** `SameSite=Lax` blocks cross-site form posts from carrying the cookie. For defence in depth, have the backend also require a custom header on state-changing requests; every request from the shared client carries `X-Request-Id`, which a cross-site form cannot send. For a double-submit CSRF token instead, Axios's `xsrfCookieName` / `xsrfHeaderName` options work with the shared instance.
- **Open redirects:** `returnTo` is honoured only for same-origin relative paths (`safeReturnTo`).
- **Permissions in the UI are cosmetic.** The API must enforce them.
- **After logout,** the query cache and sessionStorage are cleared, so the next user of a shared computer sees nothing of the previous one. That holds only when the logout request reaches the server. If it fails (offline, timeout, a 5xx), the app still signs the user out locally and warns them, but the httpOnly cookie is still valid: a reload signs the previous user back in until the server session expires. Keep server session lifetimes short. A cookie without `Max-Age` or `Expires` is dropped when the browser closes, which is what the warning asks the user to do; a persistent cookie lasts until it expires.

## HTTP headers and Content Security Policy (Docker image)

The nginx image (`docker/nginx.conf.template`) sends these headers on every response, error responses included:

| Header                    | Value                                        |
| ------------------------- | -------------------------------------------- |
| `X-Content-Type-Options`  | `nosniff`                                    |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`            |
| `X-Frame-Options`         | `SAMEORIGIN`                                 |
| `Content-Security-Policy` | built at container start, as described below |

The **default policy** (`docker/docker-entrypoint.sh`):

- `script-src 'self'` plus the SHA-256 hash of each inline script in `index.html` (the theme bootstrap). There is no `unsafe-inline` or `unsafe-eval` for scripts, so injected `<script>` tags and inline event handlers don't run.
- `connect-src 'self'` plus the origins of `VITE_API_BASE_URL` and `VITE_SENTRY_DSN` when they are absolute URLs. Pointing the image at another API therefore needs no policy change.
- `style-src 'self' 'unsafe-inline'`, because toast styles are injected at runtime.
- `img-src 'self' data: blob:` and `font-src 'self' data:`.
- `worker-src 'self'`, for the mock API's service worker.
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` and `frame-ancestors 'self'`.

**When it is built.** The hashes are computed during the image build by `scripts/csp-script-hashes.mjs`, because they depend on the `index.html` that the build produces. The rest of the policy is assembled when the container starts, because `connect-src` depends on the runtime variables.

**The app runs under this policy without a violation.** Zod's JIT compiler needs `'unsafe-eval'`, so it is switched off at the top of `src/config/env.ts` (`z.config({ jitless: true })`, guarded by a unit test). A Content Security Policy report in the browser console therefore means a real blocked request: allow its origin in the matching directive.

**Changing it:** set `CONTENT_SECURITY_POLICY` to the full policy; it replaces the default.

- Start from the effective policy the container logs at start-up (`docker compose logs web`).
- Keep the `'sha256-…'` source. Without it the theme script is blocked: the app still works, but flashes the light theme while loading.
- The value must not contain double quotes or `$`.
- **Third-party services** (analytics, fonts, maps): add their origins to the matching directive (`script-src`, `connect-src`, `img-src`, …). Test with the browser console open, where blocked requests are reported.

`pnpm dev` and `pnpm preview` send no CSP, so check policy changes in the Docker image (`docker compose up --build`).

## Runtime configuration is public

- At start-up, the container writes the whitelisted `VITE_*` variables to `/config.js`, which every visitor downloads.
- Server-side settings (`API_PROXY_TARGET`, `CONTENT_SECURITY_POLICY`) are used by nginx and never reach the browser.
- Never pass secrets through `VITE_*` variables.
- **Set `VITE_ENABLE_MOCKS=false` on every real deployment.** Unset means `true`: the image always contains the mock API worker and the demo accounts, so with the variable unset the app answers from the built-in mocks and accepts the demo accounts, with only a console warning.

## Container image

- nginx runs as an unprivileged user (UID 101) on port 8080. The only files it can change are `config.js` and its own server config, which are rewritten at every start.
- A container that cannot write `config.js` (for example on a read-only file system) stops with a `cannot write` message. Serving the `config.js` built into the image would silently ignore every variable, `VITE_ENABLE_MOCKS=false` included. Make that one file writable, for example with a volume mounted at its path.
- The runtime image contains only nginx and the built static files: no Node.js, no source code, no dependencies. It is well under 50 MB (about 31 MB as built from this template).
- A `HEALTHCHECK` probes `/healthz`, and `scripts/docker-smoke-test.sh` checks the whole runtime contract in CI.
- **Request size.** nginx's default limit of 1 MB applies to request bodies sent through `/api/`, and larger ones get `413`. Add `client_max_body_size` to `docker/nginx.conf.template` for uploads.
- **IPv4 only.** The server block says `listen 8080;`. The entrypoint replaces the base image's start-up script, the one that would add an IPv6 listener. A cluster that is IPv6-only needs `listen [::]:8080;` as well.
- **Base images are floating tags** (`node:24-alpine` and `nginxinc/nginx-unprivileged:stable-alpine-slim`, no digest). Each build picks up the latest patch release, so builds are not byte-for-byte reproducible. The pnpm version is exact: the Dockerfile installs the one pinned in `package.json#packageManager`. Pin the base images by digest if you need reproducible builds, and update the digests yourself, since Dependabot cannot bump a moving tag.
