import { i18n } from './i18n';

type UntypedT = (key: string, options?: Record<string, unknown>) => string;

/**
 * Translates a key built at runtime (e.g. `errors:codes.${code}` from a backend), or returns
 * undefined when no translation exists. Use typed `t('…')` for every key you write in code.
 */
export function translateKey(key: string, options?: Record<string, unknown>): string | undefined {
  if (!i18n.exists(key, options)) return undefined;
  const t = i18n.t.bind(i18n) as unknown as UntypedT;
  return t(key, options);
}
