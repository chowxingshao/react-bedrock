import { useEffect } from 'react';

import { env } from '@/config/env';

/** Sets the tab title to "<title> · <app name>" (spec §7.1). The root layout calls it with the route's title. */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} · ${env.VITE_APP_NAME}` : env.VITE_APP_NAME;
  }, [title]);
}
