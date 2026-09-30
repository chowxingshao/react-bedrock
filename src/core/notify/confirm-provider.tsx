import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from './confirm-context';

/** Hosts the single confirmation dialog that `useConfirm()` opens. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' });
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  // The dialog has no Trigger, so Radix cannot return focus on its own (WCAG 2.4.3).
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    // A newer request cancels any pending one, and keeps the original opener: while a dialog is
    // open, the focused element is inside it and is about to be removed.
    if (resolverRef.current) resolverRef.current(false);
    else
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOptions(next);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  // A caller awaiting `confirm()` must not wait forever if the provider goes away.
  useEffect(
    () => () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    },
    [],
  );

  return (
    <ConfirmContext value={confirm}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) settle(false);
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const opener = returnFocusRef.current;
            returnFocusRef.current = null;
            if (opener?.isConnected) opener.focus(); // a confirmed delete may have removed it
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title}</AlertDialogTitle>
            {options.description ? (
              <AlertDialogDescription>{options.description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                settle(false);
              }}
            >
              {options.cancelLabel ?? t('actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={options.destructive ? 'destructive' : 'default'}
              onClick={() => {
                settle(true);
              }}
            >
              {options.confirmLabel ?? t('actions.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext>
  );
}
