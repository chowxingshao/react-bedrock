import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SyntheticEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AppError } from '@/core/api';
import { i18n } from '@/core/i18n';
import { HOSTILE_VALUES } from '@/test/hostile-values';

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

  it('does not submit an enclosing form when retrying', async () => {
    const onRetry = vi.fn();
    const onSubmit = vi.fn((event: SyntheticEvent) => {
      event.preventDefault();
    });
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <ErrorState onRetry={onRetry} />
      </form>,
    );

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
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

  it('explains API errors in plain language', () => {
    render(
      <ErrorState
        error={new AppError({ code: 'NOT_FOUND', message: 'GET /items/9 404', status: 404 })}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      "We couldn't find what you were looking for.",
    );
  });

  it('is translated', async () => {
    await i18n.changeLanguage('es');
    render(<ErrorState onRetry={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});

describe('ErrorState with a hostile thrown value', () => {
  it.each(HOSTILE_VALUES)(
    'shows the generic message, without details, for %s instead of crashing',
    (_name, make) => {
      render(<ErrorState error={make()} showDetails={false} />);

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Please try again.',
      );
      expect(screen.queryByText('Technical details')).not.toBeInTheDocument();
    },
  );

  it.each(HOSTILE_VALUES)(
    'shows the generic message and the details section for %s instead of crashing',
    (_name, make) => {
      render(<ErrorState error={make()} showDetails />);

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Please try again.',
      );
      expect(screen.getByText('Technical details')).toBeInTheDocument();
    },
  );
});
