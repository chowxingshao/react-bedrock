import type { InternalAxiosRequestConfig } from 'axios';

/**
 * How the HTTP layer talks to the auth layer without importing it (core/auth imports core/api).
 * The auth layer registers an adapter for the active strategy when its provider mounts.
 */
export interface HttpAuthAdapter {
  /** Adds credentials to an outgoing request (cookie strategy: `withCredentials`; token strategy: a header). */
  prepareRequest: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
  /**
   * Renews the session; rejects when it cannot be renewed. Requests it makes through `http` must pass
   * `skipAuthRefresh: true`: otherwise their own 401 would wait for this very refresh and never settle.
   */
  refresh: () => Promise<void>;
  /** Called when a request is still unauthorised after refreshing, or refreshing failed. */
  onSessionExpired: () => void;
}

let adapter: HttpAuthAdapter | null = null;

/** Registers the auth adapter; returns a function that unregisters it. */
export function registerHttpAuth(next: HttpAuthAdapter): () => void {
  adapter = next;
  return () => {
    if (adapter === next) adapter = null;
  };
}

export function getHttpAuth(): HttpAuthAdapter | null {
  return adapter;
}
