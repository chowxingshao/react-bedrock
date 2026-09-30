import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles/globals.css';
import '@/core/i18n';
import { App } from '@/app/App';
import { ConfigErrorScreen } from '@/app/config-error-screen';
import { envIssues } from '@/config/env';
import { installGlobalErrorHandlers, reactRootErrorHandlers } from '@/core/errors';

installGlobalErrorHandlers();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container, reactRootErrorHandlers).render(
  <StrictMode>
    {envIssues.length > 0 ? <ConfigErrorScreen issues={envIssues} /> : <App />}
  </StrictMode>,
);
