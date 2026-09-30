import { AppErrorBoundary } from '@/core/errors';

import { AppProviders } from './providers';

export function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <main id="main-content" />
      </AppProviders>
    </AppErrorBoundary>
  );
}
