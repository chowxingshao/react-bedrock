import type { Locale } from '@/config/constants';
import enCommon from '@/locales/en/common.json';
import enErrors from '@/locales/en/errors.json';
import enItems from '@/locales/en/items.json';
import enValidation from '@/locales/en/validation.json';
import esCommon from '@/locales/es/common.json';
import esErrors from '@/locales/es/errors.json';
import esItems from '@/locales/es/items.json';
import esValidation from '@/locales/es/validation.json';
// plop:resources-imports

/** English is the source of truth: its keys define the TypeScript key types. */
const en = {
  common: enCommon,
  errors: enErrors,
  validation: enValidation,
  items: enItems,
  // plop:resources-en
};

/**
 * Every other locale must provide every English key (checked by the compiler and resources.test.ts).
 * End each locale's block with its `// plop:resources-<code>` line: the generators add a feature's
 * namespace there (docs/i18n.md, "Adding a language").
 */
const es: typeof en = {
  common: esCommon,
  errors: esErrors,
  validation: esValidation,
  items: esItems,
  // plop:resources-es
};

export const resources = { en, es } satisfies Record<Locale, typeof en>;

export const defaultNS = 'common';
export type Namespace = keyof typeof en;
export const namespaces = Object.keys(en) as Namespace[];
