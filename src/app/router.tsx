import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';

import { PageLoader } from '@/components/feedback';
import { paths } from '@/config/paths';

import type { RouteHandle } from './route-handle';
import { PageBoundary } from './routes/page-boundary';
import { RootLayout } from './routes/root-layout';
import { RouteError } from './routes/route-error';

const titled = (title: NonNullable<RouteHandle['title']>): RouteHandle => ({ title });

/**
 * The route tree (spec §7.1). Every page is lazy-loaded; the root shows <PageLoader /> while the first
 * chunk loads, and <RouteProgress /> during later navigations. The page and feature generators
 * (docs/generators.md) insert routes at `plop:routes`.
 */
export const routes: RouteObject[] = [
  {
    id: 'root',
    element: <RootLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <PageLoader variant="page" />,
    children: [
      { index: true, element: <Navigate to={paths.dashboard()} replace /> },
      {
        lazy: () => import('./routes/guest-layout'),
        children: [
          {
            path: paths.login.pattern,
            lazy: () => import('./routes/login'),
            handle: titled((i18n) => i18n.t('common:pages.login')),
          },
        ],
      },
      {
        lazy: () => import('./routes/app-layout'),
        children: [
          {
            // A page's render and suspense errors are caught by PageBoundary (Try again, inside the
            // shell). `errorElement` handles what only the router sees: a page chunk that fails to
            // load, a thrown Response, a loader error.
            element: <PageBoundary />,
            errorElement: <RouteError />,
            children: [
              {
                path: paths.dashboard.pattern,
                lazy: () => import('./routes/dashboard'),
                handle: titled((i18n) => i18n.t('common:pages.dashboard')),
              },
              {
                path: paths.items.list.pattern,
                lazy: () => import('./routes/items/list'),
                handle: titled((i18n) => i18n.t('items:list.title')),
              },
              {
                path: paths.items.create.pattern,
                lazy: () => import('./routes/items/create'),
                handle: titled((i18n) => i18n.t('items:create.title')),
              },
              {
                path: paths.items.detail.pattern,
                lazy: () => import('./routes/items/detail'),
                handle: titled((i18n) => i18n.t('items:detail.title')),
              },
              {
                path: paths.items.edit.pattern,
                lazy: () => import('./routes/items/edit'),
                handle: titled((i18n) => i18n.t('items:edit.title')),
              },
              // plop:routes
              {
                path: paths.forbidden.pattern,
                lazy: () => import('./routes/forbidden'),
                handle: titled((i18n) => i18n.t('common:pages.forbidden')),
              },
              {
                path: '*',
                lazy: () => import('./routes/not-found'),
                handle: titled((i18n) => i18n.t('common:pages.notFound')),
              },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
