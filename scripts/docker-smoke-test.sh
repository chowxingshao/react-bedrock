#!/usr/bin/env bash
# Smoke test for the production image (spec §10.4). CI runs it after every image build. Locally:
#   docker build -t react-bedrock:local . && bash scripts/docker-smoke-test.sh react-bedrock:local
# It starts throwaway containers on ports 18080 and 18081 and checks the runtime contract end to end.
set -euo pipefail
# Git Bash on Windows rewrites arguments that look like /paths. Switch that off for docker only: with it off
# for every command, curl exits 23 after `-o /dev/null`.
docker() { MSYS_NO_PATHCONV=1 command docker "$@"; }
cd "$(dirname "$0")/.."

IMAGE="${1:-react-bedrock:local}"
NAME="bedrock-smoke-$$"
BASE="http://127.0.0.1:18080"
PROXY_BASE="http://127.0.0.1:18081"

cleanup() {
  docker rm -f "$NAME" "$NAME-proxy" "$NAME-https" "$NAME-invalid" "$NAME-injected" "$NAME-readonly" >/dev/null 2>&1 || true
}
trap cleanup EXIT

fail() {
  echo "FAIL: $*" >&2
  docker logs "$NAME" >&2 2>&1 || true
  exit 1
}

pass() {
  echo "ok:   $*"
}

# Succeeds when the text in $1 contains the literal string $2.
contains() {
  grep -qF -- "$2" <<<"$1"
}

wait_healthy() {
  for _ in $(seq 1 30); do
    if [ "$(curl -fsS "$1/healthz" 2>/dev/null || true)" = "ok" ]; then
      return 0
    fi
    sleep 1
  done
  fail "$1/healthz did not answer 'ok' within 30 seconds"
}

# For a container without a published port: succeeds once nginx answers on /healthz inside it.
wait_exec_healthy() {
  for _ in $(seq 1 30); do
    if docker exec "$1" wget -q -O /dev/null http://127.0.0.1:8080/healthz 2>/dev/null; then
      return 0
    fi
    sleep 1
  done
  fail "$1 did not answer on /healthz within 30 seconds"
}

size=$(docker image inspect "$IMAGE" --format '{{.Size}}')
[ "$size" -lt $((50 * 1024 * 1024)) ] || fail "the image is $((size / 1024 / 1024)) MB; the target is under 50 MB"
pass "image size is $((size / 1024 / 1024)) MB"

docker run -d --name "$NAME" -p 18080:8080 \
  -e VITE_APP_NAME='Smoke "Test" \ App' \
  -e VITE_API_BASE_URL='http://api.example.test:3000' \
  -e VITE_FEATURE_FLAGS='itemsExport' \
  -e VITE_SENTRY_DSN= \
  "$IMAGE" >/dev/null
wait_healthy "$BASE"
pass "/healthz answers ok"

[ "$(docker exec "$NAME" id -u)" != "0" ] || fail "the container must not run as root"
pass "runs as a non-root user"

contains "$(curl -fsS "$BASE/")" '<div id="root">' || fail "/ must serve index.html"
contains "$(curl -fsS "$BASE/items/42")" '<div id="root">' || fail "client-side routes must fall back to index.html"
contains "$(curl -fsS "$BASE/api/items")" '<div id="root">' || fail "without API_PROXY_TARGET, /api/ must not be proxied"
pass "SPA fallback"

curl -fsS "$BASE/config.js" | node -e '
  const vm = require("node:vm");
  let source = "";
  process.stdin.on("data", (chunk) => (source += chunk));
  process.stdin.on("end", () => {
    const sandbox = { window: {} };
    vm.runInNewContext(source, sandbox);
    const config = sandbox.window.__APP_CONFIG__ ?? {};
    const expected = {
      VITE_APP_NAME: "Smoke \"Test\" \\ App",
      VITE_API_BASE_URL: "http://api.example.test:3000",
      VITE_FEATURE_FLAGS: "itemsExport",
    };
    for (const [key, value] of Object.entries(expected)) {
      if (config[key] !== value) {
        console.error(`${key} is ${JSON.stringify(config[key])}, expected ${JSON.stringify(value)}`);
        process.exit(1);
      }
    }
    if ("VITE_SENTRY_DSN" in config) {
      console.error("empty variables must be left out of config.js");
      process.exit(1);
    }
  });
' || fail "config.js must carry the runtime configuration, JSON-escaped"
pass "config.js carries the runtime configuration"

index_headers=$(curl -fsSI "$BASE/" | tr -d '\r')
config_headers=$(curl -fsSI "$BASE/config.js" | tr -d '\r')
asset=$(curl -fsS "$BASE/" | grep -o '/assets/[^"]*\.js' | sed -n '1p')
[ -n "$asset" ] || fail "index.html must load a hashed script from /assets/"
asset_headers=$(curl -fsSI "$BASE$asset" | tr -d '\r')
contains "$index_headers" 'Cache-Control: no-store' || fail "index.html must be sent with Cache-Control: no-store"
contains "$config_headers" 'Cache-Control: no-store' || fail "config.js must be sent with Cache-Control: no-store"
contains "$asset_headers" 'Cache-Control: public, max-age=31536000, immutable' || fail "hashed assets must be cached as immutable"
missing_headers=$(curl -sI "$BASE/assets/missing.js" | tr -d '\r')
contains "$missing_headers" ' 404 ' || fail "a missing asset must be a 404"
if contains "$missing_headers" 'immutable'; then fail "a 404 must not be cached as immutable"; fi
contains "$missing_headers" 'X-Content-Type-Options: nosniff' || fail "the security headers must be sent on a 404 too"
pass "caching"

for header in 'X-Content-Type-Options: nosniff' 'Referrer-Policy: strict-origin-when-cross-origin' 'X-Frame-Options: SAMEORIGIN'; do
  contains "$index_headers" "$header" || fail "missing header: $header"
done
csp=$(grep -i '^Content-Security-Policy:' <<<"$index_headers" || true)
contains "$csp" "connect-src 'self' http://api.example.test:3000" || fail "the CSP must allow the runtime API origin: $csp"
hashes=$(curl -fsS "$BASE/" | node scripts/csp-script-hashes.mjs -)
[ -n "$hashes" ] || fail "index.html must contain the inline theme script"
for hash in $hashes; do
  contains "$csp" "$hash" || fail "the CSP must allow the inline script $hash"
done
pass "security headers and CSP"

docker run -d --name "$NAME-proxy" -p 18081:8080 -e API_PROXY_TARGET=http://127.0.0.1:9 "$IMAGE" >/dev/null
wait_healthy "$PROXY_BASE"
status=$(curl -s -o /dev/null -w '%{http_code}' "$PROXY_BASE/api/items")
[ "$status" = "502" ] || fail "with API_PROXY_TARGET set, /api/ must be proxied (expected 502 from the closed port, got $status)"
pass "API proxy"

# There is no TLS to verify on an http:// upstream, so the rendered config must not carry the verification lines.
proxy_conf=$(docker exec "$NAME-proxy" cat /etc/nginx/conf.d/default.conf)
contains "$proxy_conf" 'proxy_pass http://127.0.0.1:9;' || fail "the rendered config must proxy /api/ to the http:// target"
if contains "$proxy_conf" 'proxy_ssl_verify'; then fail "an http:// upstream must not get the proxy_ssl_verify lines"; fi
pass "an http:// API_PROXY_TARGET gets no TLS directives"

# An https:// upstream must be verified (otherwise nginx accepts any certificate), and nginx must accept the config
# (nginx -t also fails when the CA bundle file is missing). 127.0.0.1 needs no DNS; nothing listens there.
docker run -d --name "$NAME-https" -e API_PROXY_TARGET=https://127.0.0.1:9 "$IMAGE" >/dev/null
wait_exec_healthy "$NAME-https"
https_conf=$(docker exec "$NAME-https" cat /etc/nginx/conf.d/default.conf)
for directive in 'proxy_pass https://127.0.0.1:9;' 'proxy_ssl_verify on;' 'proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;' 'proxy_ssl_verify_depth 3;'; do
  contains "$https_conf" "$directive" || fail "the rendered config of an https:// upstream must contain: $directive"
done
nginx_test=$(docker exec "$NAME-https" nginx -t 2>&1) || fail "nginx -t must accept the config of an https:// upstream: $nginx_test"
pass "an https:// API_PROXY_TARGET verifies the upstream certificate"

# The value is pasted into an nginx directive: anything but scheme://host[:port] stops the container.
docker run -d --name "$NAME-invalid" -e API_PROXY_TARGET=backend:3000 "$IMAGE" >/dev/null
sleep 3
[ "$(docker inspect -f '{{.State.Running}}' "$NAME-invalid")" = "false" ] || fail "an invalid API_PROXY_TARGET must stop the container"
contains "$(docker logs "$NAME-invalid" 2>&1)" 'API_PROXY_TARGET must start with http://' || fail "the container must say why API_PROXY_TARGET is invalid"
pass "an invalid API_PROXY_TARGET is rejected"

# A line break must not smuggle a second line past the check: nginx would read the second line as a directive.
injected=$(printf 'http://127.0.0.1:9\n;proxy_set_header X-Injected 1')
docker run -d --name "$NAME-injected" -e "API_PROXY_TARGET=$injected" "$IMAGE" >/dev/null
sleep 3
[ "$(docker inspect -f '{{.State.Running}}' "$NAME-injected")" = "false" ] || fail "an API_PROXY_TARGET with a line break must stop the container"
injected_logs=$(docker logs "$NAME-injected" 2>&1)
contains "$injected_logs" "letters, digits, '.', '-', '_' and ':' only" || fail "the container must say why the API_PROXY_TARGET with a line break is invalid"
if contains "$injected_logs" 'proxying /api/'; then fail "an API_PROXY_TARGET with a line break must never reach nginx"; fi
pass "an API_PROXY_TARGET with a line break is rejected"

# A read-only /usr/share/nginx/html cannot take the generated config.js. Serving the one built into the image would
# silently ignore every VITE_* variable, so the container must stop instead.
docker run -d --name "$NAME-readonly" --read-only --tmpfs /tmp --tmpfs /etc/nginx/conf.d:uid=101,gid=0 "$IMAGE" >/dev/null
sleep 3
[ "$(docker inspect -f '{{.State.Running}}' "$NAME-readonly")" = "false" ] || fail "a container that cannot write config.js must stop"
contains "$(docker logs "$NAME-readonly" 2>&1)" 'cannot write' || fail "the container must say that config.js could not be written"
pass "a config.js that cannot be written stops the container"

echo "Smoke test passed: $IMAGE"
