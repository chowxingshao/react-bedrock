import { SearchXIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';

import { EmptyState } from './empty-state';

interface NotFoundStateProps {
  title?: string;
  description?: string;
  /** 1 when this view is the whole page (see EmptyState), 2 under the page's own h1 (default). */
  headingLevel?: 1 | 2;
}

/** "Not found" view, used by the 404 page and by detail pages whose record doesn't exist. */
export function NotFoundState({ title, description, headingLevel }: NotFoundStateProps) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={SearchXIcon}
      headingLevel={headingLevel}
      title={title ?? t('states.notFound.title')}
      description={description ?? t('states.notFound.description')}
      action={
        <Button asChild variant="outline">
          <Link to={paths.dashboard()}>{t('actions.backToDashboard')}</Link>
        </Button>
      }
    />
  );
}
