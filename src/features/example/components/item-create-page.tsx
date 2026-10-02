import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { PageHeader } from '@/components/layout';
import { paths } from '@/config/paths';
import { notify } from '@/core/notify';

import { ItemForm } from './item-form';
import { useCreateItem } from '../hooks/use-item-mutations';

export function ItemCreatePage() {
  const { t } = useTranslation('items');
  const navigate = useNavigate();
  const createItem = useCreateItem();

  return (
    <>
      <PageHeader
        title={t('create.title')}
        breadcrumbs={[
          { label: t('list.title'), to: paths.items.list() },
          { label: t('create.title') },
        ]}
      />
      <ItemForm
        submitLabel={t('create.submit')}
        onSubmit={async (values) => {
          const item = await createItem.mutateAsync(values);
          notify.success(t('toast.created', { name: item.name }));
          await navigate(paths.items.detail(item.id));
        }}
      />
    </>
  );
}
