import { PencilIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';

import { DetailSkeleton, QueryState } from '@/components/feedback';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { Can } from '@/core/auth';

import { DeleteItemButton } from './delete-item-button';
import { ItemDetails } from './item-details';
import { ItemNotFound } from './item-not-found';
import { useItem } from '../hooks/use-item';

export function ItemDetailPage() {
  const { t } = useTranslation('items');
  const { itemId = '' } = useParams();
  const navigate = useNavigate();
  const query = useItem(itemId);

  if (query.error?.status === 404) return <ItemNotFound />;

  return (
    <QueryState query={query} loading={<DetailSkeleton />}>
      {(item) => (
        <>
          <PageHeader
            title={item.name}
            breadcrumbs={[{ label: t('list.title'), to: paths.items.list() }, { label: item.name }]}
            actions={
              <>
                <Can permission="items.update">
                  <Button asChild variant="outline">
                    <Link to={paths.items.edit(item.id)}>
                      <PencilIcon aria-hidden="true" />
                      {t('actions.edit')}
                    </Link>
                  </Button>
                </Can>
                <Can permission="items.delete">
                  <DeleteItemButton
                    item={item}
                    variant="button"
                    onDeleted={() => {
                      void navigate(paths.items.list());
                    }}
                  />
                </Can>
              </>
            }
          />
          <ItemDetails item={item} />
        </>
      )}
    </QueryState>
  );
}
