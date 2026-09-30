import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { localStore, STORAGE_KEYS } from '@/core/storage';
import { useThemeStore } from '@/stores/theme-store';

import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  afterEach(() => {
    act(() => {
      useThemeStore.setState({ mode: 'system' });
    });
  });

  it('switches the theme from its menu', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'Change theme' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Dark' }));

    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('marks the current mode as checked', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'Change theme' }));

    expect(await screen.findByRole('menuitemradio', { name: 'System' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('still renders when storage holds a mode it does not know', async () => {
    localStore.set(STORAGE_KEYS.theme, { state: { mode: 'sepia' }, version: 0 });
    await act(async () => {
      await useThemeStore.persist.rehydrate();
    });

    render(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Change theme' })).toBeInTheDocument();
  });
});
