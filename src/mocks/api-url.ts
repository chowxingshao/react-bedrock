import { env } from '@/config/env';

/** The absolute URL the shared HTTP client calls for `path`, so handlers match whatever the base URL is. */
export function apiUrl(path: string): string {
  const base = env.VITE_API_BASE_URL.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return new URL(`${base}${suffix}`, window.location.origin).toString();
}
