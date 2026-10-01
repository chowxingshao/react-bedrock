import { LayoutDashboardIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { useAuth } from '@/core/auth';

/** Placeholder dashboard (spec §7.1). Replace it with your product's overview. */
export function Component() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <>
      <PageHeader
        title={t('pages.dashboard')}
        description={t('dashboard.welcome', { name: user?.name ?? '' })}
      />
      <EmptyState
        icon={LayoutDashboardIcon}
        title={t('dashboard.emptyTitle')}
        description={t('dashboard.emptyDescription')}
      />
    </>
  );
}
