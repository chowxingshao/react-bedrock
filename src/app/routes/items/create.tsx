import { RequirePermission } from '@/core/auth';
import { ItemCreatePage } from '@/features/example';

export function Component() {
  return (
    <RequirePermission permission="items.create">
      <ItemCreatePage />
    </RequirePermission>
  );
}
