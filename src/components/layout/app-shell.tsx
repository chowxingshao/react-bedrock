import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { OfflineBanner } from '@/components/feedback';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/cn';
import { useMobileNavOpen, useSetMobileNavOpen, useSidebarCollapsed } from '@/stores/ui-store';

import { AppFooter } from './app-footer';
import { Header } from './header';
import type { NavItem } from './nav-types';
import { Sidebar } from './sidebar';

/** Tailwind's `md` breakpoint (48rem): from here on the sidebar is a fixed column instead of a sheet. */
const DESKTOP_QUERY = '(min-width: 48rem)';

interface AppShellProps {
  navItems: readonly NavItem[];
  children: ReactNode;
}

/** Responsive app frame (spec §5.5): the sidebar collapses on desktop and becomes a sheet on mobile. */
export function AppShell({ navItems, children }: AppShellProps) {
  const { t } = useTranslation();
  const collapsed = useSidebarCollapsed();
  const mobileNavOpen = useMobileNavOpen();
  const setMobileNavOpen = useSetMobileNavOpen();
  const { pathname } = useLocation();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // True while the sheet is closing because of a navigation or a resize: then the new page (or the
  // wider layout) owns focus, and the sheet must not pull it back to the "Open navigation" button.
  const skipFocusRestore = useRef(false);

  useEffect(() => {
    if (mobileNavOpen) skipFocusRestore.current = false;
  }, [mobileNavOpen]);

  const closeWithoutFocus = useCallback(() => {
    skipFocusRestore.current = true;
    setMobileNavOpen(false);
  }, [setMobileNavOpen]);

  // A link click closes the sheet too (see Sidebar `onNavigate`); this covers navigations that did not
  // come from a click in the sheet (browser back, a redirect).
  useEffect(() => {
    closeWithoutFocus();
  }, [pathname, closeWithoutFocus]);

  // The fixed sidebar shows from `md` on; a sheet left open would keep a modal overlay over it.
  useEffect(() => {
    if (isDesktop) closeWithoutFocus();
  }, [isDesktop, closeWithoutFocus]);

  return (
    <div className="flex min-h-svh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-toast focus:rounded-md focus:bg-background focus:p-2 focus:ring-3 focus:ring-ring"
      >
        {t('a11y.skipToContent')}
      </a>

      <aside
        className={cn(
          'hidden shrink-0 border-e md:sticky md:top-0 md:block md:h-svh md:overflow-y-auto',
          collapsed ? 'md:w-16' : 'md:w-64',
        )}
      >
        <Sidebar items={navItems} collapsed={collapsed} collapsible />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0"
          onCloseAutoFocus={(event) => {
            // Radix returns focus to its own trigger, and there is none: the header button only sets
            // store state. Take over, and leave focus alone after a navigation.
            event.preventDefault();
            if (!skipFocusRestore.current) menuButtonRef.current?.focus();
          }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t('nav.label')}</SheetTitle>
            <SheetDescription>{t('nav.description')}</SheetDescription>
          </SheetHeader>
          <Sidebar items={navItems} collapsed={false} onNavigate={closeWithoutFocus} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header menuButtonRef={menuButtonRef} />
        <OfflineBanner />
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 outline-none md:p-6">
          {children}
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
