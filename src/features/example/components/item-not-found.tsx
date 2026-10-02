import { useTranslation } from 'react-i18next';

import { NotFoundState } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { paths } from '@/config/paths';

/** Shown by the detail and edit pages when the item doesn't exist (404). */
export function ItemNotFound() {
  const { t } = useTranslation('items');
  return (
    <>
      <PageHeader
        title={t('detail.notFoundTitle')}
        breadcrumbs={[{ label: t('list.title'), to: paths.items.list() }]}
      />
      <NotFoundState
        title={t('detail.notFoundTitle')}
        description={t('detail.notFoundDescription')}
      />
    </>
  );
}
