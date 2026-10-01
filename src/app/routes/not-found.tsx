import { useTranslation } from 'react-i18next';

import { NotFoundState } from '@/components/feedback';
import { PageHeader } from '@/components/layout';

/** The 404 page: the router's catch-all, inside the app shell (spec §7.1). */
export function Component() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('pages.notFound')} />
      <NotFoundState />
    </>
  );
}
