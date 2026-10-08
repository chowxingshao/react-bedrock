# Deployment

## Automation (`.github/`)

| File                           | Runs on                                                  | What it does                                                                                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workflows/ci.yml`             | every pull request and every push to `main`              | Lint, typecheck, tests with coverage, build, generated-client drift check, every generator, Playwright E2E, and the Docker build with smoke test. Uploads coverage and the Playwright report (docs/contributing.md) |
| `workflows/docker-publish.yml` | every published release, or manually                     | Builds the image for `linux/amd64` and `linux/arm64` and pushes it to GitHub Container Registry                                                                                                                     |
| `workflows/deploy.yml`         | push to `main` → staging; published release → production | **Placeholder.** Builds, then warns where the deploy step goes. Skipped until the repository variable `DEPLOY_ENABLED` is `true`                                                                                    |
| `workflows/storybook.yml`      | push to `main`, or manually                              | Builds Storybook, and publishes it to GitHub Pages when the repository variable `STORYBOOK_PAGES` is `true`                                                                                                         |
| `dependabot.yml`               | weekly                                                   | Grouped updates for dependencies, GitHub Actions and base images (configuration for Dependabot, not a workflow)                                                                                                     |

The shared setup lives in `.github/actions/setup`: pnpm from `package.json`, Node.js from `.nvmrc`, and a cached install.

Two repository variables switch on the optional parts (Settings → Secrets and variables → Actions → Variables). Without them the repository still builds and tests:

| Variable          | Switches on                          | Also needs                                              |
| ----------------- | ------------------------------------ | ------------------------------------------------------- |
| `DEPLOY_ENABLED`  | the `deploy` job of `deploy.yml`     | your deploy step (see "Wiring up `deploy.yml`")         |
| `STORYBOOK_PAGES` | publishing Storybook to GitHub Pages | "GitHub Actions" as the Pages source (Settings → Pages) |

`ci.yml` and `docker-publish.yml` need no variable and no secret of your own.

## One build, every environment

Builds contain no environment-specific values. Each deployment supplies its settings at runtime:

| Deployed as                            | Where the settings come from                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| The Docker image                       | Environment variables on the container, written to `config.js` at start (docs/docker.md) |
| Static files (object storage + CDN, …) | A `config.js` that your deploy step writes next to `index.html`                          |

So one artifact can be promoted unchanged from staging to production. As shipped, the workflows do not do that: `deploy.yml` runs its own build for every push to `main` and every release (once `DEPLOY_ENABLED` is `true`), and `docker-publish.yml` builds only for a release or a manual run. When you wire up the deploy step, promote the same `sha-<commit>` image (a manual run of `docker-publish.yml` pushes one for any branch) or one `dist` artifact instead of building again.

**Set `VITE_ENABLE_MOCKS=false` on every real deployment.** Unset means `true`: the app then answers from the built-in mock API and accepts the demo accounts, with only a console warning. The image always contains the mock worker and the demo accounts. The variable decides whether they run, and the mock chunk (about 400 kB) is downloaded only when they do.

Typical settings:

| Variable            | Staging                                                | Production               |
| ------------------- | ------------------------------------------------------ | ------------------------ |
| `VITE_APP_ENV`      | `staging`                                              | `production`             |
| `VITE_ENABLE_MOCKS` | `false`                                                | `false`                  |
| `VITE_API_BASE_URL` | `/api` with `API_PROXY_TARGET`, or the staging API URL | the same, for production |
| `VITE_SENTRY_DSN`   | your DSN                                               | your DSN                 |
| `VITE_LOG_LEVEL`    | `info`                                                 | `warn`                   |

## Images (GitHub Container Registry)

Publishing the GitHub release `v1.4.0` pushes `ghcr.io/<owner>/<repo>` with the tags `1.4.0`, `1.4`, `latest` and `sha-<commit>`. Run one anywhere:

```bash
docker run -p 8080:8080 -e VITE_ENABLE_MOCKS=false -e API_PROXY_TARGET=http://api.internal:3000 ghcr.io/<owner>/<repo>:1.4.0
```

- The workflow needs no secret: it uses the built-in `GITHUB_TOKEN`.
- New container packages can start out private. Check the visibility in the package settings, or run `docker login ghcr.io` before pulling.

## Releasing

1. Set `version` in `package.json` (e.g. `1.4.0`) and commit `chore(release): 1.4.0`. The app footer shows this version.
2. Publish a GitHub release tagged `v1.4.0`.
3. `docker-publish.yml` pushes the image, and `deploy.yml` deploys it to production once it is configured.

**Rollback:** redeploy the previous version's image or build. Published versions never change.

## Wiring up `deploy.yml`

1. Replace the placeholder step with your platform's deploy command.
2. Store the platform's credentials as environment secrets under Settings → Environments (`staging` and `production`).
3. Set the repository variable `DEPLOY_ENABLED` to `true` (Settings → Secrets and variables → Actions → Variables).
4. Optionally, add required reviewers to the `production` environment, so releases wait for an approval.

**Containers** (Kubernetes, ECS, Cloud Run, a VM with Docker, …): deploy the image from `docker-publish.yml`. Set the `VITE_*` variables on the service, plus `API_PROXY_TARGET` if you use the proxy.

**Static hosting:** upload `dist/`, then write the environment's `config.js` next to `index.html`:

```js
window.__APP_CONFIG__ = {
  VITE_APP_ENV: 'staging',
  VITE_API_BASE_URL: 'https://api.staging.example.com',
  VITE_ENABLE_MOCKS: 'false',
};
```

Then configure the host to:

- serve `index.html` and `config.js` with `Cache-Control: no-store`, and `/assets/*` with `Cache-Control: public, max-age=31536000, immutable`;
- answer unknown paths with `index.html` (client-side routing);
- send the security headers from `docker/nginx.conf.template`, including a Content-Security-Policy (docs/security.md). There is no entrypoint to compute the inline-script hash, so get it with `node scripts/csp-script-hashes.mjs dist/index.html`.
