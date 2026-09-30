import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { i18n } from '@/core/i18n';

import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('shows a friendly, translated message by default', () => {
    render(<ErrorState />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('calls onRetry from its "Try again" button', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorState onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows technical details when asked (the default in development)', () => {
    render(<ErrorState error={new Error('Kaboom')} showDetails />);
    expect(screen.getByText('Technical details')).toBeInTheDocument();
    expect(screen.getByText(/Kaboom/)).toBeInTheDocument();
  });

  it('hides technical details in production', () => {
    render(<ErrorState error={new Error('Kaboom')} showDetails={false} />);
    expect(screen.queryByText(/Kaboom/)).not.toBeInTheDocument();
  });

  it('is translated', async () => {
    await i18n.changeLanguage('es');
    render(<ErrorState onRetry={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
