export {};

declare global {
  interface Window {
    /**
     * Runtime configuration written by /config.js (docker/docker-entrypoint.sh in containers).
     * Only src/config/env.ts may read it.
     */
    __APP_CONFIG__?: Record<string, string | undefined>;
  }
}
