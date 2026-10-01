import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { type Locale, SUPPORTED_LOCALES } from '@/config/constants';
import { i18n } from '@/core/i18n';
import { localStore, STORAGE_KEYS } from '@/core/storage';
import { render, screen } from '@/test/render';

import { LanguageSwitcher } from './language-switcher';

// Endonyms: a language is named in itself, in every locale. Typed by Locale, so a new bundled
// language cannot be added without extending this test.
const NAMES: Record<Locale, string> = { en: 'English', es: 'Español' };

describe('LanguageSwitcher', () => {
  it('lists every bundled locale by its own name and checks the current one', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole('button', { name: 'Change language' }));

    const items = await screen.findAllByRole('menuitemradio');
    expect(items.map((item) => item.textContent)).toEqual(SUPPORTED_LOCALES.map((l) => NAMES[l]));
    for (const locale of SUPPORTED_LOCALES) {
      const item = screen.getByRole('menuitemradio', { name: NAMES[locale] });
      expect(item).toHaveAttribute('lang', locale);
      expect(item).toHaveAttribute('aria-checked', String(locale === 'en'));
    }
  });

  it('switches and remembers the language', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole('button', { name: 'Change language' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Español' }));

    expect(i18n.language).toBe('es');
    expect(localStore.get(STORAGE_KEYS.locale)).toBe('es');
    expect(screen.getByRole('button', { name: 'Cambiar idioma' })).toBeInTheDocument();
  });

  it('checks the new language when the menu is opened again', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole('button', { name: 'Change language' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Español' }));
    await user.click(screen.getByRole('button', { name: 'Cambiar idioma' }));

    expect(await screen.findByRole('menuitemradio', { name: 'Español' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });
});
