import { useTranslation } from 'react-i18next';

import { APP_VERSION, GIT_SHA } from '@/config/constants';

/** Build version and git SHA (spec §10.4: "exposed in the UI footer/about area"). */
export function AppFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t px-4 py-3 text-xs text-muted-foreground md:px-6">
      {t('about.version', { version: APP_VERSION, sha: GIT_SHA.slice(0, 7) })}
    </footer>
  );
}
