import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBeforeUnload, useBlocker } from 'react-router';

import { useConfirm } from '@/core/notify';

/**
 * Asks before leaving a page with unsaved changes (spec §7.7): in-app navigation, and tab close or reload.
 * After a successful save, set `when` to `false` BEFORE navigating: the guard blocks until `when`
 * turns false.
 */
export function useUnsavedChangesWarning(when: boolean): void {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const { proceed, reset } = blocker;
    let active = true;
    void confirm({
      title: t('unsaved.title'),
      description: t('unsaved.description'),
      confirmLabel: t('unsaved.leave'),
      cancelLabel: t('unsaved.stay'),
      destructive: true,
    }).then((leave) => {
      if (!active) return;
      if (leave) proceed();
      else reset();
    });
    return () => {
      active = false;
    };
  }, [blocker, confirm, t]);

  useBeforeUnload((event) => {
    if (when) event.preventDefault(); // the browser shows its own "Leave site?" prompt
  });
}
