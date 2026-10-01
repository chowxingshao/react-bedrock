import { useTranslation } from 'react-i18next';

/** Thin bar at the top of the page while a lazy route chunk downloads. */
export function RouteProgress() {
  const { t } = useTranslation();
  return (
    <div
      role="progressbar"
      aria-label={t('status.navigating')}
      className="fixed inset-x-0 top-0 z-toast h-1 overflow-hidden bg-primary/20"
    >
      <div className="h-full w-1/3 animate-pulse bg-primary" />
    </div>
  );
}
