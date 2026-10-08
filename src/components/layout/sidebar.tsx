import { LayersIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { Button } from '@/components/ui/button';
import { env } from '@/config/env';
import { useAuth } from '@/core/auth';
import { cn } from '@/lib/cn';
import { useToggleSidebar } from '@/stores/ui-store';

import type { NavItem } from './nav-types';

interface SidebarProps {
  items: readonly NavItem[];
  collapsed: boolean;
  /** Show the collapse toggle (desktop only). */
  collapsible?: boolean;
  /** Called when a link is clicked, including the link to the current route (the mobile sheet closes on it). */
  onNavigate?: () => void;
}

/** Navigation driven by the NavItem config, filtered by permission (spec §5.5). */
export function Sidebar({ items, collapsed, collapsible = false, onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const toggle = useToggleSidebar();
  const visible = items.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
        <LayersIcon aria-hidden="true" className="size-5 shrink-0" />
        {collapsed ? null : <span className="truncate">{env.VITE_APP_NAME}</span>}
      </div>
      <nav aria-label={t('nav.label')} className="flex-1 p-2">
        <ul className="grid gap-1">
          {visible.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={(event) => {
                  // A modified click opens the link in another tab or window: this page keeps its sheet.
                  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                  onNavigate?.();
                }}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring',
                    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                    collapsed && 'justify-center px-2',
                  )
                }
              >
                <item.icon aria-hidden="true" className="size-4 shrink-0" />
                {collapsed ? <span className="sr-only">{t(item.labelKey)}</span> : t(item.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {collapsible ? (
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            onClick={toggle}
          >
            {collapsed ? (
              <PanelLeftOpenIcon aria-hidden="true" />
            ) : (
              <PanelLeftCloseIcon aria-hidden="true" />
            )}
            {collapsed ? null : t('nav.collapse')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
