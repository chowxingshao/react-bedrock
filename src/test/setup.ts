import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import { i18n } from '@/core/i18n';

afterEach(async () => {
  // Vitest globals are off, so Testing Library's auto-cleanup is not registered: do it here.
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  if (i18n.language !== 'en') await i18n.changeLanguage('en');
});
