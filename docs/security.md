# Security

Decisions at a glance:

| Topic              | Decision                                                                                  | Details                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Auth token storage | An httpOnly session cookie set by the server. No tokens in JavaScript or browser storage  | [Browser storage](#browser-storage), [auth.md](auth.md)                                                                      |
| CSRF               | `SameSite=Lax` cookie, plus a custom header on every request that the backend can require | [Authentication, CSRF and redirects](#authentication-csrf-and-redirects)                                                     |
| XSS                | React escaping, no raw HTML, and a strict script CSP in the Docker image                  | [XSS](#xss), [HTTP headers](#http-headers-and-content-security-policy-docker-image)                                          |
| Secrets            | None in the frontend: `VITE_*` values are public                                          | [Secrets and configuration](#secrets-and-configuration), [Runtime configuration is public](#runtime-configuration-is-public) |
| Logging            | User ids only, with automatic redaction                                                   | [Logging and privacy](#logging-and-privacy)                                                                                  |
| Dependencies       | A committed lockfile, reviewed install scripts, a one-day release delay                   | [Dependencies and supply chain](#dependencies-and-supply-chain)                                                              |

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
- **After logout,** the query cache and sessionStorage are cleared, so the next user of a shared computer sees nothing of the previous one. That holds only when the logout request reaches the server. If it fails (offline, timeout, a 5xx), the app still signs the user out locally and warns them, but the httpOnly cookie may still be valid: a reload can sign the previous user back in until the server session expires. Keep server session lifetimes short. A cookie without `Max-Age` or `Expires` is dropped when the browser closes, which is what the warning asks the user to do; a persistent cookie lasts until it expires.

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

**The app runs under this policy without a violation.** Zod's JIT compiler needs `'unsafe-eval'`, so it is switched off at the top of `src/config/env.ts` (`z.config({ jitless: true })`). It must run before the first `z.object` is built: `main.tsx` imports `@/core/i18n`, which loads `@/config/env` first. Keep it that way: the unit test checks the flag, not the order, so a module that builds a schema at import time ahead of `@/config/env` brings back one CSP report per page load. A Content Security Policy report in the browser console therefore means a real blocked request: allow its origin in the matching directive.

**Changing it:** set `CONTENT_SECURITY_POLICY` to the full policy; it replaces the default.

- Start from the effective policy the container logs at start-up (`docker compose logs web`).
- Keep the `'sha256-…'` source. Without it the theme script is blocked: the app still works, but flashes the light theme while loading.
- The value must not contain double quotes, `$`, backslashes or control characters (line breaks included): the container refuses to start with a message, because nginx would read them as part of its own configuration.
- **Third-party services** (analytics, fonts, maps): add their origins to the matching directive (`script-src`, `connect-src`, `img-src`, …). Test with the browser console open, where blocked requests are reported.

`pnpm dev` and `pnpm preview` send no CSP, so check policy changes in the Docker image (`docker compose up --build`).

## Runtime configuration is public

- At start-up, the container writes the whitelisted `VITE_*` variables to `/config.js`, which every visitor downloads.
- Server-side settings (`API_PROXY_TARGET`, `CONTENT_SECURITY_POLICY`) are used by nginx and never reach the browser.
- Never pass secrets through `VITE_*` variables.
- **Set `VITE_ENABLE_MOCKS=false` on every real deployment.** Unset means `true`: the image always contains the mock API worker and the demo accounts, so with the variable unset the app answers from the built-in mocks and accepts the demo accounts. Nothing makes this visible: the app logs a warning, but a production build's console prints errors only (Sentry, when configured, gets it as a breadcrumb), and the login page lists the demo accounts.

## Container image

- nginx runs as an unprivileged user (UID 101) on port 8080. UID 101 can write `config.js`, its configuration under `/etc/nginx`, and its cache and temp folders (`/var/cache/nginx` and `/tmp`). The app's other files (the static files, the nginx template and the CSP hashes) are root-owned and read-only to it. The entrypoint rewrites `config.js` and the server config at every start.
- A container that cannot write `config.js` (for example on a read-only file system) stops with a `cannot write` message. Serving the `config.js` built into the image would silently ignore every variable, `VITE_ENABLE_MOCKS=false` included. Make that one file writable, for example with a volume mounted at its path.
- The runtime image contains only nginx and the built static files: no Node.js, no source code, no dependencies. It is well under 50 MB (about 31 MB as built from this template).
- A `HEALTHCHECK` probes `/healthz`, and `scripts/docker-smoke-test.sh` checks the whole runtime contract in CI.
- **The API proxy target is validated.** `API_PROXY_TARGET` must be `http://host[:port]` or `https://host[:port]`: no path, and a host of letters, digits, `.`, `-`, `_`, `:` and `[]` only. Anything else, a line break included, stops the container with a message, because nginx would read the value as part of its own configuration.
- **Upstream TLS (`API_PROXY_TARGET=https://…`).** Session cookies and login requests travel over this hop, so nginx verifies the upstream's certificate against the image's CA bundle, `/etc/ssl/certs/ca-certificates.crt` (the public root certificates of the base image, up to a chain depth of 3). The certificate must also match the host name in `API_PROXY_TARGET`. A certificate that does not verify (self-signed, expired, wrong name, unknown CA) is refused: `/api/` answers `502` and the container log says `upstream SSL certificate verify error` or `does not match`. An `http://` target is neither encrypted nor verified, so use it only on a network you trust.
- **Private certificate authority.** The image has no setting for extra CAs. nginx reads the bundle file when it starts, so you can replace that file: mount a PEM file over `/etc/ssl/certs/ca-certificates.crt` (read-only is fine; UID 101 must be able to read it). Start from the image's own bundle and append your CA's certificate: `docker run --rm --entrypoint cat react-bedrock:local /etc/ssl/certs/ca-certificates.crt > bundle.pem`, then `cat my-ca.pem >> bundle.pem`, then `docker run -v "$PWD/bundle.pem:/etc/ssl/certs/ca-certificates.crt:ro" -e API_PROXY_TARGET=https://… react-bedrock:local`. Your upstream's certificate needs the host name from `API_PROXY_TARGET` as a subject alternative name. The bundled roots only change when you rebuild the image on a newer base image.
- **Request size.** nginx's default limit of 1 MB applies to request bodies sent through `/api/`, and larger ones get `413`. Add `client_max_body_size` to `docker/nginx.conf.template` for uploads.
- **IPv4 only.** The server block says `listen 8080;`. The entrypoint replaces the base image's start-up script, the one that would add an IPv6 listener. A cluster that is IPv6-only needs `listen [::]:8080;` as well.
- **Base images are floating tags** (`node:24-alpine` and `nginxinc/nginx-unprivileged:stable-alpine-slim`, no digest). A build uses whatever the tag points to when the builder pulls it: `docker build --pull` always fetches the current image, a builder that already has the image may keep using its copy, and a fresh CI builder pulls the current one. Builds are therefore not byte-for-byte reproducible. The pnpm version is exact: the Dockerfile installs the one pinned in `package.json#packageManager`. Pin the base images as `image:tag@sha256:…` if you need reproducible builds; Dependabot then proposes digest updates.

## XSS

- React escapes every value it renders. Never use `dangerouslySetInnerHTML` with data you don't control; the template itself renders no raw HTML. If you must render user-supplied HTML, sanitise it first. A sanitiser such as DOMPurify is a new dependency, so add it deliberately (see [Dependencies and supply chain](#dependencies-and-supply-chain)).
- i18next runs with `escapeValue: false` because React already escapes. Translations are rendered as text, never as HTML: don't pass a translated string to `dangerouslySetInnerHTML`, because its interpolated values are not escaped.
- Check the scheme before building an `href` or `src` from user input, because `javascript:` URLs execute. Internal links use `paths.*`, and a `returnTo` redirect goes through `safeReturnTo` (see [Authentication, CSRF and redirects](#authentication-csrf-and-redirects)).
- The Docker image's CSP allows only this origin's scripts plus the hashed theme script, so injected `<script>` tags and inline event handlers don't run (see [HTTP headers and Content Security Policy](#http-headers-and-content-security-policy-docker-image)). `pnpm dev` and `pnpm preview` send no CSP.

## Secrets and configuration

- The frontend holds **no secrets**. Every `VITE_*` value is downloaded by every visitor, whether it is built in or written to `config.js` at container start (see [Runtime configuration is public](#runtime-configuration-is-public)).
- API keys for third-party services belong on the backend: the frontend calls your API, and your API calls the service.
- `.env` and `.env.*` files are git-ignored and kept out of the Docker build context. The one exception is `.env.example`, which holds no secrets.
- CI and deployment credentials live in GitHub, as repository or environment secrets (see [Wiring up deploy.yml](deployment.md#wiring-up-deployyml)). Never in the repository.

## Dependencies and supply chain

- `pnpm-lock.yaml` is committed, and CI and Docker install with `--frozen-lockfile`, so builds use exactly the reviewed versions.
- Dependency install scripts run only when allowed in `pnpm-workspace.yaml` (`allowBuilds`). pnpm fails the install on any new one, so each is reviewed before it runs.
- pnpm waits a day before installing a newly published version (`minimumReleaseAge`): when it resolves a dependency, it takes the newest release that is at least a day old. This blocks most attacks that rely on a compromised release.
- Dependabot proposes updates weekly. Read the changelog before merging a major update.
- Add dependencies deliberately: prefer the existing wrappers, and check a package's maintenance and its size (`pnpm analyze`) first.
- **Audit.** CI does not run `pnpm audit`: run `pnpm audit --audit-level high` before a release and after every major update. One advisory is ignored on purpose, `GHSA-vfj7-8cjw-p6xm` (`auditConfig.ignoreGhsas` in `pnpm-workspace.yaml`): it is in `braces`, which only the `plop` generator CLI reaches, and no patched release exists. Remove the entry when one does (see [Dependency updates](contributing.md#dependency-updates)).
- **Overrides.** The `overrides` block in `pnpm-workspace.yaml` forces patched releases of two transitive dependencies of development and build tooling: `seroval` (through the Query devtools) and `source-map-js` (through PostCSS). Each stays within its patched major (`^`), so a future major is never forced onto the packages that use it. Remove an override when the package that pulls it in ships a fixed range.
