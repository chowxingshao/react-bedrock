# Production image (spec §10.4): build once, configure at start-up (docs/docker.md).
#   docker build -t react-bedrock:local --build-arg APP_VERSION=1.2.3 --build-arg GIT_SHA="$(git rev-parse HEAD)" .
# The two Node stages run on the build machine's platform. Their output is static files, so images for other
# platforms (e.g. linux/arm64) need no emulation.

# ---- deps: install dependencies (cached until package.json or the lockfile change)
FROM --platform=$BUILDPLATFORM node:26-alpine AS deps
WORKDIR /app
ENV HUSKY=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# The exact pnpm version pinned in package.json#packageManager (installed with npm; Deviation 13).
RUN npm install -g "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1].split('+')[0]")"
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

# ---- build: compile the app. No environment-specific values are baked in; they arrive through config.js.
FROM deps AS build
ARG APP_VERSION
ARG GIT_SHA
COPY . .
RUN pnpm build && node scripts/csp-script-hashes.mjs dist/index.html > csp-script-hashes

# ---- runtime: static files served by unprivileged nginx
FROM nginxinc/nginx-unprivileged:stable-alpine-slim AS runtime
ARG APP_VERSION
ARG GIT_SHA
LABEL org.opencontainers.image.title="react-bedrock" \
      org.opencontainers.image.description="React single-page app served by unprivileged nginx, configured at start-up" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_SHA}"

COPY --from=build /app/dist /usr/share/nginx/html
# The entrypoint runs as UID 101 and rewrites config.js at every start. Every other file stays read-only.
COPY --from=build --chown=101:0 --chmod=664 /app/dist/config.js /usr/share/nginx/html/config.js
COPY --from=build /app/csp-script-hashes /etc/nginx/app/csp-script-hashes
COPY docker/nginx.conf.template /etc/nginx/app/nginx.conf.template
COPY --chmod=755 docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
