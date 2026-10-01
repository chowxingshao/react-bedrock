import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';

import { PageLoader } from '@/components/feedback';
import { paths } from '@/config/paths';

import type { RouteHandle } from './route-handle';
import { RootLayout } from './routes/root-layout';
import { RouteError } from './routes/route-error';

const titled = (title: NonNullable<RouteHandle['title']>): RouteHandle => ({ title });

/**
 * The route tree (spec §7.1). Every page is lazy-loaded; the root shows <PageLoader /> while the first
 * chunk loads, and <RouteProgress /> during later navigations. The page generator (planned) will insert
 * routes at `plop:routes`.
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
            // Errors thrown by a page render here, inside the app shell.
            errorElement: <RouteError />,
            children: [
              {
                path: paths.dashboard.pattern,
                lazy: () => import('./routes/dashboard'),
                handle: titled((i18n) => i18n.t('common:pages.dashboard')),
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
