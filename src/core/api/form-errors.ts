import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';

import { translateKey } from '@/core/i18n';

import { CODE_PATTERN, getFieldErrors } from './errors';

/**
 * Maps server-side validation errors onto form fields (spec §7.7) and focuses the first one.
 * A field message that is a known key under `validation:server.*` (an UPPER_SNAKE_CASE code such as
 * "ALREADY_EXISTS") is translated; anything else is shown as sent. Returns false when the error carried no field errors,
 * so the caller can fall back to a toast.
 */
export function applyServerErrors<TValues extends FieldValues>(
  form: Pick<UseFormReturn<TValues>, 'setError'>,
  error: unknown,
): boolean {
  const entries = Object.entries(getFieldErrors(error));
  entries.forEach(([name, message], index) => {
    const translated = CODE_PATTERN.test(message)
      ? translateKey(`validation:server.${message}`)
      : undefined;
    form.setError(
      name as Path<TValues>,
      { type: 'server', message: translated ?? message },
      { shouldFocus: index === 0 },
    );
  });
  return entries.length > 0;
}
