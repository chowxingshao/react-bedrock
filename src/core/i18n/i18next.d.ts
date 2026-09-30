import type { defaultNS, resources } from './resources';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['en'];
    /** Unknown keys are type errors, even when a default value is passed. */
    strictKeyChecks: true;
  }
}
