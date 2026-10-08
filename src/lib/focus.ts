/** A dialog that Radix has closed keeps focus until its exit animation ends and it leaves the page. */
const CLOSING_DIALOG =
  '[role="alertdialog"][data-state="closed"], [role="dialog"][data-state="closed"]';

/**
 * Moves focus to `target`, but only when focus has been lost: nothing has it (the element that had it was
 * removed or disabled), or it is still in a dialog that is closing. Returns whether focus moved.
 *
 * Use it after something asynchronous removed the focused element (WCAG 2.4.3 Focus Order). If the user, or
 * the code that is closing a dialog, has put focus somewhere else in the meantime, that choice stands.
 */
export function focusIfLost(target: HTMLElement | null | undefined): boolean {
  if (!target?.isConnected) return false;
  const active = document.activeElement;
  const lost =
    !(active instanceof HTMLElement) ||
    active === document.body ||
    active.closest(CLOSING_DIALOG) !== null;
  if (!lost) return false;
  target.focus();
  return document.activeElement === target;
}
