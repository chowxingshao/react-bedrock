import { RequirePermission } from '@/core/auth';
import { ItemDetailPage } from '@/features/example';

export function Component() {
  return (
    <RequirePermission permission="items.read">
      <ItemDetailPage />
    </RequirePermission>
  );
}
