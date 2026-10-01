import type { i18n as I18n } from 'i18next';

/**
 * Static data attached to a route (`handle` in src/app/router.tsx).
 * `title` receives the i18next instance, so it can use any namespace:
 *   handle: { title: (i18n) => i18n.t('items:list.title') } satisfies RouteHandle
 */
export interface RouteHandle {
  title?: (i18n: I18n) => string;
}
