import type { Locale } from '@/config/constants';
import enCommon from '@/locales/en/common.json';
import enErrors from '@/locales/en/errors.json';
import esCommon from '@/locales/es/common.json';
import esErrors from '@/locales/es/errors.json';

/** English is the source of truth: its keys define the TypeScript key types. */
const en = { common: enCommon, errors: enErrors };

/** Every other locale must provide every English key (checked by the compiler and resources.test.ts). */
const es: typeof en = { common: esCommon, errors: esErrors };

export const resources = { en, es } satisfies Record<Locale, typeof en>;

export const defaultNS = 'common';
export type Namespace = keyof typeof en;
export const namespaces = Object.keys(en) as Namespace[];
