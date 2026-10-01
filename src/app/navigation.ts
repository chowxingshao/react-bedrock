import { LayoutDashboardIcon } from 'lucide-react';

import type { NavItem } from '@/components/layout';
import { paths } from '@/config/paths';

/** Sidebar entries, in order (spec §5.5). Items with `permission` are hidden from users without it. */
export const navigation: NavItem[] = [
  { labelKey: 'nav.dashboard', icon: LayoutDashboardIcon, to: paths.dashboard(), end: true },
  // plop:nav
];
