import type {} from 'axios';

declare module 'axios' {
  // Both generics must match axios' own declaration (axios >= 1.19); they are unused here, which is
  // why the directive also lists no-unused-vars.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface AxiosRequestConfig<D = any, P = any> {
    /** Skip the 401 → refresh → retry flow (login, logout and the refresh call itself). */
    skipAuthRefresh?: boolean;
    /** Don't show the global 403 / offline / timeout toasts for this request. Logging is unaffected. */
    silent?: boolean;
    /** Internal: marks the single retry after a successful refresh. */
    _retried?: boolean;
  }
}
