import { afterEach, describe, expect, it } from 'vitest';

import { focusIfLost } from './focus';

function add<T extends HTMLElement>(
  tag: string,
  parent: HTMLElement = document.body,
  init?: Partial<T>,
): T {
  const element = document.createElement(tag) as T;
  Object.assign(element, init);
  parent.append(element);
  return element;
}

describe('focusIfLost', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('focuses the target when nothing has focus', () => {
    const target = add<HTMLButtonElement>('button');

    expect(focusIfLost(target)).toBe(true);
    expect(target).toHaveFocus();
  });

  it('leaves focus alone when something else has it', () => {
    const target = add<HTMLButtonElement>('button');
    const other = add<HTMLButtonElement>('button');
    other.focus();

    expect(focusIfLost(target)).toBe(false);
    expect(other).toHaveFocus();
  });

  it('takes focus from a dialog that is closing, but not from one that is open', () => {
    const target = add<HTMLButtonElement>('button');
    const dialog = add<HTMLDivElement>('div');
    dialog.setAttribute('role', 'alertdialog');
    const inside = add<HTMLButtonElement>('button', dialog);
    inside.focus();

    dialog.dataset.state = 'open';
    expect(focusIfLost(target)).toBe(false);
    expect(inside).toHaveFocus();

    dialog.dataset.state = 'closed';
    expect(focusIfLost(target)).toBe(true);
    expect(target).toHaveFocus();
  });

  it('does nothing without a target, or with one that has left the page', () => {
    const gone = add<HTMLButtonElement>('button');
    gone.remove();

    expect(focusIfLost(null)).toBe(false);
    expect(focusIfLost(undefined)).toBe(false);
    expect(focusIfLost(gone)).toBe(false);
    expect(document.body).toHaveFocus();
  });
});
