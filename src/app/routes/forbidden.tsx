import { useTranslation } from 'react-i18next';

import { ForbiddenState } from '@/components/feedback';
import { PageHeader } from '@/components/layout';

/** The /403 page (spec §7.1). */
export function Component() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('pages.forbidden')} />
      <ForbiddenState />
    </>
  );
}
