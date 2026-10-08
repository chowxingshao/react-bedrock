import { ShieldXIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';

import { EmptyState } from './empty-state';

interface ForbiddenStateProps {
  /** 1 when this view is the whole page (see EmptyState), 2 under the page's own h1 (default). */
  headingLevel?: 1 | 2;
}

/** "No permission" view, used by <RequirePermission> and the /403 page (spec §7.1). */
export function ForbiddenState({ headingLevel }: ForbiddenStateProps) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={ShieldXIcon}
      headingLevel={headingLevel}
      title={t('states.forbidden.title')}
      description={t('states.forbidden.description')}
      action={
        <Button asChild variant="outline">
          <Link to={paths.dashboard()}>{t('actions.backToDashboard')}</Link>
        </Button>
      }
    />
  );
}
