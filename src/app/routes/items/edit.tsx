import { RequirePermission } from '@/core/auth';
import { ItemEditPage } from '@/features/example';

export function Component() {
  return (
    <RequirePermission permission="items.update">
      <ItemEditPage />
    </RequirePermission>
  );
}
