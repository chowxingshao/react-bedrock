# Docker

Run the app with **only Docker installed**: no Node.js, no pnpm, no `.env` file.

| Command                                                                          | Result                                                                                                                                                                             |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose up`                                                              | Production build served by nginx at http://localhost:8080, mock API on, no backend or `.env` needed                                                                                |
| `VITE_API_BASE_URL=http://my-api:3000 VITE_ENABLE_MOCKS=false docker compose up` | The same image, pointed at a real API                                                                                                                                              |
| `docker compose --profile dev up`                                                | The production service plus the Vite dev server with hot reload at http://localhost:5173, source mounted from your machine                                                         |
| `docker compose down`                                                            | Stops the production service. After `--profile dev up`, use `docker compose --profile dev down` (or `pnpm docker:down`): without the profile, `down` leaves the dev server running |

- **Shortcuts:**
  - `pnpm docker:up` rebuilds, then starts the production service.
  - `pnpm docker:dev` starts only the dev server. `docker compose --profile dev up` starts the production service too.
  - `pnpm docker:down` stops both. The `node_modules` volume of the dev container stays (about 0.5 GB), so the next `pnpm docker:dev` starts quickly. `docker compose --profile dev down -v` removes it too.
- **After changing code,** add `--build` (`docker compose up --build`). Otherwise Compose reuses the image it built last time. Configuration changes never need a rebuild.
- **Windows PowerShell:** set variables first, then clear them when you're done:

  ```powershell
  $env:VITE_ENABLE_MOCKS = 'false'; docker compose up
  Remove-Item Env:VITE_ENABLE_MOCKS
  ```

- **Settings:** Compose reads an optional `.env` file next to `docker-compose.yml` (not `.env.local`). `.env.example` lists every setting.
- **Security:** the HTTP headers, the Content-Security-Policy, upstream TLS and the container's limits are in docs/security.md. This page covers running the image.

## How runtime configuration works, and why

The image is built **once**, with no environment-specific values in it. At every container start, `docker/docker-entrypoint.sh`:

1. writes `/config.js` with the `VITE_*` variables that are set (whitelisted names only, values JSON-escaped);
2. renders the nginx config: the `/api` proxy when `API_PROXY_TARGET` is set, plus the Content-Security-Policy;
3. starts nginx.

`index.html` loads `/config.js` before the app bundle, and `src/config/env.ts` merges it over the built-in defaults and validates the result. Both files are served with `Cache-Control: no-store`, so a changed setting applies on the next page load.

The payoff: the exact image that passed QA runs in staging and production, and any team can point it at their own API with an environment variable, without rebuilding.

**Everything in `config.js` is public,** because every browser downloads it. Never put secrets in `VITE_*` variables.

## Runtime variables

| Variable                  | Default                     | Used by     | Notes                                                                                                      |
| ------------------------- | --------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `VITE_APP_NAME`           | `React Bedrock`             | browser     | Name in the title and sidebar. Also namespaces browser storage keys                                        |
| `VITE_API_BASE_URL`       | `/api`                      | browser     | The URL the **browser** calls. `/api` means this server (combine with `API_PROXY_TARGET`)                  |
| `VITE_APP_ENV`            | `production`                | browser     | `development`, `staging` or `production`                                                                   |
| `VITE_DEFAULT_LOCALE`     | `en`                        | browser     | `en` or `es`                                                                                               |
| `VITE_DEFAULT_CURRENCY`   | `USD`                       | browser     | ISO 4217 code                                                                                              |
| `VITE_ENABLE_MOCKS`       | `true`                      | browser     | The mock API. **Set `false` for real deployments** (docs/security.md)                                      |
| `VITE_SENTRY_DSN`         | (empty)                     | browser     | Turns on error reporting to Sentry                                                                         |
| `VITE_LOG_LEVEL`          | `warn`                      | browser     | `debug`, `info`, `warn` or `error`                                                                         |
| `VITE_FEATURE_FLAGS`      | (empty)                     | browser     | Comma-separated flags, e.g. `itemsExport`                                                                  |
| `API_PROXY_TARGET`        | (empty)                     | nginx       | The backend that `/api/*` is forwarded to, as reachable **from the container**, e.g. `http://backend:3000` |
| `CONTENT_SECURITY_POLICY` | built-in policy             | nginx       | Replaces the whole CSP header (docs/security.md)                                                           |
| `WEB_PORT` / `DEV_PORT`   | `8080` / `5173`             | Compose     | Host ports                                                                                                 |
| `CHOKIDAR_USEPOLLING`     | `true` in the dev container | Vite        | Poll for file changes (needed for Windows bind mounts)                                                     |
| `APP_VERSION` / `GIT_SHA` | package version / `local`   | image build | Shown in the footer and stored as image labels                                                             |

With `docker run`, pass the same names, for example `docker run -p 8080:8080 -e VITE_ENABLE_MOCKS=false -e API_PROXY_TARGET=http://api.internal:3000 react-bedrock:local`.

## The API proxy (recommended for real backends)

```bash
API_PROXY_TARGET=http://backend:3000 VITE_ENABLE_MOCKS=false docker compose up
```

- The browser calls `/api/*` on the frontend's own origin, and nginx forwards each request **unchanged**. The backend receives `/api/items`, just like with `pnpm dev`'s proxy.
- Same origin means no CORS configuration, and the httpOnly session cookie works without `SameSite=None`. Leave `VITE_API_BASE_URL` at `/api`.
- **Target format:** `http(s)://host[:port]`, with no path and a plain host name (letters, digits, `.`, `-`, `_`; brackets for an IPv6 address). The container refuses to start otherwise.
- **HTTPS backends:** nginx verifies the backend's certificate. A self-signed or private-CA certificate is refused (`/api/` answers `502`) until you add your CA: see "Upstream TLS" and "Private certificate authority" in docs/security.md.
- **DNS:** nginx resolves the host when the container starts, so the backend must be running by then. Use `depends_on` in the same Compose project.
- **Headers:** nginx adds `X-Forwarded-For`, `X-Forwarded-Proto` and `X-Forwarded-Host` (and `X-Real-IP`), so the backend can build correct URLs and Secure cookies. Configure the backend to trust the proxy.
- **Request size:** request bodies over 1 MB get `413` (docs/security.md, "Request size").

**Calling an API directly** (`VITE_API_BASE_URL=https://api.example.com`) works too, and the CSP allows that origin automatically. But:

- The API must allow CORS from the frontend's origin, with credentials and the `X-Request-Id` and `Accept-Language` headers.
- A cookie session only works when both share a site, or when the cookie is `SameSite=None; Secure`.
- The URL must be reachable from the user's browser, not just from the container.

## A backend in the same Compose file

Uncomment the `backend` example at the bottom of `docker-compose.yml`, set its image and port, and add `depends_on: [backend]` to `web`. Then start with:

```bash
API_PROXY_TARGET=http://backend:3000 VITE_ENABLE_MOCKS=false docker compose up
```

## A backend in another Compose project

Services reach each other by name when they share a network.

1. Find the other project's network with `docker network ls`; it is usually `<folder>_default`.
2. Uncomment the `networks` example at the bottom of `docker-compose.yml` and set that name.
3. Use the other project's service name:

   ```bash
   API_PROXY_TARGET=http://their-api:3000 VITE_ENABLE_MOCKS=false docker compose up
   ```

## The dev container

`docker compose --profile dev up web-dev` (or `pnpm docker:dev`) runs `pnpm dev` inside Node 24:

- Your source is bind-mounted, so edits hot-reload. Vite reloads the page by itself after a change to a locale file.
- `node_modules` lives in a named volume, so the container's Linux dependencies never mix with your machine's. The volume is about 0.5 GB, and `docker:down` keeps it; `docker compose --profile dev down -v` removes it.
- `pnpm install` runs at every start. It is quick when nothing changed; the first start takes a minute or two.
- Settings come from your `.env` / `.env.local` files, exactly as with `pnpm dev`. Variables set in your shell win.
- `API_PROXY_TARGET` is read inside the container, so `localhost` there means the container itself. A backend that runs on your own machine is `http://host.docker.internal:3000` with Docker Desktop.

## Troubleshooting

| Problem                                                                       | Fix                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `port is already allocated`                                                   | Another program uses 8080 or 5173. Use another port: `WEB_PORT=8081 docker compose up` (or `DEV_PORT`), or set it in `.env`                                                                                                             |
| `docker compose down` prints `Resource is still in use`                       | The dev server is still running, because `down` only knows the services of the profiles you name. Run `docker compose --profile dev down` (or `pnpm docker:down`)                                                                       |
| Hot reload ignores edits                                                      | Polling is on by default in the dev container, so check that `CHOKIDAR_USEPOLLING` isn't set to `false`. With Docker Desktop on WSL, a project stored inside the WSL filesystem gets native file events                                 |
| High CPU in the dev container                                                 | On macOS and Linux, file events work without polling: `CHOKIDAR_USEPOLLING=false pnpm docker:dev`                                                                                                                                       |
| A changed setting doesn't show up                                             | Check what the container serves: `curl http://localhost:8080/config.js`. If that is right, something in front (a CDN or proxy) is caching `config.js` or `index.html` and must pass `Cache-Control: no-store` through. Then hard-reload |
| Code changes don't show up                                                    | Rebuild: `docker compose up --build`                                                                                                                                                                                                    |
| API calls return HTML or `405`                                                | Mocks are off, `VITE_API_BASE_URL` is `/api` and no `API_PROXY_TARGET` is set, so nginx answers `/api/*` with the app itself. Set `API_PROXY_TARGET`, or an absolute `VITE_API_BASE_URL`                                                |
| API calls return `502`                                                        | nginx can't reach the backend, or (for an `https://` target) refuses its certificate. `docker compose logs web` names the reason; certificates are in docs/security.md                                                                  |
| Uploads fail with `413`                                                       | nginx accepts request bodies up to 1 MB through `/api/`. Raise the limit as described in docs/security.md                                                                                                                               |
| The container keeps restarting, and its log says `host not found in upstream` | nginx can't resolve the `API_PROXY_TARGET` host at start. Start the backend first (`depends_on`) and check the name and network                                                                                                         |
| The container keeps restarting, and its log says `API_PROXY_TARGET must …`    | Use `http(s)://host[:port]` without a path, and a plain host name                                                                                                                                                                       |
| The container keeps restarting, and its log says `cannot write …/config.js`   | The container's file system is read-only. The entrypoint writes `config.js` at every start and stops rather than serve the settings built into the image. Make that file writable: docs/security.md, "Container image"                  |
| The app is unreachable over IPv6                                              | nginx listens on IPv4 only. Add `listen [::]:8080;` to `docker/nginx.conf.template` (docs/security.md, "IPv4 only")                                                                                                                     |
| The mock API doesn't start when the app is opened from another computer       | Service workers need a secure context: `localhost` or HTTPS. Use `localhost`, put HTTPS in front, or use a real backend with `VITE_ENABLE_MOCKS=false`                                                                                  |
| The browser console reports a CSP violation                                   | Allow the blocked origin with `CONTENT_SECURITY_POLICY` (docs/security.md). The effective policy is in `docker compose logs web`                                                                                                        |
| `pnpm install --frozen-lockfile` fails during the build                       | The lockfile is out of date. Run `pnpm install` locally and commit `pnpm-lock.yaml`                                                                                                                                                     |

The image is about 30 MB (`docker image ls react-bedrock`), runs as a non-root user and reports its health: `docker compose ps` shows `healthy`.

## Cleaning up

`docker compose --profile dev down -v` removes the containers, the network and the dev `node_modules` volume of this project. The images stay until you remove them: `docker rmi react-bedrock:local react-bedrock-dev:local`.
