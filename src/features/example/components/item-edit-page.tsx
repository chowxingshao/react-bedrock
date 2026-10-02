import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

import { FormSkeleton, QueryState } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { paths } from '@/config/paths';
import { notify } from '@/core/notify';

import { ItemForm } from './item-form';
import { ItemNotFound } from './item-not-found';
import { useItem } from '../hooks/use-item';
import { useUpdateItem } from '../hooks/use-item-mutations';

export function ItemEditPage() {
  const { t } = useTranslation('items');
  const { itemId = '' } = useParams();
  const navigate = useNavigate();
  const query = useItem(itemId);
  const updateItem = useUpdateItem(itemId);

  if (query.error?.status === 404) return <ItemNotFound />;

  return (
    <QueryState query={query} loading={<FormSkeleton fields={5} />}>
      {(item) => (
        <>
          <PageHeader
            title={t('edit.heading', { name: item.name })}
            breadcrumbs={[
              { label: t('list.title'), to: paths.items.list() },
              { label: item.name, to: paths.items.detail(item.id) },
              { label: t('edit.title') },
            ]}
          />
          <ItemForm
            key={item.id}
            defaultValues={{
              name: item.name,
              description: item.description,
              status: item.status,
              price: item.price,
              quantity: item.quantity,
            }}
            submitLabel={t('edit.submit')}
            onSubmit={async (values) => {
              const saved = await updateItem.mutateAsync(values);
              notify.success(t('toast.updated', { name: saved.name }));
              await navigate(paths.items.detail(saved.id));
            }}
          />
        </>
      )}
    </QueryState>
  );
}
