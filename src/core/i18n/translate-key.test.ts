import { describe, expect, it } from 'vitest';

import { i18n } from './i18n';
import { translateKey } from './translate-key';

describe('translateKey', () => {
  it('translates keys that exist and returns undefined for keys that do not', async () => {
    expect(translateKey('errors:codes.NOT_FOUND')).toBe(
      "We couldn't find what you were looking for.",
    );
    expect(translateKey('errors:codes.NOT_A_CODE')).toBeUndefined();

    await i18n.changeLanguage('es');
    expect(translateKey('errors:codes.NOT_FOUND')).toBe('No encontramos lo que buscabas.');
  });
});
