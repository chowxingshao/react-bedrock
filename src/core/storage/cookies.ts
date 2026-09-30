import Cookies from 'js-cookie';

export interface CookieOptions {
  /** Days until expiry, or an absolute date. Omit it for a session cookie. */
  expires?: number | Date;
  path?: string;
  domain?: string;
  sameSite?: 'Strict' | 'Lax' | 'None';
  secure?: boolean;
}

/**
 * Secure defaults (spec §6.5): SameSite=Lax, whole-site path, and Secure whenever the page is served
 * over HTTPS (always true for production deployments). Tying Secure to the protocol keeps cookies
 * working when a production image is tried over plain http on a LAN address.
 */
function withDefaults(options: CookieOptions = {}): CookieOptions {
  // Protocol-based rather than env.isProd: browsers reject Secure cookies on plain http, so a
  // plain-http production or demo build could never set one.
  return { path: '/', sameSite: 'Lax', secure: window.location.protocol === 'https:', ...options };
}

/** Readable (non-httpOnly) cookies only. Auth cookies are httpOnly and never touched by the frontend. */
export const cookies = {
  get(name: string): string | undefined {
    return Cookies.get(name);
  },
  set(name: string, value: string, options?: CookieOptions): void {
    Cookies.set(name, value, withDefaults(options));
  },
  remove(name: string, options?: Pick<CookieOptions, 'path' | 'domain'>): void {
    Cookies.remove(name, withDefaults(options));
  },
};
