/** A path builder that also carries its route pattern (for the router only). */
function route<const Pattern extends string, Args extends unknown[]>(
  pattern: Pattern,
  build: (...args: Args) => string,
) {
  return Object.assign(build, { pattern });
}

const segment = (value: string) => encodeURIComponent(value);

/**
 * Every route in one place (spec §7.1). Links use the builders, never raw strings:
 *   <Link to={paths.items.detail(id)}>
 * `.pattern` (with :params) is for src/app/router.tsx.
 */
export const paths = {
  home: route('/', () => '/'),
  login: route('/login', (returnTo?: string) =>
    returnTo ? `/login?${new URLSearchParams({ returnTo }).toString()}` : '/login',
  ),
  dashboard: route('/dashboard', () => '/dashboard'),
  forbidden: route('/403', () => '/403'),
  items: {
    list: route('/items', () => '/items'),
    create: route('/items/new', () => '/items/new'),
    detail: route('/items/:itemId', (itemId: string) => `/items/${segment(itemId)}`),
    edit: route('/items/:itemId/edit', (itemId: string) => `/items/${segment(itemId)}/edit`),
  },
  // plop:paths
};
