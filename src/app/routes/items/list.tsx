import { RequirePermission } from '@/core/auth';
import { ItemsListPage } from '@/features/example';

export function Component() {
  return (
    <RequirePermission permission="items.read">
      <ItemsListPage />
    </RequirePermission>
  );
}
