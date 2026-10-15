import type { NavItem } from '@/components/layout';
import { Dashboard, Package } from '@/components/ui/icons';
import { paths } from '@/config/paths';
// plop:nav-imports

/** Sidebar entries, in order (spec §5.5). Items with `permission` are hidden from users without it. */
export const navigation: NavItem[] = [
  { labelKey: 'nav.dashboard', icon: Dashboard, to: paths.dashboard(), end: true },
  { labelKey: 'nav.items', icon: Package, to: paths.items.list(), permission: 'items.read' },
  // plop:nav
];
