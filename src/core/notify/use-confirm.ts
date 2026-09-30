import { useContext } from 'react';

import { ConfirmContext, type ConfirmFn } from './confirm-context';

/** Promise-based "Are you sure?" dialog: `if (await confirm({ title })) …` (spec §7.5). */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used inside <ConfirmProvider> (see src/app/providers.tsx)');
  }
  return confirm;
}
