// The i18next singleton itself (not ./i18n), so this module and i18n.ts don't import each other.
import i18n from 'i18next';
import type { z } from 'zod';

/**
 * A bound as shown to the user. Dates are timestamps in the issue; `Intl`, not `@/lib/format`, keeps
 * date-fns out of the entry chunk. An invalid Date bound is NaN, which `Intl` refuses to format:
 * show it as is, so that the validation fails instead of throwing from Zod's issue handling.
 */
const boundText = (origin: string, bound: unknown): string => {
  const ms = Number(bound);
  return origin === 'date' && Number.isFinite(ms)
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(ms)
    : String(bound);
};

/**
 * Translates Zod's validation messages through i18next (spec §7.6). Evaluated at parse time, so it
 * follows the current language. Returning undefined falls back to Zod's own message.
 */
export function zodErrorMap(issue: z.core.$ZodRawIssue): string | undefined {
  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined || issue.input === null
        ? i18n.t('validation:required')
        : i18n.t('validation:invalidType');
    case 'too_small': {
      const count = Number(issue.minimum);
      if (issue.origin === 'string') {
        return count <= 1
          ? i18n.t('validation:required')
          : i18n.t('validation:tooShort', { count });
      }
      if (issue.origin === 'array' || issue.origin === 'set') {
        return i18n.t('validation:tooFewItems', { count });
      }
      return i18n.t(
        issue.inclusive === false ? 'validation:tooSmallExclusive' : 'validation:tooSmall',
        { minimum: boundText(issue.origin, issue.minimum) },
      );
    }
    case 'too_big': {
      const count = Number(issue.maximum);
      if (issue.origin === 'string') return i18n.t('validation:tooLong', { count });
      if (issue.origin === 'array' || issue.origin === 'set') {
        return i18n.t('validation:tooManyItems', { count });
      }
      return i18n.t(
        issue.inclusive === false ? 'validation:tooBigExclusive' : 'validation:tooBig',
        { maximum: boundText(issue.origin, issue.maximum) },
      );
    }
    case 'invalid_format':
      if (issue.format === 'email') return i18n.t('validation:email');
      if (issue.format === 'url') return i18n.t('validation:url');
      return i18n.t('validation:invalidFormat');
    case 'invalid_value':
      return i18n.t('validation:invalidOption');
    default:
      return undefined;
  }
}
