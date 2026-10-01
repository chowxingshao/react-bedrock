import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  NavigationType,
  Outlet,
  ScrollRestoration,
  type UIMatch,
  useLocation,
  useMatches,
  useNavigation,
  useNavigationType,
} from 'react-router';

import { RouteProgress } from '@/components/layout';
import { useDocumentTitle } from '@/hooks/use-document-title';

import type { RouteHandle } from '../route-handle';

/**
 * Root of the route tree: document title, scroll restoration, navigation progress and focus (spec §7.1).
 * After a link click or the back button, focus moves to the new page's `<main>`, so keyboard and screen
 * reader users start at its content. Redirects (`replace`) and the first load leave focus alone, which
 * keeps "Skip to main content" the first Tab stop.
 */
export function RootLayout() {
  const { i18n } = useTranslation();
  const navigation = useNavigation();
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const matches = useMatches() as UIMatch<unknown, RouteHandle | undefined>[];
  const title = matches.findLast((match) => match.handle?.title)?.handle?.title?.(i18n);
  useDocumentTitle(title);

  const lastPathname = useRef(pathname);
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    if (navigationType !== NavigationType.Replace) {
      document.getElementById('main-content')?.focus({ preventScroll: true });
    }
  }, [pathname, navigationType]);

  return (
    <>
      {navigation.state === 'loading' ? <RouteProgress /> : null}
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
