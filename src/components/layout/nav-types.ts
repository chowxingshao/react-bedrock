import type { ParseKeys } from 'i18next';
import type { LucideIcon } from 'lucide-react';

import type { Permission } from '@/config/permissions';

/** One entry of the sidebar, configured in src/app/navigation.ts (spec §5.5). */
export interface NavItem {
  /** Translation key in the `common` namespace, e.g. 'nav.dashboard'. */
  labelKey: ParseKeys;
  icon: LucideIcon;
  to: string;
  /** Hidden unless the user has this permission. */
  permission?: Permission;
  /** Active only on an exact path match. */
  end?: boolean;
}
