import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { EmptyState } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Dashboard } from '@/components/ui/icons';
import { paths } from '@/config/paths';
import { Can, useAuth } from '@/core/auth';

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
        icon={Dashboard}
        title={t('dashboard.emptyTitle')}
        description={t('dashboard.emptyDescription')}
        action={
          <Can permission="items.read">
            <Button asChild>
              <Link to={paths.items.list()}>{t('dashboard.goToItems')}</Link>
            </Button>
          </Can>
        }
      />
    </>
  );
}
