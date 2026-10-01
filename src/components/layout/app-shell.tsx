import { type ReactNode, useEffect } from 'react';
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
import { cn } from '@/lib/cn';
import { useMobileNavOpen, useSetMobileNavOpen, useSidebarCollapsed } from '@/stores/ui-store';

import { AppFooter } from './app-footer';
import { Header } from './header';
import type { NavItem } from './nav-types';
import { Sidebar } from './sidebar';

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

  useEffect(() => {
    setMobileNavOpen(false); // close the mobile sheet after navigating
  }, [pathname, setMobileNavOpen]);

  return (
    <div className="flex min-h-svh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-toast focus:rounded-md focus:bg-background focus:p-2 focus:ring-3 focus:ring-ring"
      >
        {t('a11y.skipToContent')}
      </a>

      <aside className={cn('hidden shrink-0 border-e md:block', collapsed ? 'md:w-16' : 'md:w-64')}>
        <Sidebar items={navItems} collapsed={collapsed} collapsible />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{t('nav.label')}</SheetTitle>
            <SheetDescription>{t('nav.description')}</SheetDescription>
          </SheetHeader>
          <Sidebar items={navItems} collapsed={false} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <OfflineBanner />
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 outline-none md:p-6">
          {children}
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
