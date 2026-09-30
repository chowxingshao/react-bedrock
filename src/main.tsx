import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import { ConfigErrorScreen } from '@/app/config-error-screen';
import { envIssues } from '@/config/env';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    {envIssues.length > 0 ? <ConfigErrorScreen issues={envIssues} /> : <App />}
  </StrictMode>,
);
