# Starting a new project from this template

Work through this list from top to bottom. Each step ends with something you can check. The commands are for a POSIX shell (on Windows, Git Bash).

## 1. Create the repository

- On GitHub, click **Use this template** on the template repository. That gives you a fresh history; the template must be marked under Settings → General → Template repository.
- Or clone it without history:

  ```bash
  git clone --depth 1 <template-url> my-app
  cd my-app
  rm -rf .git
  git init -b main
  ```

- Delete `docs/superpowers/`. It holds the plan the template was built from, which a new project doesn't need.
- Before you change anything, check that everything works:

  ```bash
  pnpm install
  pnpm lint && pnpm typecheck && pnpm test
  ```

- Commit this starting point. Later steps use `git grep`, which searches only tracked files. The commit hooks lint every file, so this first commit takes a few minutes:

  ```bash
  git add -A
  git commit -m "chore: start from the template"
  ```

## 2. Name the app

1. In `package.json`, set `name`. The `version` starts at `0.1.0`; the app footer shows it.
2. Set `VITE_APP_NAME` in your `.env` files and in each environment's settings. That alone changes the tab title, the sidebar, the login page and the browser-storage prefix.
3. To change the built-in default name as well, replace every "React Bedrock" and "react-bedrock":

   ```bash
   git grep -n -i -e "react bedrock" -e "react-bedrock" -- . ":!src/api/generated" ":!docs"
   ```

   - The matches are in `src/config/env.ts` (the default), `index.html` (the title and the theme script's fallback), `.env.example`, `docker-compose.yml` (the image names), the `Dockerfile` label and comment, `package.json`, `openapi/openapi.yaml`, `.github/workflows/ci.yml`, `playwright.config.ts`, `scripts/docker-smoke-test.sh` and a few tests (`src/config/env.test.ts`, `src/core/storage/prefix.test.ts`, `e2e/navigation.spec.ts`).
   - The storage prefix is the app name in lower case with dashes (`Trial App` gives `trial-app:`). Update the examples that show it (`src/core/storage/prefix.ts`, `.env.example`).
   - `src/stores/theme-bootstrap.test.ts` fails until `index.html` and `src/config/env.ts` agree.
   - The title in `openapi/openapi.yaml` is copied into the generated clients: run `pnpm codegen:api` after you change it, or CI reports `src/api/generated` as out of date.
   - `docs/` and `README.md` name the template in prose and in examples (`react-bedrock:local`, `react-bedrock:theme`): step 9 covers them.

4. Replace `public/favicon.svg`.

Check: `pnpm dev` shows your name in the tab and in the sidebar, and `pnpm test` passes.

## 3. Brand it

Edit only `src/styles/tokens.css` (docs/design-system.md → How to rebrand):

- `--primary` and `--primary-foreground`, in the light, dark and fallback blocks
- `--radius`
- the font: put the font files in `public/fonts/`, add an `@font-face` rule to `tokens.css`, and put the family first in `--font-sans`

Keep text contrast at 4.5:1 or more, and `--ring` at 3:1 or more. Then run `pnpm format`, because the lint step checks the file with Prettier.

Check: `pnpm storybook` shows every component in the new look, in light and dark. `pnpm test` passes (it checks that the fallback block matches the dark one), and so does `pnpm test:e2e`, whose axe checks catch contrast problems (the first time, install its browser: `pnpm exec playwright install chromium`).

## 4. Languages and currency

- Set the defaults with `VITE_DEFAULT_LOCALE` and `VITE_DEFAULT_CURRENCY`.
- To add a language, follow docs/i18n.md → Adding a language. To remove one, follow docs/i18n.md → Removing a language.
- Removing `es` leaves tests that use Spanish as their second language. `pnpm typecheck` lists five of them, and ESLint two lines (`language-switcher.test.tsx:27`, `start-language.test.ts:71`), but `pnpm test` fails in thirteen files, because most of them switch the language through a plain string. Find them all, together with the two E2E specs:

  ```bash
  git grep -l -E "'es'|\"es\"|Español" -- src e2e ":!src/locales" ":!src/api/generated"
  ```

  These are `format.test.ts`, `detect.test.ts`, `i18n.test.ts`, `start-language.test.ts`, `translate-key.test.ts`, `zod-error-map.test.ts`, `errors.test.ts`, `form-errors.test.ts`, `auth-provider.test.tsx`, `language-switcher.test.tsx`, `error-state.test.tsx`, `built-in-labels.test.tsx`, `date-picker.test.tsx`, `e2e/i18n.spec.ts` and `e2e/a11y.spec.ts`. Point each at your second language (its expected strings change too), or drop its Spanish cases. The command prints two more files: `src/config/constants.ts` (the `SUPPORTED_LOCALES` entry, which docs/i18n.md → Removing a language covers) and `src/core/i18n/detect.ts` (a comment, nothing to change).

Check: the language switcher lists exactly your languages, and `pnpm lint && pnpm typecheck && pnpm test` pass.

## 5. Connect your API

1. **Development:** in `.env.local`, set `API_PROXY_TARGET=http://localhost:<port>` (your backend) and `VITE_ENABLE_MOCKS=false`. Leave `VITE_API_BASE_URL=/api`, so calls stay same-origin. The proxy forwards the path unchanged, so your backend receives `/api/auth/login`: serve it under `/api`, or add a `rewrite` to the `proxy` in `vite.config.ts` (and to the nginx template for Docker, docs/docker.md). Restart `pnpm dev` after changing `.env.local`.
2. **Error format:** the template expects `{ code, message, details? }`, with field errors in `details.fields`. If your backend's error body differs, adapt `errorBodySchema` and `getFieldErrors` in `src/core/api/errors.ts`; nothing else parses error bodies. Translate your backend's error codes under `errors:codes.<CODE>`.
3. **Auth:** the template calls `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` and `POST /auth/refresh` (docs/auth.md). Adjust the paths in `src/core/auth/cookie-strategy.ts`. For a different scheme, write another `AuthStrategy` and switch the one export in `src/core/auth/strategy.ts`.
4. **Typed client:** replace `openapi/openapi.yaml` with your spec, or point both `input.target` entries in `orval.config.ts` (`api` and `apiZod`) at its URL. Then run `pnpm codegen:api` and commit `src/api/generated`. If your spec lives at a URL, commit a copy of it (replace `openapi/openapi.yaml` with it) and keep both `input.target` entries pointing at the copy, refreshing the copy when the backend changes: CI regenerates the client on every pull request, and a URL would make that check depend on your backend being reachable. Give your spec's auth operations the same `override.operations` entries as the template's `orval.config.ts` (docs/api-codegen.md).
5. **Mocks:** tests and E2E run against `src/mocks`. As you build features, replace the demo handlers with ones shaped like your API.

Check: with mocks off, you can sign in against your backend.

## 6. Remove the example feature

"Items" is a reference. Generate your first feature before deleting it, so you keep a working example of your own:

```bash
pnpm gen feature <plural> <singular> y
```

Then remove the example:

1. **Delete these files and folders:**
   - `src/features/example/`
   - `src/app/routes/items/`
   - `src/locales/en/items.json` and `src/locales/es/items.json`
   - `src/mocks/handlers/items.ts`, `src/mocks/handlers/items.test.ts` and `src/mocks/fixtures/items.ts`
   - `e2e/items.spec.ts`
2. **Remove the registrations:**
   - `src/core/i18n/resources.ts`: the `items` imports and entries
   - `src/mocks/handlers.ts`: `itemHandlers`
   - `src/mocks/db.ts`: `items` and `createItemFixtures`
   - `src/config/paths.ts`: `items`
   - `src/config/features.ts`: `itemsExport`. Put a flag of your own in its place: `src/config/features.test.ts` and `src/hooks/use-feature.test.tsx` need one to test the mechanism.
   - `src/app/router.tsx`: the four items routes
   - `src/app/navigation.ts`: the Items entry and its `PackageIcon` import
   - `src/app/routes/dashboard.tsx`: the "Browse items" link
   - `openapi/openapi.yaml`: the `items` tag, the `/items` paths and the item schemas. Then run `pnpm codegen:api`.
3. **Permissions:** replace `items.*` in `src/config/permissions.ts` with your feature's permissions. Give the demo users in `src/mocks/fixtures/users.ts` the new ones. Guard the generated route with `<RequirePermission>` and add `permission` to its sidebar entry (the "After generating" list in docs/generators.md).
4. **Let the tools list the rest:**

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   git grep -n -e "'items\." -e "features/example" -e "item-0" -- src e2e ":!src/api/generated"
   git grep -n -i "items" -- e2e
   ```

   `pnpm typecheck` finds every reference to a deleted path, permission, translation key or module. `pnpm test` and the `git grep` commands find what the compiler can't see: text, URLs and the E2E specs. Unit tests that use `/items` as a sample URL need no change. Fix the others:
   - The tests that use `items.*` as sample permissions: `src/core/auth/*.test.ts(x)`, `src/stores/session-store.test.ts`, `src/components/layout/app-shell.test.tsx` and its story. Switch them to one of yours.
   - `src/config/paths.test.ts` builds links for the items routes: point it at your feature's routes (the `segment` helper in `src/config/paths.ts` is for parameters, so delete it if you have none).
   - `src/app/router.test.tsx` clicks through Items and checks the 403 page on its write pages; point it at your feature.
   - `src/api/generated-client.test.tsx` uses the generated items hooks for five of its tests; point them at one of your generated hooks, or delete them. Keep the `useLogin` test.
   - Update the `e2e/*.spec.ts` files that visit `/items` or look for the "Desk lamp" row: `auth.spec.ts`, `navigation.spec.ts` and `a11y.spec.ts`.
   - Remove `nav.items`, `dashboard.goToItems` and `errors:codes.ITEM_LOCKED` from every locale, and the `nav.items` label key that `app-shell.test.tsx` and `app-shell.stories.tsx` use for their sample navigation.
   - Run `pnpm format` once, because the lint step checks formatting.

Check: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e` all pass.

## 7. Error monitoring (optional)

Set `VITE_SENTRY_DSN` per environment to turn on the Sentry transport (docs/error-handling-and-logging.md). The Docker image adds the DSN's origin to its Content-Security-Policy by itself.

## 8. The repository, CI and deployment

1. Push to GitHub, and check that the **CI** workflow passes.
2. Set up branch protection (docs/contributing.md).
3. Fill in the deploy step in `.github/workflows/deploy.yml`, then set the repository variable `DEPLOY_ENABLED=true` (docs/deployment.md).
4. Optional:
   - Images are published on every release by `docker-publish.yml`, which works with GitHub Container Registry as is. The image is named after the repository.
   - To publish Storybook on GitHub Pages, set `STORYBOOK_PAGES=true` and choose "GitHub Actions" as the Pages source.

## 9. Documentation

- Update `README.md` (name, description, links), and `CLAUDE.md` wherever your conventions differ.
- Remove or rewrite the passages in `docs/` that describe the example feature, and replace the template's name in their examples:

  ```bash
  git grep -n -i -e "react bedrock" -e "react-bedrock" -- README.md docs
  ```

  Then run `pnpm format`: a longer or shorter name changes how Prettier lays out the tables.

- Replace the licence: if the template carries a `LICENSE` file and a License section in `README.md`, use your own or remove them.

## 10. Final check

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
docker compose up --build
```

The first build takes a few minutes. Open http://localhost:8080 (if that port is taken, `WEB_PORT=8081 docker compose up --build` uses another one), sign in, and click through your first feature. Stop it with Ctrl+C, then clean up with `docker compose down`.
