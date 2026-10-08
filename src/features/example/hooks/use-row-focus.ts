import { type RefObject, useMemo, useState } from 'react';

import { focusIfLost } from '@/lib/focus';

/**
 * A row and the rows around it, as they were when its cell was last rendered: after a delete the row
 * itself is gone, so they cannot be read from the table any more.
 */
export interface RowNeighbours {
  id: string;
  nextId?: string | undefined;
  previousId?: string | undefined;
}

/**
 * Keeps focus sensible when a delete takes a row away (WCAG 2.4.3). The row's delete button had focus and
 * is removed with the row, so focus would fall to the top of the page. The confirmation dialog cannot give
 * it back either: its opener no longer exists, or is a new button after a rollback.
 *
 * `trackLink` and `trackDeleteButton` are ref callbacks for a row's name link and delete button.
 * `focusAfterDelete` runs once the delete has settled and picks the target from what is on the page then:
 * the row's own delete button if the server refused (the row is back), otherwise the next row's link, the
 * previous row's link, or `fallback`. It does nothing if focus has been put somewhere else meanwhile.
 */
export function useRowFocus(fallback: RefObject<HTMLElement | null>) {
  const [links] = useState(() => new Map<string, HTMLElement>());
  const [deleteButtons] = useState(() => new Map<string, HTMLElement>());

  return useMemo(() => {
    const track =
      (registry: Map<string, HTMLElement>) => (id: string) => (element: HTMLElement | null) => {
        if (element) registry.set(id, element);
        else registry.delete(id);
      };
    const link = (id: string | undefined) => (id === undefined ? undefined : links.get(id));

    return {
      trackLink: track(links),
      trackDeleteButton: track(deleteButtons),
      focusAfterDelete: ({ id, nextId, previousId }: RowNeighbours) => {
        focusIfLost(deleteButtons.get(id) ?? link(nextId) ?? link(previousId) ?? fallback.current);
      },
    };
  }, [links, deleteButtons, fallback]);
}
