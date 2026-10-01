import { useCallback, useState } from 'react';

/** Open/closed state for dialogs, sheets, popovers and menus. */
export function useDisclosure(initial = false) {
  const [isOpen, setOpen] = useState(initial);
  const open = useCallback(() => {
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
  }, []);
  const toggle = useCallback(() => {
    setOpen((value) => !value);
  }, []);
  return { isOpen, open, close, toggle, setOpen };
}
